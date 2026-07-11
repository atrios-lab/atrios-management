## Why

Hoje uma mutação (mover card no kanban, criar acesso no cofre, responder diagnóstico) só atualiza a tela de quem agiu — `revalidatePath` re-renderiza apenas o cliente que disparou a server action. Outros usuários conectados continuam vendo dados desatualizados até recarregar a página, o que causa conflitos no board de produtos (duas pessoas movendo cards ao mesmo tempo) e decisões sobre dados velhos.

## What Changes

- Nova infraestrutura de eventos em tempo real: endpoint SSE (`/api/realtime`) que transmite eventos de mudança por canal, usando Postgres `LISTEN/NOTIFY` como barramento — sem serviço externo novo.
- Server actions de mutação passam a publicar um evento (`pg_notify`) após gravar no banco, além do `revalidatePath` atual.
- Hook cliente `useRealtime(channel)` que assinala o SSE com reconexão automática e expõe os eventos recebidos.
- Board de produtos (`product-board.tsx`) reage a eventos de cards em tempo real: mudanças de outros usuários aparecem sem reload, mescladas com o estado otimista local sem sobrescrever a ação em andamento do próprio usuário.
- Demais telas (cofre, time, diagnósticos, documentos) ganham atualização automática via `router.refresh()` disparado por evento do seu canal — granularidade de página, sem merge fino.
- Indicador discreto de conexão/reconexão no cliente (estado do stream).

## Capabilities

### New Capabilities
- `realtime-sync`: mecanismo de tempo real — publicação de eventos nas server actions, transporte via SSE + Postgres LISTEN/NOTIFY, assinatura no cliente com reconexão e atualização automática das telas assinantes.
- `board-live-updates`: comportamento do board de produtos sob eventos em tempo real — merge fino de cards (criação, movimentação, edição, arquivamento) com o estado otimista local, sem perder drag em andamento.

### Modified Capabilities
<!-- Nenhuma: não há specs principais em openspec/specs/ ainda. -->

## Impact

- **Código novo**: `src/app/api/realtime/route.ts` (SSE), `src/lib/realtime/` (publicação server-side + hook cliente).
- **Código alterado**: server actions em `src/app/produtos/actions.ts`, `src/app/produtos/[code]/documentos/actions.ts`, `src/app/cofre/actions.ts`, `src/app/time/actions.ts`, `src/app/diagnosticos/actions.ts` (adicionar publicação de evento); `product-board.tsx` (merge de eventos); layouts/telas que assinam canais.
- **Dependências**: nenhuma nova — reusa `pg` (Pool já existente) para `LISTEN/NOTIFY`.
- **Deploy (Vercel)**: SSE mantém uma function ativa por cliente conectado; exige Fluid Compute (padrão atual da Vercel) e `maxDuration` configurado, com reconexão periódica no cliente. Alternativa externa (Pusher/Ably) fica documentada no design caso o custo/limite de duração vire problema.
- **Auth**: o endpoint SSE valida a sessão better-auth antes de abrir o stream.
