# Proposal — Modo claro no formulário público de autoavaliação

## Why

O formulário público `/autoavaliacao/[token]` herdou o tema escuro do app interno (Linear-like, feito para a equipe da Átrios em desktop). Quem responde é o titular ou escrevente do cartório, no celular, muitas vezes no balcão e sob luz do dia: fundo quase preto com texto cinza cansa, parece "site de TI" e destoa do resto da comunicação com a serventia. Um tema claro deixa o formulário legível, familiar e com cara de documento oficial, sem tocar no app interno.

## What Changes

- **Tema claro fixo na rota pública `/autoavaliacao`**: a página inteira (casca, formulário, telas de link inválido/expirado/enviado) passa a renderizar com fundo claro e texto escuro. Não é um toggle nem segue a preferência do sistema: o link enviado à serventia abre sempre claro.
- **Paleta clara como redefinição dos tokens existentes**, escopada à rota: as utilities do Tailwind já resolvem para `var(--color-*)`, então um bloco em `globals.css` redefine `--color-canvas-*`, `--color-surface-*`, `--color-line-*`, `--color-fg-*`, `--color-primary-ink/fg` e semânticas (`success`, `warning`, `danger`) dentro de `[data-theme="light"]`, mais `color-scheme: light` para controles nativos (select, checkbox, radio).
- **Remoção das cores fixas do formulário público**: os hex/rgba soltos em `autoavaliacao-form.tsx` e `telas.tsx` (rótulo `#b6b9c2`, verdes `#58c48f`/`#4cb782`, amarelo de destaque, barra fixa `rgba(8,9,13,…)`, gradiente do fundo, sombras de foco) viram tokens ou opacidades de tokens, para que respondam ao tema.
- **Logo e topo compartilhados** deixam de usar `text-white` e passam a `text-fg-hi` (idêntico no tema escuro, escuro no claro). Nenhuma mudança visual na landing nem no site institucional.
- **`themeColor` da rota** para a barra do navegador no celular acompanhar o fundo claro.
- **Teste automatizado** que lê os arquivos da rota pública e falha se voltar a aparecer cor fixa (hex/rgba) fora da lista permitida, no mesmo espírito do teste de vazamento do payload.
- Sem mudança em app interno, landing `/diagnostico`, site `/`, PDFs ou regras de negócio.

## Capabilities

### New Capabilities

- `autoavaliacao-tema-claro`: aparência clara da rota pública de autoavaliação: escopo do tema, tokens redefinidos, contraste mínimo, controles nativos claros, cor da barra do navegador e proteção contra cores fixas.

### Modified Capabilities

(nenhuma — `openspec/specs/` está vazio; a spec `autoavaliacao-publica` ainda vive no change `formulario-publico-serventia`, não arquivado, e seus requisitos não mudam: este change só altera aparência)

## Impact

- **CSS**: `src/app/globals.css` ganha o bloco `[data-theme="light"]` (e `body:has([data-theme="light"])` para o fundo do documento e overscroll no iOS).
- **Rota pública**: `src/app/autoavaliacao/[token]/telas.tsx` (casca recebe `data-theme="light"`, gradiente via tokens), `autoavaliacao-form.tsx` (cores fixas → tokens), `page.tsx` (`export const viewport` com `themeColor` claro).
- **Componentes compartilhados**: `src/components/landing/topo.tsx` (`text-white` → `text-fg-hi`); `Rodape` já usa tokens.
- **Testes**: novo `src/lib/diagnostico/autoavaliacao-tema.test.ts` (varredura de cores fixas nos arquivos da rota).
- **Dependência**: o change `formulario-publico-serventia` (branch `feat/autoavaliacao-publica`) precisa estar aplicado — este change edita os arquivos que ele criou.
