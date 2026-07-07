# Proposal: add-auth

## Why

O app hoje é 100% fachada: o botão "Continuar com GitHub" em `/login` é um `<Link>` para `/produtos`, sem sessão, sem usuários, sem guard de rota. As histórias H1–H10 (`docs/historias-auth-time-convites.md`) e o mockup hi-fi (`tmp/Átrios Auth (standalone).html`) já definem o produto — falta a implementação que transforma os mocks em app real com acesso restrito ao time da Átrios.

## What Changes

- Autenticação real com **better-auth** + **Drizzle** (Postgres): GitHub, Google e email+senha (H1, H2).
- Recuperação de senha por email com link expirável (H3) — rotas `/esqueci-senha` e `/redefinir-senha`.
- Sistema de convites: signup fechado, só entra quem tem convite pendente (H4, H5, H8) — rotas `/convite/[token]` e `/sem-convite`.
- Tela `/time`: listar membros e convites; admin convida, remove, muda role, reenvia/cancela convite (H6, H7).
- Sessão persistente + logout no menu do avatar da sidebar; rotas do app redirecionam para `/login` quando deslogado via `proxy.ts` (H9).
- Bootstrap: primeiro usuário do banco vira `admin` automaticamente (H10).
- `/login` refeito conforme mockup "07 Login v2" (provedores + email/senha + erro inline), substituindo o link falso.

Sem mudanças **BREAKING** — tudo é capability nova; a única tela existente afetada é `/login` (mock → real).

## Capabilities

### New Capabilities

- `auth`: login social (GitHub/Google) e email+senha, recuperação de senha, sessão persistente, logout e bootstrap do primeiro admin (H1, H2, H3, H9, H10).
- `invites`: convites com token e expiração, aceite explícito via link e implícito via login social, bloqueio de signup sem convite (H4, H5, H8).
- `team-management`: tela `/time` com listagem de membros/convites e ações de admin — convidar, mudar role, remover, reenviar/cancelar (H6, H7).

### Modified Capabilities

_Nenhuma — não existem specs principais ainda._

## Impact

- **Dependências novas**: `better-auth`, `drizzle-orm`, `drizzle-kit`, `pg` (node-postgres).
- **Rotas novas**: `/esqueci-senha`, `/redefinir-senha`, `/convite/[token]`, `/sem-convite`, `/time`, `/api/auth/[...all]`.
- **Rotas alteradas**: `/login` (funcional), `/produtos/*` (protegidas), sidebar (`src/components/app-sidebar.tsx`) ganha menu do avatar com "Sair".
- **Arquivos novos de infra**: `src/proxy.ts` (Next 16 renomeou middleware → proxy), schema Drizzle, config better-auth, util de email (console em dev).
- **Config**: `.env` com `DATABASE_URL` (Postgres), credenciais OAuth GitHub/Google e secret.
- **Design**: telas seguem o mockup `tmp/Átrios Auth (standalone).html` (seções 07–10); `/time` não tem mockup — usa o design system existente (`src/components/ui`).
