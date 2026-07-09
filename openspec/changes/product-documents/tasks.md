# Tasks — Documentos do Produto

## 1. Preparação

- [x] 1.1 Ler os guias relevantes do Next 16 em `node_modules/next/dist/docs/` (route handlers, server actions, revalidatePath, params assíncronos) — AGENTS.md avisa que há breaking changes
- [x] 1.2 Abrir `reference-atrios-documentos.html` (neste diretório) e mapear as telas 17a/17b/18a–c/19 para os tokens visuais já usados no app; conferir se as cores por tipo (#8b93ec/#e2b13c/#4cb782) já existem como tokens
- [x] 1.3 Instalar dependências: `@vercel/blob`, `react-markdown`, `remark-gfm`; configurar `BLOB_READ_WRITE_TOKEN` no `.env` local (e anotar em `.env.example` se existir)

## 2. Schema e dados

- [x] 2.1 Adicionar `documentFolder`, `document` e `documentEvent` em `src/db/schema.ts` conforme D4 do design (ids uuid, FKs, índices, unique `(product_id, name)` em pasta, `folder_id` restrict) + `relations`
- [x] 2.2 Gerar migração com `drizzle-kit generate`, aplicar no banco local e conferir com o seed (`npm run db:seed` não deve quebrar)

## 3. Server actions e upload

- [x] 3.1 Criar `src/app/produtos/[code]/documentos/actions.ts` com `createFolder`, `createDocDocument`, `createFileDocument`, `createLinkDocument` — todas no padrão `requireSession` → validação → db → `revalidatePath`, retornando `{ error? }`; registrar evento "created" na criação
- [x] 3.2 Adicionar `updateDocument` (título/corpo, evento "edited"), `renameDocument`, `moveDocument` (evento "moved" com nome da pasta destino em `detail`) e `deleteDocument` (apaga eventos junto; se `type = file`, `del(fileUrl)` no Blob)
- [x] 3.3 Implementar `fetchLinkTitle(url)` com validação http(s), bloqueio de localhost/IP privado literal, timeout ~5s e cap de leitura ~64KB (D3)
- [x] 3.4 Criar route handler `src/app/api/documentos/upload/route.ts` com `handleUpload` do `@vercel/blob/client`: exigir sessão, validar MIME (PDF, planilhas, imagens) e `maximumSizeInBytes` 25 MB (D1)

## 4. Aba Documentos (lista)

- [x] 4.1 Adicionar a tab "Documentos" em `product-header.tsx` (ampliar união `active`, contador de docs) e passar o count nas três páginas de aba
- [x] 4.2 Criar `src/app/produtos/[code]/documentos/page.tsx` (server component): carregar produto, pastas e documentos com nomes dos usuários, renderizar header + `DocumentsTab`
- [x] 4.3 Implementar `DocumentsTab` (client): toolbar (busca, "Nova pasta", "Novo documento"), grupos colapsáveis por pasta com badge de contagem, linha de documento (ícone/cor por tipo, título, badge de tipo com tamanho/domínio, `formatRelative`, avatar, chevron)
- [x] 4.4 Implementar comportamento de clique por tipo (doc → leitor; file/link → nova aba) e busca por título mantendo agrupamento (ocultar grupos sem match)
- [x] 4.5 Implementar estado vazio (17b) com botões que abrem o modal/mini-modal
- [x] 4.6 Implementar mini-modal "Nova pasta" (nome + validação de duplicata via `isUniqueViolation`)

## 5. Modal "Novo documento"

- [x] 5.1 Estrutura do modal (~580px) com `SegmentedControl` de 3 abas e select de Pasta compartilhado (pastas existentes + criação inline), preservando a pasta ao alternar abas
- [x] 5.2 Aba Escrever: título + pasta lado a lado (1fr/200px), textarea markdown com toolbar B/I/H2/lista (inserção de sintaxe na seleção), nota "Markdown suportado", rodapé com "Criar documento"; ao criar, navegar ao leitor
- [x] 5.3 Aba Enviar arquivo: dropzone (drag & drop + file picker) com validação client-side de tipo e 25 MB, card do arquivo escolhido com remover; ao confirmar, upload via `@vercel/blob/client` + `createFileDocument`; voltar à lista
- [x] 5.4 Aba Link: campo URL monospace, fetch do título ao colar (com estado de loading), card de preview com título editável + domínio, nota "abre em nova aba"; criação via `createLinkDocument`

## 6. Leitor de documento

- [x] 6.1 Criar `src/app/produtos/[code]/documentos/[docId]/page.tsx`: só `type = doc` (senão redirect à lista); breadcrumb, badge da pasta, H1, linha meta, corpo central máx 640px com `react-markdown` + `remark-gfm` estilizado pelos tokens do app
- [x] 6.2 Painel lateral (264px): pasta, criado por, última edição, timeline de `documentEvent` com avatar + ação pt-BR + tempo relativo
- [x] 6.3 Botão "Editar" abrindo o editor da tarefa 5.2 pré-carregado; salvar → `updateDocument` e refletir no leitor
- [x] 6.4 Menu "…" (popover hand-rolled com click-outside): "Mover de pasta" (lista de pastas), "Renomear" (mini-modal) e "Excluir" (confirmação; volta à aba Documentos)

## 7. Verificação

- [x] 7.1 `npx tsc --noEmit` (ou check do projeto) + Biome sem erros novos
- [x] 7.2 Verificar no browser (preview): fluxos 1–6 da spec — criar doc escrito (vai ao leitor), enviar arquivo (aparece na pasta), adicionar link (título importado, abre em nova aba), nova pasta (grupo vazio), editar doc (evento na timeline), mover de pasta (evento "moveu para X"); estado vazio; busca; colapsar grupos; comparar visual com a referência HTML
