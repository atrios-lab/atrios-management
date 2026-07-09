# Proposal — Documentos do Produto

## Why

O conhecimento de cada produto (modelo de negócio, contratos, specs, análises) hoje vive espalhado em Notion, drives e conversas — nada disso fica ligado ao produto dentro do Átrios. Uma aba **Documentos** na página do produto centraliza esse conhecimento em três formatos (doc escrito na ferramenta, arquivo enviado, link externo), organizados em pastas livres, ao lado das abas Cards e Acessos que já existem.

## What Changes

- Nova aba **Documentos** na página do produto (`/produtos/[code]/documentos`), com contador de docs, seguindo o padrão de tabs por rota de Cards/Acessos.
- Novas tabelas: `folder` (pastas livres por produto), `document` (três tipos: `doc` | `file` | `link`) e `documentEvent` (timeline de atividade: criou / editou / moveu de pasta), no padrão do schema Drizzle existente.
- **Lista de documentos** agrupada por pasta (grupos colapsáveis), com busca por título, ícone/cor por tipo, badge de tipo, "Atualizado há X" e avatar do último editor. Estado vazio quando o produto não tem documentos.
- **Modal "Novo documento"** com 3 abas segmentadas: Escrever (editor markdown com toolbar B/I/H2/lista), Enviar arquivo (dropzone, PDF/planilha/imagem até 25 MB) e Link (fetch automático do `<title>` da página). Select de pasta com criação inline em todas as abas.
- **Leitor de documento** (só `type = doc`): corpo central renderizando markdown, painel lateral com pasta, criado por, última edição e timeline de atividade; ações de editar, mover de pasta, renomear e excluir.
- **Nova pasta** pela toolbar (mini-modal com nome).
- Novas dependências de infraestrutura: armazenamento de arquivos (o app não tem nenhum hoje) e renderização de markdown (nenhuma lib presente) — escolhas detalhadas no design.

## Capabilities

### New Capabilities

- `document-folders`: pastas livres por produto — criação (toolbar e inline no select do modal), agrupamento da lista, mover documento entre pastas.
- `document-library`: aba Documentos — lista agrupada por pasta, busca, estado vazio, contador na tab, e criação de documentos nos três formatos via modal (Escrever / Enviar arquivo / Link).
- `document-reader`: leitor de documento escrito — renderização do conteúdo, edição, renomear/excluir, metadados e timeline de atividade.

### Modified Capabilities

(nenhuma — `openspec/specs/` está vazio; não há requisitos existentes a alterar)

## Impact

- **Schema/DB**: novas tabelas `folder`, `document`, `documentEvent` em `src/db/schema.ts` + migração Drizzle.
- **Rotas**: nova rota `src/app/produtos/[code]/documentos/page.tsx`; `product-header.tsx` ganha a terceira tab (união `active` ampliada para `"documentos"`).
- **Server actions**: novo `src/app/produtos/[code]/documentos/actions.ts` (CRUD de pastas e documentos, upload, fetch de título de link, eventos de atividade), no padrão `requireSession` → validação → `db` → `revalidatePath`.
- **Dependências novas**: solução de upload/armazenamento de arquivos (ex.: Vercel Blob — app roda na Vercel) e renderizador de markdown; nenhuma existe no projeto hoje.
- **UI**: reusa `Button`, `Input`, `IconButton`, `Avatar`, `SegmentedControl`, padrão de modal hand-rolled e `formatRelative` ("há X dias") já existentes. Referência visual: `Átrios Documentos (standalone).html` (telas 17–19).
