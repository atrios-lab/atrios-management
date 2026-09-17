# Design — Modo claro no formulário público de autoavaliação

## Context

O design system do Átrios é **dark-only**: `src/app/globals.css` define os tokens num bloco `@theme` do Tailwind v4 (`--color-canvas-*`, `--color-surface-*`, `--color-line-*`, `--color-fg-hi…fg-9`, `--color-primary*`, semânticas `success/warning/info/danger`). Confirmado no CSS compilado que as utilities resolvem para `var(--color-x)` (ex.: `.bg-surface-card { background-color: var(--color-surface-card) }`), então redefinir as variáveis num ancestral muda a subárvore inteira sem tocar nas classes. Não existe hoje nenhuma noção de tema claro, `prefers-color-scheme` ou `data-theme` no projeto.

A rota pública `/autoavaliacao/[token]` (change `formulario-publico-serventia`) é composta por `CascaPublica` (`telas.tsx`: `<main>` com gradiente em hex fixo + `Topo` + `Rodape`), `AutoavaliacaoForm` (usa tokens na maior parte, mas tem ~15 cores fixas: rótulo `#b6b9c2`, foco/erro em rgba do primary/danger, verdes `#58c48f`/`#4cb782`/rgba(76,183,130), destaque amarelo rgba(242,201,76), barra fixa `rgba(8,9,13,0.92)`) e as telas de aviso. `Topo` pinta o logo com `text-white` (o lockup é `fill=currentColor`). O root layout fixa `themeColor: "#06070a"`.

**Atenção (AGENTS.md):** conferir em `node_modules/next/dist/docs/` o export `viewport` por página (`generate-viewport.md`) antes de codar.

## Goals / Non-Goals

**Goals:**
- Rota `/autoavaliacao` inteira em tema claro, sempre, em todos os estados (formulário, enviado, inválido, expirado, em análise).
- Contraste de texto ≥ 4.5:1 (WCAG AA) para corpo e ≥ 3:1 para bordas/ícones informativos.
- Controles nativos (select, checkbox, radio) claros; barra do navegador clara no celular.
- Zero cores fixas no código da rota: tudo via token, com teste que impede regressão.
- Nenhuma mudança visual no app interno, na landing `/diagnostico` e no site `/`.

**Non-Goals:**
- Toggle de tema, `prefers-color-scheme`, ou tema claro no app interno / landing.
- Redesenhar o formulário (layout, textos e componentes ficam iguais).
- Migrar as demais páginas para tokens semânticos.

## Decisions

### D1 — Tema claro fixo, escopado por `data-theme="light"` na rota
`CascaPublica` recebe `data-theme="light"` no `<main>`. Em `globals.css`, um bloco fora do `@theme` redefine as variáveis:

```css
[data-theme="light"],
body:has([data-theme="light"]) {
  color-scheme: light;
  --color-canvas-top: …; /* etc. */
}
```

O seletor duplo cobre o `<main>` (subárvore) **e** o `body` (fundo do documento, overscroll no iOS, scrollbar), sem precisar de layout de rota nem de atributo no `<html>`. `:has()` tem suporte em todos os navegadores alvo (Safari ≥ 15.4, Chrome ≥ 105).

*Alternativas:* (a) classes `dark:`/`light:` do Tailwind em cada elemento — dobraria as classes do formulário e quebraria a regra "cor é token"; (b) `prefers-color-scheme` — o público-alvo e o contexto (link enviado, celular no balcão) pedem previsibilidade, não preferência de sistema; (c) layout `src/app/autoavaliacao/layout.tsx` — não consegue mudar `<html>`/`<body>`, então o `:has()` resolve melhor.

### D2 — Paleta clara (valores iniciais)
Mantém o mesmo hue frio dos tokens escuros e o `primary` idêntico (marca). Valores:

| Token | Escuro (atual) | Claro |
|---|---|---|
| canvas-top / mid / base | #0d1018 / #06070a / #050506 | #ffffff / #f5f6fa / #eef0f5 |
| surface-0 … surface-4 | #08090a … #0d0e11 | #f7f8fb, #f3f4f8, #f0f1f6, #edeef4, #eaebf2 |
| surface-card / card-hover / raised / selected | #111214 / #141518 / #17181b / #131417 | #ffffff / #fafbfd / #f3f4f8 / #eef0f7 |
| line-subtle / line / line-strong | rgba(255,255,255,.045/.06/.08) | rgba(15,17,26,.06/.09/.12) |
| line-field / line-field-strong / line-hover | rgba(255,255,255,.10/.12/.20) | rgba(15,17,26,.16/.20/.32) |
| fg-hi / fg-1 / fg-2 / fg-3 / fg-4 | #f2f2f4 / #eaeaec / #dcdde1 / #c8cad0 / #a9abb5 | #0f1117 / #171923 / #23262f / #343846 / #4a4f5e |
| fg-5 / fg-6 / fg-7 / fg-8 / fg-9 | #9296a0 / #787c88 / #6b6f7a / #5c5f6a / #4f525b | #5b6071 / #646979 / #737887 / #7f8492 / #868b99 |
| primary / primary-hover | #5e6ad2 / #6b76e0 | iguais (branco sobre #5e6ad2 ≈ 4.9:1) |
| primary-fg / primary-fg-hi / primary-ink | #a9b0ec / #c3c9f4 / #8b93ec | #4650b8 / #3a43a6 / #4a55c4 (links sobre branco ≥ 5:1) |
| success / warning / danger / info | #4cb782 / #e2b13c / #e06c6c / #5e9eff | #2f8f5f / #a8720c / #c24545 / #2f6fd6 |
| status-done | #4cb782 | #2f8f5f |

`fg-7`/`fg-8`/`fg-9` no claro ficam acima de 3:1 sobre branco (texto auxiliar pequeno; a primeira versão de `fg-9`, #9a9eab, media 2.67:1 e foi escurecida); `fg-6` (13px de apoio) ≥ 4.5:1. Sombras (`--shadow-*`) permanecem: sobre fundo claro ficam mais discretas, o que é desejável.

### D3 — Cores fixas do formulário viram tokens
Mapeamento em `autoavaliacao-form.tsx` / `telas.tsx`:

- Gradiente do `<main>`: `var(--color-canvas-top/mid/base)` (mesma fórmula do `body` em globals).
- Rótulos `text-[#b6b9c2]` → `text-fg-3`.
- Foco de campo `rgba(94,106,210,…)` → `focus:border-primary/55 focus:ring-3 focus:ring-primary/15`; erro `rgba(224,108,108,…)` → `border-danger/55 ring-3 ring-danger/10`.
- Botão primário: sombra `rgba(94,106,210,0.30)` → `shadow-brand` (token já existente).
- Verde do check/WhatsApp (`#4cb782`, `#58c48f`, rgba(76,183,130)) → `text-success`, `border-success/45`, `bg-success/10`, `hover:bg-success/8`.
- Destaque da pergunta pendente rgba(242,201,76) → `border-warning/50 bg-warning/8`.
- Barra fixa `bg-[rgba(8,9,13,0.92)]` → `bg-surface-0/92` (opacidade de token; Tailwind v4 gera `color-mix`), mantendo `backdrop-blur`.
- Trilho da barra de progresso `bg-white/10` → `bg-fg-hi/10`.

Regra: nenhuma cor literal nos dois arquivos; opacidade sempre como `token/NN`.

### D4 — Topo compartilhado: `text-white` → `text-fg-hi`
`LogoAtrios` em `topo.tsx` passa a `text-fg-hi`. No tema escuro `fg-hi` é #f2f2f4 (visualmente igual a branco); no claro vira #0f1117. Landing e site não mudam de aparência. O badge dos parceiros (`bg-[#f4f5f7]`) já é claro e fica igual.

### D5 — `themeColor` da rota
`page.tsx` da autoavaliação exporta `viewport = { themeColor: "#f5f6fa", colorScheme: "light" }`; o Next mescla por segmento e sobrescreve o `#06070a` do root layout só nessa rota. Vale para todos os estados da página (é da rota, não do componente).

### D6 — Teste de regressão de cores fixas
`src/lib/diagnostico/autoavaliacao-tema.test.ts` lê `telas.tsx` e `autoavaliacao-form.tsx` com `node:fs` e falha se encontrar `#[0-9a-fA-F]{3,8}` ou `rgba?(` fora de comentários. Sem lista de exceções: a regra é absoluta nesses dois arquivos. É barato, roda no `npm test` e substitui uma regra de lint que o Biome não tem.

## Risks / Trade-offs

- [Alguma classe usa cor fixa que passou despercebida, ex.: `text-white` num botão] → `text-white` sobre `bg-primary` é intencional e passa no contraste; o teste de D6 pega hex/rgba, e a revisão visual em celular cobre o resto.
- [Opacidade de token (`bg-surface-0/92`) depende de `color-mix` do Tailwind v4] → já usado no projeto (`bg-primary/15`, `border-primary/60` no roteiro interno), suporte ok.
- [`body:has()` altera o `body` global quando a rota pública está montada] → a rota não compartilha árvore com o app autenticado (sem `AppShell`), então não há vazamento; em navegação client-side para fora da rota o `<main>` desmonta e o `:has()` deixa de casar.
- [Contraste dos tons `fg-8/9` em texto de 11px] → usados só em rótulos de apoio; valores escolhidos acima de 3:1 e conferidos no browser com `getComputedStyle`.
- [Divergência futura: alguém adiciona cor fixa no formulário] → teste D6 quebra o `npm test`.

## Migration Plan

Só CSS e classes; sem migração de dados. Deploy normal. Rollback = reverter o commit.

## Open Questions

- Manter o link "Política de privacidade" e o topo com logo escuro no claro, ou trocar por versão colorida da marca? Assumido logo escuro (`fg-hi`), sem novo asset.
