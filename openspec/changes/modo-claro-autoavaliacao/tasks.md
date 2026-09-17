# Tasks — Modo claro no formulário público de autoavaliação

## 1. Preparação

- [x] 1.1 Ler `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md` (export `viewport` por página, `themeColor`, `colorScheme`) e confirmar que o segmento sobrescreve o root layout
- [x] 1.2 Confirmar que o branch `feat/autoavaliacao-publica` (change `formulario-publico-serventia`) está aplicado no working tree; este change edita `src/app/autoavaliacao/[token]/*`

## 2. Tokens do tema claro

- [x] 2.1 Em `src/app/globals.css`, adicionar após o `@theme` o bloco `[data-theme="light"], body:has([data-theme="light"])` com `color-scheme: light` e a paleta da tabela D2 (canvas, surface, line, fg, primary-fg/fg-hi/ink, success/warning/danger/info, status-done), com comentário explicando o escopo e o `:has()`
- [x] 2.2 Conferir no CSS compilado do dev server que utilities como `bg-surface-card` continuam como `var(--color-…)` (nenhuma delas pode estar `inline`)

## 3. Rota pública sem cores fixas

- [x] 3.1 `telas.tsx`: `<main data-theme="light">`, gradiente via `var(--color-canvas-top/mid/base)`; revisar `TelaAviso` para só tokens
- [x] 3.2 `autoavaliacao-form.tsx`: aplicar o mapeamento D3 — rótulos `text-fg-3`, foco/erro via `border-primary/55 ring-3 ring-primary/15` e `border-danger/55 ring-3 ring-danger/10`, botão com `shadow-brand`, verdes via `success/NN`, destaque via `warning/NN`, barra fixa `bg-surface-0/92`, trilho `bg-fg-hi/10`
- [x] 3.3 `page.tsx`: `export const viewport: Viewport = { themeColor: "#f5f6fa", colorScheme: "light" }`
- [x] 3.4 `src/components/landing/topo.tsx`: `text-white` → `text-fg-hi` no logo (conferir que `/diagnostico` não muda visualmente)

## 4. Teste de regressão

- [x] 4.1 Criar `src/lib/diagnostico/autoavaliacao-tema.test.ts` que lê `telas.tsx` e `autoavaliacao-form.tsx`, remove comentários `//` e `/* */`, e falha em `#[0-9a-fA-F]{3,8}\b` (fora de strings de URL) ou `rgba?\(`
- [x] 4.2 `npm test`, `npm run lint` e `npx tsc --noEmit` passando

## 5. Verificação no browser (rota pública, sem login)

- [x] 5.1 Abrir um link válido em viewport de celular e desktop: fundo claro, cartões brancos, logo escuro, select/checkbox claros; screenshot dos três passos e da barra fixa
- [x] 5.2 Medir contraste com `getComputedStyle` nos elementos: pergunta (`fg-1`), legenda (`fg-5`), "Salvo" (`fg-8`), link da política (`primary-ink`), erro (`danger`) — todos dentro dos mínimos da spec
- [x] 5.3 Conferir `meta[name=theme-color]` na rota pública (claro) e em `/login` (escuro), e que `/diagnostico` continua escura com logo claro
- [x] 5.4 Telas de link inválido, expirado e pós-envio também claras

## Notas da implementação

- 5.2: contrastes medidos no browser (tema claro): título 18.9:1, pergunta 17.5:1, subtítulo `fg-5` 6.3:1, legenda 5.7:1, opção 7.4:1, contador `fg-6` 5.2:1, `fg-8` 3.7:1, "PASSO" `fg-9` 3.4:1, link `primary-ink` 6.2:1, erro `danger` 5.0:1. A primeira versão de `fg-9` (#9a9eab) media 2.67:1 e foi escurecida para #868b99; design.md atualizado.
- 5.3: `/diagnostico` e `/login` continuam com `theme-color #06070a`, fundo escuro e logo claro (rgb 242,242,244); a rota pública emite `theme-color #f5f6fa` e `color-scheme light`.
