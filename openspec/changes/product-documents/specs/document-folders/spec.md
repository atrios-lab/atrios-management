# document-folders — Pastas de documentos do produto

## ADDED Requirements

### Requirement: Criar pasta pela toolbar
O sistema SHALL permitir criar uma pasta com nome livre em um produto, a partir do botão "Nova pasta" na toolbar da aba Documentos, via mini-modal contendo apenas o campo nome.

#### Scenario: Criação bem-sucedida
- **WHEN** o usuário clica em "Nova pasta", digita "Estratégia" e confirma
- **THEN** a pasta é criada para o produto e aparece como grupo (vazio) na lista de documentos

#### Scenario: Nome duplicado no mesmo produto
- **WHEN** o usuário tenta criar uma pasta com nome já existente naquele produto
- **THEN** o sistema recusa e exibe mensagem de erro inline, sem criar duplicata

#### Scenario: Nome vazio
- **WHEN** o usuário confirma com o nome em branco
- **THEN** o sistema recusa e mantém o mini-modal aberto com erro

### Requirement: Criar pasta inline no select do modal
O select de pasta do modal "Novo documento" SHALL listar as pastas existentes do produto e oferecer uma opção de criar pasta nova inline, em todas as três abas (Escrever, Enviar arquivo, Link).

#### Scenario: Criação inline durante novo documento
- **WHEN** o usuário abre o select de pasta no modal, escolhe a opção de criar nova pasta e informa o nome
- **THEN** a pasta é criada e fica selecionada como destino do documento sendo criado

### Requirement: Todo documento pertence a uma pasta
Todo documento SHALL pertencer a exatamente uma pasta do mesmo produto (`folderId` obrigatório); a criação de documento sem pasta selecionada MUST ser recusada.

#### Scenario: Tentativa de criar documento sem pasta
- **WHEN** o usuário tenta confirmar o modal "Novo documento" sem pasta selecionada
- **THEN** o sistema exibe erro de validação e não cria o documento

### Requirement: Mover documento entre pastas
O sistema SHALL permitir mover um documento para outra pasta do mesmo produto pelo menu "…" do documento, registrando um evento de atividade "moveu para <pasta>".

#### Scenario: Mover pelo menu do leitor
- **WHEN** o usuário abre o menu "…" de um documento, escolhe "Mover de pasta" e seleciona a pasta "Contratos"
- **THEN** o documento passa a aparecer no grupo "Contratos" e a timeline de atividade registra "moveu para Contratos" com autor e data
