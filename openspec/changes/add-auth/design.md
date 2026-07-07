# Design: add-auth

## Context

O app é um skeleton Next 16 (App Router, React 19, Tailwind 4) com telas mockadas e design system próprio já implementado (`src/components/ui`, tokens em `globals.css`). Não existe backend: sem DB, sem API routes, sem sessão. O produto está definido em `docs/historias-auth-time-convites.md` (H1–H10) e no mockup hi-fi `tmp/Átrios Auth (standalone).html` (seções: `07 Login v2`, `08 Recuperar senha`, `09 Aceitar convite`, `10 Sem convite`).

Restrições relevantes:

- **Next 16 ≠ Next conhecido** (`AGENTS.md`): `middleware.ts` foi **deprecado e renomeado para `proxy.ts`** (export `proxy`); consultar `node_modules/next/dist/docs/` na dúvida.
- Organização única (Átrios), roles `admin` | `member`, signup fechado por convite.
- pnpm bloqueia build scripts por padrão (`pnpm-workspace.yaml` já tem `ignoredBuiltDependencies`).

## Goals / Non-Goals

**Goals:**

- Implementar H1–H10 de ponta a ponta com better-auth + Drizzle.
- Telas fiéis ao mockup, reusando o design system existente.
- Rodar 100% local sem serviços externos (email cai em console no dev).

**Non-Goals:**

- Multi-organização, teams, 2FA, verificação de email no signup.
- Provedor de email de produção (fica plugável, decidido no deploy).
- Deploy/infra e provisionamento do Postgres (o código assume `DATABASE_URL` disponível).
- Auditoria/logs de acesso.

## Decisions

### D1 — better-auth como núcleo de auth

Cobre num pacote só: social (GitHub/Google), email+senha, reset de senha, sessão em cookie, e hooks de criação de usuário (onde mora o gate de convite). Alternativas: NextAuth/Auth.js (fluxo de credentials + campos custom mais burocráticos), Lucia (foi descontinuada como lib), roll-your-own (caro e arriscado).

- Server: `src/lib/auth.ts` com `betterAuth({...})`; handler HTTP em `src/app/api/auth/[...all]/route.ts` via `toNextJsHandler`.
- Client: `src/lib/auth-client.ts` (`createAuthClient`).
- Plugin `nextCookies()` incluído para server actions poderem setar cookies.
- `user.additionalFields.role` (`"admin" | "member"`, default `"member"`).
- ⚠️ A API do better-auth evolui rápido: **primeira task do apply é ler os docs da versão instalada** (`node_modules/better-auth`) e ajustar nomes de opções, não confiar em memória.

### D2 — Drizzle + Postgres via `pg`

Postgres desde o início (decisão do produto). Driver `pg` (node-postgres) com `drizzle-orm/node-postgres`: JS puro (sem build nativo, sem mexer no `allowBuilds` do pnpm) e é o par usado nos docs do better-auth. Conexão via `DATABASE_URL` — local, Docker ou hosted, indiferente para o código.

- `src/db/schema.ts`: tabelas core geradas pela CLI do better-auth (`user`, `session`, `account`, `verification`) + tabela própria `invite`.
- `src/db/index.ts`: `drizzle` sobre `Pool({ connectionString: DATABASE_URL })`.
- `drizzle.config.ts` (dialect `postgresql`) + `drizzle-kit push` para dev (sem cerimônia de migrations por enquanto).

### D3 — Tabela `invite` própria + gate via `databaseHooks` (não plugins organization/admin)

O plugin `organization` do better-auth traz multi-org/members/teams — overkill para org única. O plugin `admin` traz ban/impersonation — idem. Uma tabela e dois hooks resolvem H4/H5/H8/H10:

```
invite: id, email (unique entre pendentes), role, invitedById → user.id,
        token (unique), expiresAt, acceptedAt?, createdAt
```

Fluxo no `databaseHooks.user.create.before`:

```
count(user) == 0            → cria com role "admin"          (H10)
convite pendente p/ email   → cria com role do convite       (H4/H5)
caso contrário              → APIError → UI manda p/ /sem-convite (H8)
```

`user.create.after` marca o convite como aceito (`acceptedAt`). Isso cobre igualmente signup por senha (página do convite) e OAuth direto (aceite implícito H5) — o gate fica no único ponto por onde todo usuário novo passa.

Para OAuth bloqueado: better-auth redireciona para `errorCallbackURL` com código de erro; o login mapeia esse código → redirect `/sem-convite`; a página de convite mapeia → mensagem "o convite vale apenas para este email" (H4). Detalhe exato do código de erro se verifica no apply.

### D4 — Proteção de rotas: `proxy.ts` otimista + verificação real no server

`src/proxy.ts` (convenção nova do Next 16) faz só o redirect UX: cookie de sessão ausente → `/login`; logado acessando `/login` → `/produtos`. Checagem **otimista** (presença do cookie via `getSessionCookie`), sem hit no DB — proxy não é lugar de I/O. A verificação real acontece onde há dado: `auth.api.getSession({ headers })` no layout de `/produtos` e `/time`, e em toda server action (com checagem de role para ações de admin). Matcher negativo excluindo `/login`, `/esqueci-senha`, `/redefinir-senha`, `/convite/*`, `/sem-convite`, `/api/auth/*`, `_next/*` e assets.

### D5 — Server actions para time e convites

Mutations de H7 como server actions em `src/app/time/actions.ts`: `inviteMember`, `resendInvite`, `cancelInvite`, `changeRole`, `removeMember`. Todas: sessão válida + `role == "admin"`. Invariantes no server (não só na UI):

- `removeMember(self)` → erro (admin não remove a si mesmo).
- `changeRole` que deixaria zero admins → erro (último admin é intocável).
- Remoção de membro apaga sessões (FK cascade no schema).
- `resendInvite` gera token + expiração novos; `inviteMember` com email já membro/pendente → erro claro.

Alternativa REST/route handlers rejeitada: server actions são o caminho recomendado do Next 16 para forms (guia local de auth) e eliminam boilerplate de fetch.

### D6 — Emails: util mínimo, console no dev

`src/lib/email.ts` com `sendEmail({ to, subject, text })`: em dev, `console.log` do link (reset e convite). Interface de uma função para plugar Resend/SMTP via env quando existir deploy. Não revelar existência de conta no fluxo de reset (H3: mensagem neutra "se existir conta, enviamos um link" — o better-auth já se comporta assim).

### D7 — UI: mockup 07–10 + design system existente

- `/login` (07): card com logo, botões GitHub/Google, divisor, form email+senha, erro inline, link "Esqueci minha senha", footer "Acesso restrito ao time da Átrios". Client component com `authClient`.
- `/esqueci-senha` + `/redefinir-senha` (08): duas etapas, estados de sucesso/expirado.
- `/convite/[token]` (09): server component busca o convite; estados: válido (mostra convidante + email fixo + 3 métodos), expirado/já usado (tela própria com orientação), OAuth com email errado (erro inline).
- `/sem-convite` (10): estática, mensagem + voltar ao login.
- `/time` (sem mockup): usa app shell + `ui/` existentes (Avatar, Badge, Button, Input, StatusPill); convites pendentes na mesma lista com pill "Pendente"; modal de convite segue o padrão de `new-product-modal.tsx`.
- Menu do avatar na sidebar (H9): **Popover API nativa** (`popovertarget`) — zero dependência, zero estado; nome, email e "Sair" (`authClient.signOut()` → `/login`).
- Tokens/classes: os mesmos do design system (`bg-surface-0`, `fg-*`, `rounded-auth`…) — o mockup usa a mesma linguagem visual do login atual.

## Risks / Trade-offs

- **[API do better-auth divergir do meu conhecimento]** → task explícita de ler `node_modules/better-auth` (README/types) antes de configurar; nomes de opções conferidos contra a versão instalada.
- **[Gate no hook `before` rejeita depois do OAuth completar]** → UX: usuário autoriza no GitHub e só então descobre que não tem convite. Aceitável — é exatamente o fluxo H1/H8 ("email sem convite → tela Sem convite"); alternativa (pre-check de email antes do OAuth) é impossível sem o email.
- **[Dev precisa de um Postgres rodando]** → `DATABASE_URL` no `.env.example` com one-liner `docker run postgres` comentado; sem banco o app falha explícito no boot, não silencioso.
- **[Proxy otimista não é segurança]** → por design: segurança real fica em `getSession` nos layouts/actions; proxy é só UX. Regra registrada nos specs (toda action valida sessão+role no server).
- **[OAuth exige apps GitHub/Google configurados]** → `.env.example` documentado; email+senha funciona sem credenciais para dev/primeiro admin.

## Open Questions

- Provedor de email de produção (Resend? SMTP corporativo?) — decidir quando houver deploy; interface de D6 isola a escolha.
- `/design-system` e `/` (índice dev) ficam públicos ou atrás do login? Default: atrás do login (matcher pega tudo que não é rota pública); custo zero para reverter.
