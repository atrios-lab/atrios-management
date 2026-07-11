## Context

O app é Next.js 16 (App Router) na Vercel, Postgres via Drizzle (`pg` Pool em `src/db/index.ts`), auth com better-auth. Todas as mutações são server actions que terminam em `revalidatePath`, então só o cliente que agiu vê o dado novo; os demais ficam desatualizados até recarregar. Não existe nenhuma infraestrutura de realtime (sem websocket, SSE, polling ou serviço externo). O board de produtos (`src/app/produtos/product-board.tsx`) usa `useOptimistic` + `useTransition` com dados vindos por props de um RSC.

Atenção: o Next.js deste repo é a versão 16 com breaking changes — ler os guias em `node_modules/next/dist/docs/` (route handlers, streaming, `maxDuration`) antes de implementar.

## Goals / Non-Goals

**Goals:**
- Propagar mudanças de dados para todos os clientes conectados em poucos segundos, sem reload.
- Zero dependência/serviço externo novo; reusar Postgres e a stack atual.
- Merge fino no board de produtos; granularidade de página (`router.refresh()`) no resto.
- Degradação limpa: se o stream cair, o app continua funcionando como hoje (dados a partir da navegação), com ressincronização ao reconectar.

**Non-Goals:**
- Colaboração ao vivo estilo CRDT/presence (cursores, "fulano está digitando").
- Realtime para dados que só o próprio usuário vê (`voce/`).
- Garantia de entrega de eventos (o mecanismo de recuperação é ressincronizar, não reentregar).
- Escalar para centenas de conexões simultâneas — o público é um time pequeno de cartório.

## Decisions

### 1. Transporte: SSE via route handler, não WebSocket nem serviço externo
- **SSE (`GET /api/realtime`)**: funciona em route handler do Next com `ReadableStream`, passa por proxies/Vercel, reconexão nativa do `EventSource`. Escolhido.
- WebSocket: não roda em function serverless da Vercel; exigiria host separado. Descartado.
- Pusher/Ably: resolve bem, mas adiciona conta, custo e dependência para um time pequeno. Fica como plano B documentado se os limites de duração da Vercel incomodarem.
- Polling (`router.refresh()` por intervalo): fallback trivial, mas gasta re-render de RSC constante e a latência é pior. Usado apenas como comportamento implícito de ressincronização ao reconectar/refocar.

### 2. Barramento: Postgres LISTEN/NOTIFY
Instâncias serverless não compartilham memória, então o fan-out precisa de um barramento externo ao processo. O Postgres já existente resolve com `pg_notify(canal, payload)`:
- O handler SSE abre **uma conexão dedicada** (`pool.connect()` mantido, ou `new Client`) com `LISTEN realtime` e repassa notificações filtradas pelo canal do assinante. Não usar o Pool do Drizzle para LISTEN (o pool recicla conexões).
- As server actions publicam com `SELECT pg_notify('realtime', $1)` na mesma transação/conexão da mutação via helper `publish(channel, event)` em `src/lib/realtime/publish.ts`, com try/catch para nunca derrubar a action.
- Payload pequeno (limite de 8 KB do NOTIFY): `{ channel, type, id, actorId, ts }` — o cliente busca o dado completo por refresh/refetch, o evento é só o sino.

### 3. Canais
- `product:<productId>` — eventos de card do board (`card.created|updated|archived`).
- `cofre`, `time`, `diagnosticos`, `documents:<productId>` — eventos genéricos (`changed`) que só disparam `router.refresh()` no assinante.
Um único canal Postgres físico (`realtime`) com o canal lógico dentro do payload simplifica o LISTEN (uma conexão por instância do handler, não por assinante).

### 4. Cliente: hook `useRealtime` + variações por tela
- `src/lib/realtime/use-realtime.ts`: envolve `EventSource`, reconexão com backoff + jitter, ressincronização (`onResync`) ao reconectar e no `visibilitychange` para primeiro plano.
- Telas simples: `useRealtimeRefresh(channel)` = `useRealtime` + `router.refresh()` com debounce (rajadas de eventos → um refresh).
- Board: `useRealtime('product:<id>', onEvent)` aplica o evento ao estado local. Como o payload não traz o card completo, o board refaz o fetch leve dos cards do produto (server action de leitura ou `router.refresh()` — decidir na implementação pelo que preservar melhor o `useOptimistic`; o requisito é não sobrescrever drag/mutação pendente, ver spec `board-live-updates`).
- Eco: o evento carrega `actorId`; o cliente ignora eventos cujo `actorId` é o próprio usuário quando há mutação pendente local.

### 5. Ciclo de vida do stream na Vercel
- Route handler com `export const maxDuration` alto (Fluid Compute) e encerramento gracioso do stream antes do teto; o `EventSource` reconecta sozinho.
- Heartbeat (`: ping` a cada ~25 s) para atravessar proxies e detectar conexão morta.
- Em dev local não há limite; em produção cada cliente conectado ocupa uma invocação — aceitável para ~dezenas de usuários. Se o custo aparecer, trocar o transporte por Pusher/Ably mantendo `publish()` e `useRealtime` como interface estável.

## Risks / Trade-offs

- [Limite de duração/custo de functions na Vercel com SSE] → Fluid Compute + reconexão periódica; interface `publish`/`useRealtime` isola o transporte para troca futura por serviço gerenciado.
- [Eventos perdidos durante desconexão] → ressincronização integral ao reconectar e ao refocar a aba; realtime é otimização, não fonte de verdade.
- [NOTIFY não é transacional se emitido fora da transação] → publicar após o commit; pior caso é evento sem mudança (refresh à toa), nunca mudança sem evento visível após ressincronização.
- [Conexão LISTEN dedicada por instância do handler] → uma conexão pg extra por invocação ativa; com time pequeno é irrelevante, mas monitorar `max_connections` do Postgres (container OrbStack em dev, provedor em prod).
- [Merge remoto × `useOptimistic` no board] → risco de flicker/pulo de card; regra da spec: servidor vence, mas nunca durante drag/mutação pendente. Testar manualmente com duas sessões (usuário admin + `teste@atrios.dev`).

## Migration Plan

1. Infra (`publish`, route SSE, hooks) entra primeiro sem nenhum assinante — deploy sem risco.
2. Board de produtos adota realtime; validar com duas sessões em produção.
3. Demais telas adotam `useRealtimeRefresh` uma a uma.
4. Rollback: remover o assinante (hook) da tela problemática; a publicação de eventos é inócua sem assinantes.

## Open Questions

- `maxDuration` ideal na Vercel (depende do plano) — definir na implementação; começar com 300 s e reconexão no cliente.
- Se o board vai refetchar via `router.refresh()` ou server action de leitura dedicada — decidir na implementação conforme interação com `useOptimistic` (o critério está na spec).
