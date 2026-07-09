# Design — Documentos do Produto

## Context

O Átrios é um Next.js 16 (App Router, React 19) com Postgres via Drizzle, auth via better-auth, Tailwind v4 com tokens próprios e Biome. A página do produto usa **tabs por rota**: `src/app/produtos/[code]/page.tsx` (Cards) e `.../acessos/page.tsx` (Acessos), ambas renderizando `<ProductHeader active=... />`. Mutações são **server actions** no padrão `requireSession()` → validação → `db` → `revalidatePath`, retornando `{ error?: string }`. Modais são hand-rolled (overlay fixo + card), sem lib de dialog. O cofre (Acessos) já tem um padrão de timeline de eventos (`accessEvent`) que serve de modelo para a atividade de documentos.

O projeto **não tem** hoje: lib de markdown/rich-text, solução de upload/armazenamento de arquivos, componente de dropdown menu.

Referência visual: `reference-atrios-documentos.html` (neste diretório; telas 17a, 17b, 18a–c, 19). Dark theme e tokens já usados no app.

**Atenção (AGENTS.md)**: este Next 16 tem breaking changes — ler os guias relevantes em `node_modules/next/dist/docs/` antes de escrever código (route handlers, server actions, `revalidatePath`).

## Goals / Non-Goals

**Goals:**
- Aba Documentos completa: lista agrupada por pastas, busca, estado vazio, contador na tab.
- Criação nos três formatos (doc escrito, arquivo até 25 MB, link com título importado) num único modal com abas segmentadas.
- Leitor para docs escritos com edição, mover/renomear/excluir e timeline de atividade.
- Pastas livres por produto, com criação pela toolbar e inline no select do modal.

**Non-Goals:**
- Versionamento de conteúdo / histórico de diffs (a timeline registra só quem/quando/qual ação).
- Colaboração em tempo real, comentários, menções.
- Permissões por documento (herda o acesso ao produto).
- Preview embutido de arquivos (v1: abre/baixa o arquivo pela URL do blob).
- Editor WYSIWYG completo — o editor é textarea markdown com toolbar de atalhos.
- Busca por conteúdo (v1 busca só por título).

## Decisions

### D1 — Armazenamento de arquivos: Vercel Blob com upload direto do cliente
O app roda na Vercel e não tem nenhuma infra de arquivos. **`@vercel/blob`** é a opção de menor atrito (token via env, SDK oficial, URLs públicas servidas por CDN).

Upload **direto do cliente** (`upload()` de `@vercel/blob/client` + route handler `POST /api/documentos/upload` com `handleUpload`), porque server actions têm limite de body (~1 MB por padrão) e 25 MB via action exigiria elevar `serverActions.bodySizeLimit` e trafegar o arquivo pela função. No `onBeforeGenerateToken` do handler: exigir sessão, validar MIME permitido e `maximumSizeInBytes: 25 MB`. Após o upload, o cliente chama a server action `createFileDocument` com a URL/metadata retornadas.

*Alternativas consideradas*: bytea no Postgres (simples, mas incha o banco e passa pelo limite de body das actions); S3 direto (mais setup/credenciais sem ganho para o caso); filesystem local (não funciona na Vercel).

*Consequência dev local*: requer `BLOB_READ_WRITE_TOKEN` no `.env` (token do store de Blob do projeto Vercel — funciona local também).

### D2 — Markdown: armazenar markdown puro, renderizar com `react-markdown`
`document.body` guarda **markdown texto puro**. O editor é um `<textarea>` monospace com toolbar (B, I, H2, lista) que insere/enrola sintaxe na seleção — sem contentEditable, sem estado de editor. A renderização no leitor usa **`react-markdown`** (+ `remark-gfm` para listas/links GFM), que não usa `dangerouslySetInnerHTML` e é seguro por padrão contra HTML injetado; estilização via classes nos `components` do react-markdown usando os tokens do app (sem plugin de typography).

*Alternativas consideradas*: Tiptap/ProseMirror (WYSIWYG real, mas dependência pesada e estado complexo para uma toolbar de 4 botões); `marked` + `dompurify` (exige sanitização manual e `dangerouslySetInnerHTML`); parser próprio (subconjunto frágil, "Markdown suportado" ficaria mentira).

### D3 — Título de link: server action com fetch defensivo
`fetchLinkTitle(url)` — server action que valida protocolo `http(s)`, faz `fetch` com timeout (~5 s), lê no máximo ~64 KB do HTML e extrai `<title>` (regex, decodificando entidades básicas). Falhou/sem título → retorna null e o usuário digita o título manualmente (campo sempre editável). Mitigação básica de SSRF: recusar hostnames que resolvem para IP privado/loopback não é trivial sem dependência; v1 valida protocolo + bloqueia `localhost`/IP literal privado no hostname, e o risco residual é aceitável para ferramenta interna autenticada (documentar em Risks).

### D4 — Modelo de dados (Drizzle, padrões do schema atual)
Tabelas em `src/db/schema.ts`, nomes DB em snake_case inglês, ids `text` com `crypto.randomUUID()`, timestamps `defaultNow()` / `$onUpdate`:

```
document_folder: id, product_id (FK cascade), name, created_at
  índice product_id; unique (product_id, name)

document: id, product_id (FK cascade), folder_id (FK → document_folder, notNull),
  type text ("doc" | "file" | "link"), title,
  body (nullable — doc), file_url/file_name/file_size/mime_type (nullable — file),
  url (nullable — link),
  created_by_id / updated_by_id (FK user, set null), created_at, updated_at
  índices product_id, folder_id

document_event: id, document_id (FK cascade), user_id (FK user, set null),
  action text ("created" | "edited" | "moved"), detail text nullable
  (nome da pasta destino quando moved), created_at
```

`folder_id` com `onDelete: "restrict"` — excluir pasta não é fluxo da v1; se implementado depois, exigirá mover/excluir docs antes. Eventos seguem o modelo `accessEvent` do cofre (ações em inglês no banco, rótulos pt-BR na UI: "criou", "editou", "moveu para <pasta>").

### D5 — Rotas e composição de páginas
- `src/app/produtos/[code]/documentos/page.tsx` — server component: carrega produto + pastas + documentos (com relações de usuário), renderiza `<ProductHeader active="documentos" />` + `<DocumentsTab>` (client). Tab nova no array de `product-header.tsx` com contador; união `active` vira `"cards" | "acessos" | "documentos"`. As páginas Cards/Acessos passam a precisar do count de docs para o badge da tab (mesmo padrão do count atual das outras tabs).
- `src/app/produtos/[code]/documentos/[docId]/page.tsx` — leitor (só `type = "doc"`; outros tipos redirecionam para a lista). Server component renderiza o markdown; edição abre o mesmo modal/editor client-side.
- Actions em `src/app/produtos/[code]/documentos/actions.ts`; upload route handler em `src/app/api/documentos/upload/route.ts`.

### D6 — UI: reuso máximo dos padrões existentes
- Modal "Novo documento": overlay hand-rolled (padrão `new-product-modal.tsx`), `SegmentedControl` para as 3 abas, `Button`/`Input`/`IconButton` existentes.
- Lista: padrão de busca client-side do `access-tab.tsx` (`useState` + `useMemo`), grupos colapsáveis com estado local; `formatRelative` para "Atualizado há X"; `Avatar` + `initialsOf` para o editor.
- Menu "…" do leitor (mover/renomear/excluir): pequeno popover hand-rolled (não existe dropdown genérico; criar um componente local simples com `useState` + click-outside, sem lib).
- Cores por tipo via classes/estilos locais: doc `#8b93ec`, file `#e2b13c`, link `#4cb782` (conferir se a referência HTML usa tokens já existentes antes de hardcodear).

### D7 — Comportamento de clique por tipo
- `doc` → navega ao leitor (`<Link>`).
- `file` → `<a href={fileUrl} target="_blank">` (CDN do Blob; browser decide preview/download).
- `link` → `<a href={url} target="_blank" rel="noopener noreferrer">`.

## Risks / Trade-offs

- [SSRF no fetch de título] → validação de protocolo + bloqueio de localhost/IPs privados literais, timeout e cap de leitura; ferramenta interna autenticada, risco residual aceito e documentado (D3).
- [Upload client-side depende de `BLOB_READ_WRITE_TOKEN` em dev] → documentar no `.env.example`/memória de dev; sem o token, a aba funciona e só o formato "arquivo" falha com erro claro.
- [Arquivos órfãos no Blob (upload concluído mas action de criação falha/abandonada)] → aceito na v1; ao excluir documento `file`, chamar `del(fileUrl)` para não vazar no caminho comum.
- [Next 16 com breaking changes vs. conhecimento de treino] → tarefa explícita de ler `node_modules/next/dist/docs/` (route handlers, server actions, revalidate) antes de codar.
- [`unique (product_id, name)` em pastas pode colidir na criação inline] → tratar `isUniqueViolation` retornando `{ error }` amigável, como já se faz em produtos.
- [Markdown de usuários renderizado no leitor] → `react-markdown` sem HTML bruto (HTML em markdown é ignorado por padrão), sem `dangerouslySetInnerHTML`.

## Migration Plan

1. Migração Drizzle aditiva (3 tabelas novas; nada existente muda) — `drizzle-kit generate` + aplicar.
2. Deploy normal; feature é uma rota nova, sem flag. Rollback = reverter deploy (tabelas ficam, vazias e inofensivas).
3. Criar o store de Vercel Blob no projeto e configurar `BLOB_READ_WRITE_TOKEN` (prod + dev) antes de liberar o formato "arquivo".

## Open Questions

- Excluir **pasta** ficou fora da v1 (spec não menciona) — confirmar se ok.
- "Renomear" no menu "…" do leitor: v1 implementa como edição do título no mesmo editor? (spec lista renomear como item de menu; implementaremos um mini-modal de renomear para não abrir o editor inteiro).
