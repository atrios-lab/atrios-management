# document-library — Aba Documentos: lista e criação

## ADDED Requirements

### Requirement: Aba Documentos na página do produto
A página do produto SHALL exibir uma terceira aba "Documentos" (rota `/produtos/[code]/documentos`), com badge contando os documentos do produto, ao lado das abas Cards e Acessos.

#### Scenario: Navegar para a aba
- **WHEN** o usuário clica na aba "Documentos" de um produto
- **THEN** a rota da aba carrega mantendo sidebar, breadcrumb `Produtos › <nome>` e header do produto, com a aba marcada como ativa e o contador de documentos visível

### Requirement: Lista agrupada por pasta
A aba SHALL listar os documentos agrupados por pasta, cada grupo com header colapsável (chevron, ícone de pasta, nome, badge de contagem) seguido das linhas de documentos. Pastas sem documentos aparecem como grupos vazios.

#### Scenario: Colapsar grupo
- **WHEN** o usuário clica no header de um grupo expandido
- **THEN** as linhas do grupo são ocultadas e o chevron muda de orientação; clicar de novo expande

### Requirement: Linha de documento
Cada linha SHALL exibir: ícone conforme o tipo (doc roxo `#8b93ec`, arquivo âmbar `#e2b13c`, link verde `#4cb782`), título, badge do tipo ("Doc" | "<EXT> · <tamanho>" p.ex. "PDF · 2,4 MB" | domínio do link p.ex. "notion.so"), "Atualizado há X" relativo, avatar de quem editou por último e chevron.

#### Scenario: Linha de arquivo PDF
- **WHEN** a lista contém um documento tipo arquivo PDF de 2,4 MB
- **THEN** a linha mostra o ícone âmbar de clipe, o badge "PDF · 2,4 MB", o tempo relativo da última atualização e o avatar do último editor

### Requirement: Ação de clique por tipo
Clicar numa linha SHALL: para `doc`, navegar ao leitor do documento; para `file`, abrir o arquivo (preview/download) em nova aba; para `link`, abrir a URL externa em nova aba.

#### Scenario: Clique em link externo
- **WHEN** o usuário clica numa linha de tipo link
- **THEN** a URL abre em nova aba e nenhuma navegação ocorre dentro do Átrios

### Requirement: Busca por título
A toolbar SHALL ter campo de busca ("Buscar documento…") que filtra as linhas por título (case-insensitive), mantendo o agrupamento por pasta e ocultando grupos sem resultados.

#### Scenario: Busca com resultados em uma pasta
- **WHEN** o usuário digita um termo que casa com títulos de apenas uma pasta
- **THEN** só essa pasta aparece, contendo só as linhas que casam; limpar a busca restaura a lista completa

### Requirement: Estado vazio
Quando o produto não tem nenhum documento, a aba SHALL exibir estado vazio com ícone, título "Nenhum documento ainda", texto explicando os três formatos e botões "Novo documento" (primário) e "Nova pasta" (secundário).

#### Scenario: Produto sem documentos
- **WHEN** o usuário abre a aba Documentos de um produto sem documentos
- **THEN** o estado vazio é exibido no lugar da lista, e "Novo documento" abre o modal de criação

### Requirement: Modal "Novo documento" com três formatos
O botão "Novo documento" SHALL abrir um modal único com três abas segmentadas — Escrever, Enviar arquivo e Link — cada uma com select de pasta.

#### Scenario: Alternar abas preserva a pasta selecionada
- **WHEN** o usuário seleciona uma pasta na aba Escrever e alterna para a aba Link
- **THEN** o modal troca o formulário exibido e a pasta selecionada é mantida

### Requirement: Criar documento escrito
A aba Escrever SHALL ter campo Título, select de Pasta e editor de conteúdo markdown com toolbar mínima (negrito, itálico, H2, lista) e nota "Markdown suportado". Confirmar SHALL criar o documento (`type = doc`), registrar evento "criou" e navegar ao leitor do documento criado.

#### Scenario: Criação e redirecionamento
- **WHEN** o usuário preenche título, pasta e conteúdo e clica em "Criar documento"
- **THEN** o documento é criado com autor e data, um evento "criou" é registrado e o usuário é levado ao leitor do novo documento

#### Scenario: Título obrigatório
- **WHEN** o usuário confirma sem título
- **THEN** o sistema exibe erro de validação e não cria o documento

### Requirement: Enviar arquivo
A aba Enviar arquivo SHALL ter dropzone (arrastar ou clicar para escolher) aceitando PDF, planilha ou imagem até 25 MB. Após a escolha, SHALL exibir card com ícone, nome e tamanho do arquivo e ação de remover. Confirmar SHALL subir o arquivo para o storage, criar o documento (`type = file`) com metadados (`fileUrl`, `fileName`, `fileSize`, `mimeType`) e voltar à lista com o arquivo visível na pasta escolhida.

#### Scenario: Upload dentro do limite
- **WHEN** o usuário solta um PDF de 3 MB na dropzone, escolhe a pasta e confirma
- **THEN** o arquivo é armazenado, o documento aparece na pasta escolhida e o modal fecha

#### Scenario: Arquivo acima de 25 MB
- **WHEN** o usuário escolhe um arquivo maior que 25 MB
- **THEN** o sistema recusa antes do upload e exibe mensagem indicando o limite

#### Scenario: Tipo de arquivo não permitido
- **WHEN** o usuário escolhe um arquivo que não é PDF, planilha nem imagem
- **THEN** o sistema recusa com mensagem indicando os formatos aceitos

### Requirement: Adicionar link externo
A aba Link SHALL ter campo de URL (monospace); ao colar/informar uma URL válida, o sistema SHALL buscar o `<title>` da página e exibir card de preview com o título importado (editável) e o domínio, com nota informando que o link abre em nova aba e nada é copiado para o Átrios. Confirmar SHALL criar o documento (`type = link`).

#### Scenario: Título importado automaticamente
- **WHEN** o usuário cola uma URL cuja página tem `<title>` acessível
- **THEN** o card de preview aparece com o título importado e o domínio, e o título pode ser editado antes de criar

#### Scenario: Falha ao importar título
- **WHEN** o fetch do título falha (timeout, página inacessível ou sem `<title>`)
- **THEN** o sistema permite informar o título manualmente e a criação segue normalmente

#### Scenario: URL inválida
- **WHEN** o usuário informa algo que não é URL http(s) válida
- **THEN** o sistema exibe erro de validação e não tenta o fetch

### Requirement: Autoria e autenticação
Toda criação/edição de documento e pasta MUST exigir sessão autenticada e registrar autor (`createdBy`/`updatedBy`) e timestamps.

#### Scenario: Ação sem sessão
- **WHEN** uma server action de documentos é chamada sem sessão válida
- **THEN** a ação é recusada sem efeito no banco
