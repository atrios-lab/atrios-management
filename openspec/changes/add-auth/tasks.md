# Tasks: add-auth

## 1. Fundação — deps, banco e better-auth

- [x] 1.1 Ler docs da versão instalada de better-auth (`node_modules/better-auth`) e do drizzle antes de configurar; anotar divergências com design.md (D1) se houver
- [x] 1.2 Instalar `better-auth`, `drizzle-orm`, `drizzle-kit`, `pg` (+ `@types/pg`)
- [x] 1.3 Criar `src/db/index.ts` (drizzle + `Pool` via `DATABASE_URL`) e `drizzle.config.ts` (dialect `postgresql`)
- [x] 1.4 Configurar `src/lib/auth.ts`: `betterAuth` com drizzle adapter, `emailAndPassword` (+ `sendResetPassword`), `socialProviders` GitHub/Google, `user.additionalFields.role`, plugin `nextCookies`
- [x] 1.5 Gerar schema core com a CLI do better-auth em `src/db/schema.ts`; adicionar tabela `invite` (D3) com FKs e cascade de sessões; `drizzle-kit push`
- [x] 1.6 Criar handler `src/app/api/auth/[...all]/route.ts` e `src/lib/auth-client.ts`; `.env.example` com `DATABASE_URL` (+ one-liner docker comentado), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, credenciais GitHub/Google
- [x] 1.7 Criar `src/lib/email.ts` (`sendEmail` → console.log em dev) e usar no `sendResetPassword`

## 2. Gate de convites e bootstrap (server)

- [x] 2.1 Implementar `databaseHooks.user.create.before`: banco vazio → `admin` (H10); convite pendente → role do convite; senão → rejeitar (H8)
- [x] 2.2 Implementar `user.create.after`: marcar convite como aceito (`acceptedAt`)
- [x] 2.3 Verificar destino do erro OAuth bloqueado (`errorCallbackURL`) e mapear: login → `/sem-convite`; página de convite → erro "convite vale apenas para este email"
- [x] 2.4 Teste rápido dos 3 caminhos do gate (banco vazio / com convite / sem convite) via script ou fluxo manual documentado

## 3. Proteção de rotas

- [x] 3.1 Criar `src/proxy.ts` (Next 16, export `proxy`): sem cookie de sessão → `/login`; logado em `/login` → `/produtos`; matcher negativo com rotas públicas (D4)
- [x] 3.2 Verificação real de sessão (`auth.api.getSession`) no layout de `/produtos` e `/time`; redirect quando nulo

## 4. Telas de auth (mockup 07–10)

- [x] 4.1 Refazer `/login` conforme seção "07 Login v2": botões GitHub/Google funcionais (`authClient.signIn.social`), form email+senha (`signIn.email`) com erro inline, link "Esqueci minha senha" (H1, H2)
- [x] 4.2 Criar `/esqueci-senha` (form email → mensagem neutra) e `/redefinir-senha` (nova senha + confirmação via token do link; estado de link expirado) conforme seção 08 (H3)
- [x] 4.3 Criar `/convite/[token]` conforme seção 09: server component busca convite; estados válido (convidante + email fixo + GitHub/Google/senha), expirado/usado (tela própria), OAuth com email errado (H4)
- [x] 4.4 Criar `/sem-convite` conforme seção 10: mensagem + botão voltar ao login, sem formulário (H8)

## 5. Sessão na UI

- [x] 5.1 Layout de `/produtos` passa o usuário da sessão para `AppSidebar` (substituir usuário mockado)
- [x] 5.2 Menu do avatar na sidebar via Popover API nativa: nome, email, "Sair" → `authClient.signOut()` → `/login` (H9)

## 6. Tela /time (design system, sem mockup)

- [x] 6.1 Server actions em `src/app/time/actions.ts` com guard admin: `inviteMember`, `resendInvite`, `cancelInvite`, `changeRole`, `removeMember` + invariantes (self-removal, último admin, email duplicado) (D5)
- [x] 6.2 Página `/time`: lista de membros + convites pendentes ("Pendente") com Avatar/Badge/StatusPill; member vê sem ações (H6)
- [x] 6.3 Ações de admin na UI: modal de convite (padrão `new-product-modal`), mudar role, remover com confirmação, reenviar/cancelar convite (H7)
- [x] 6.4 Adicionar `/time` à navegação da sidebar

## 7. Verificação de ponta a ponta

- [x] 7.1 Fluxo completo manual: banco zerado → primeiro signup vira admin → convida member → aceite via link com senha → aceite implícito via OAuth (se credenciais configuradas) → sem convite bloqueado → reset de senha → sair
- [x] 7.2 Invariantes de admin: member não vê ações e actions rejeitam; último admin protegido; self-removal bloqueado
- [x] 7.3 Atualizar índice em `src/app/page.tsx` com as rotas novas e rodar `pnpm lint` + `pnpm build`; `openspec validate` da change
