# document-reader — Leitor de documento escrito

## ADDED Requirements

### Requirement: Página do leitor
Documentos `type = doc` SHALL ter página de leitura própria com breadcrumb `<Produto> › Documentos › <Título>`, botão "Editar" e menu "…" (mover de pasta, renomear, excluir). O corpo (coluna central, máx. 640px) SHALL exibir badge da pasta, título em H1, linha meta ("Editado há X por <nome> · criado em <data> por <nome>") e o conteúdo markdown renderizado (títulos, parágrafos, listas, negrito, itálico).

#### Scenario: Abrir leitor a partir da lista
- **WHEN** o usuário clica numa linha de tipo doc
- **THEN** o leitor abre com breadcrumb, badge da pasta, título, meta de edição/criação e conteúdo renderizado

#### Scenario: Tipos não-doc não têm leitor
- **WHEN** uma URL de leitor é acessada para um documento de tipo file ou link
- **THEN** o sistema redireciona para a lista de documentos do produto

### Requirement: Painel lateral de metadados e atividade
O leitor SHALL exibir painel lateral direito (264px) com: pasta, criado por (avatar, nome, data), última edição e timeline de atividade com os eventos do documento (avatar, ação em pt-BR — "criou", "editou", "moveu para <pasta>" — e tempo relativo).

#### Scenario: Timeline após criação e edição
- **WHEN** um documento foi criado por A e depois editado por B
- **THEN** o painel mostra a timeline com "A criou" e "B editou", cada um com avatar e tempo relativo, além dos blocos de pasta, criado por e última edição

### Requirement: Editar documento
O botão "Editar" SHALL abrir o mesmo editor do modal de criação (título, pasta, conteúdo markdown) com os dados carregados. Salvar SHALL atualizar o documento, `updatedBy`/`updatedAt` e registrar evento "editou".

#### Scenario: Edição salva
- **WHEN** o usuário edita o conteúdo e salva
- **THEN** o leitor volta a exibir o conteúdo atualizado, a meta reflete o novo editor/data e a timeline ganha o evento "editou"

### Requirement: Renomear documento
O menu "…" SHALL oferecer "Renomear", que permite alterar apenas o título do documento.

#### Scenario: Renomear pelo menu
- **WHEN** o usuário escolhe "Renomear", informa novo título e confirma
- **THEN** o título é atualizado no leitor, na lista e no breadcrumb

### Requirement: Excluir documento
O menu "…" SHALL oferecer "Excluir" com confirmação. A exclusão MUST remover o documento e seus eventos; para documentos `type = file` acessados por menus equivalentes na lista, o arquivo no storage MUST ser removido junto.

#### Scenario: Excluir doc escrito
- **WHEN** o usuário confirma a exclusão no leitor
- **THEN** o documento some da lista e o usuário é levado de volta à aba Documentos do produto
