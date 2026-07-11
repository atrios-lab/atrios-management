## 1. Fundações

- [x] 1.1 Ler os guias do Next 16 em `node_modules/next/dist/docs/` sobre route handlers, streaming e `maxDuration` (o repo usa versão com breaking changes)
- [x] 1.2 Criar `src/lib/realtime/types.ts` com o tipo do evento (`{ channel, type, id?, actorId, ts }`) e as constantes de canais lógicos (`product:<id>`, `cofre`, `time`, `diagnosticos`, `documents:<id>`)
- [x] 1.3 Criar `src/lib/realtime/publish.ts`: helper server-side `publish(channel, event)` que emite `SELECT pg_notify('realtime', payload)` após o commit, com try/catch + log (falha de publicação nunca derruba a server action)

## 2. Endpoint SSE

- [x] 2.1 Criar `src/app/api/realtime/route.ts` (GET): validar sessão better-auth (401 sem sessão), ler `?channel=`, responder `text/event-stream` via `ReadableStream`
- [x] 2.2 No handler, abrir conexão pg dedicada (fora do Pool do Drizzle) com `LISTEN realtime`, filtrar notificações pelo canal lógico do assinante e repassar como eventos SSE; liberar a conexão no abort/close
- [x] 2.3 Adicionar heartbeat (`: ping` a cada ~25 s), `export const maxDuration` e encerramento gracioso do stream antes do teto de duração
- [x] 2.4 Testar manualmente com `curl -N` local: assinar um canal, publicar `pg_notify` via psql e ver o evento chegar; confirmar 401 sem cookie e que canal `product:xyz` não vaza para assinante de `product:abc` — OK: sem cookie o proxy redireciona (307→/login, stream não abre); com cookie do usuário de teste o evento de `cofre` chegou e o de `product:xyz` não vazou

## 3. Cliente

- [x] 3.1 Criar `src/lib/realtime/use-realtime.ts`: hook `useRealtime(channel, onEvent, onResync)` com `EventSource`, reconexão com backoff + jitter, ressincronização ao reconectar e no `visibilitychange` para primeiro plano
- [x] 3.2 Criar `useRealtimeRefresh(channel)` (mesmo arquivo ou vizinho): `useRealtime` + `router.refresh()` com debounce para rajadas de eventos
- [x] 3.3 Expor estado de conexão no hook e adicionar indicador discreto de reconexão (respeitar o design system atual; visível apenas quando desconectado/reconectando)

## 4. Publicação nas server actions

- [x] 4.1 `src/app/produtos/actions.ts`: publicar `card.created|updated|archived` no canal `product:<productId>` em todas as mutações de card (incluindo `setCardStatus`, `linkPr`, `archiveCard`), sempre após a gravação
- [x] 4.2 `src/app/cofre/actions.ts`: publicar `changed` no canal `cofre` nas mutações de acesso
- [x] 4.3 `src/app/time/actions.ts` e `src/app/diagnosticos/actions.ts`: publicar `changed` nos canais `time` e `diagnosticos`
- [x] 4.4 `src/app/produtos/[code]/documentos/actions.ts`: publicar `changed` no canal `documents:<productId>` (a rota `upload/route.ts` só troca tokens; o doc é criado em `createFileDocument`, já coberto)

## 5. Board de produtos (merge fino)

- [x] 5.1 Em `product-board.tsx`, assinar `product:<id>` com `useRealtime` e, ao receber evento de card, ressincronizar os cards (via `router.refresh()` debounced — preserva o `useOptimistic`; critério na spec `board-live-updates`)
- [x] 5.2 Ignorar/mesclar de forma idempotente eventos cujo `actorId` é o próprio usuário quando há mutação otimista pendente (sem flicker nem duplicação)
- [x] 5.3 Garantir que ressincronização não interrompe drag em andamento nem sobrescreve mutação pendente (adiar aplicação até o fim do drag/transition)
- [x] 5.4 Testado no browser (usuário de teste) + `pg_notify` como "segundo usuário": board assina `product:<id>` (200 OK) e recarrega (`/produtos/POR?_rsc=`) ao receber `card.updated`/`card.created` de outro `actorId`; convergência é last-write-wins por construção (o refresh relê o estado do servidor). Sem loop (contagem estável) e sem erros de console

## 6. Telas com refresh por evento

- [x] 6.1 Cofre: assinar `cofre` com `useRealtimeRefresh` na tela de listagem
- [x] 6.2 Time e Diagnósticos: assinar `time` e `diagnosticos` nas telas correspondentes
- [x] 6.3 Documentos do produto: assinar `documents:<productId>` na aba de documentos
- [x] 6.4 Testado no browser: tela do cofre assina `cofre` (200 OK) e recarrega (`/cofre?_rsc=`) ao receber evento de outro `actorId`; rajada de eventos coalescida em 1 refresh (debounce); evento com o próprio `actorId` é ignorado (sem refresh). Mesmo mecanismo em diagnósticos/documentos

## 7. Verificação final

- [x] 7.1 Rodar lint (Biome) e testes (Vitest) do projeto — Vitest 9/9 verde; Biome sem erros novos (2 pré-existentes no baseline, inalterados)
- [x] 7.2 Verificado no viewport mobile (375×812): board com snap horizontal, tab bar e cards intactos; indicador oculto quando "open" (não invade a tab bar). Realtime não interfere no swipe/drag
- [x] 7.3 Degradação limpa: no fechamento do stream o handler faz cleanup gracioso (`abort → client.end()`, verificado ao encerrar o `curl`); o cliente reconecta com backoff/jitter e ressincroniza no reconnect e no `visibilitychange`; os dados continuam vindo da navegação normal (RSC) se o stream cair
- [x] 7.4 `openspec validate add-realtime-updates` → válido; requisitos das specs `realtime-sync` e `board-live-updates` cobertos pelo implementado
