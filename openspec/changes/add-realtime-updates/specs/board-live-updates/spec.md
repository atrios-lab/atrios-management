## ADDED Requirements

### Requirement: Board reflete mudanças de outros usuários em tempo real
O board de produtos SHALL aplicar eventos de card (criação, movimentação de status, edição, arquivamento) recebidos via realtime ao seu estado local, de modo que mudanças feitas por outros usuários apareçam sem reload da página.

#### Scenario: Outro usuário move um card
- **WHEN** o usuário A está com o board do produto aberto e o usuário B move um card de `todo` para `progress`
- **THEN** o card muda de coluna na tela do usuário A em poucos segundos, sem reload

#### Scenario: Outro usuário cria um card
- **WHEN** o usuário B cria um card no produto que o usuário A está visualizando
- **THEN** o novo card aparece na coluna correta do board do usuário A

#### Scenario: Outro usuário arquiva um card
- **WHEN** o usuário B arquiva um card visível no board do usuário A
- **THEN** o card é removido do board do usuário A

### Requirement: Merge não interrompe interação local em andamento
A aplicação de eventos remotos SHALL preservar a interação local em andamento: um drag em progresso e o estado otimista de uma mutação pendente do próprio usuário não são sobrescritos por eventos remotos.

#### Scenario: Evento remoto chega durante um drag
- **WHEN** o usuário A está arrastando um card e um evento remoto de outro card chega
- **THEN** o drag do usuário A continua normalmente e o outro card é atualizado

#### Scenario: Evento remoto sobre o mesmo card com mutação pendente
- **WHEN** o usuário A tem uma mutação otimista pendente sobre um card e chega evento remoto sobre o mesmo card
- **THEN** o estado do servidor prevalece após a resolução da mutação, sem o card "pular" durante a transição

### Requirement: Conflito resolvido pelo último estado do servidor
Quando dois usuários alteram o mesmo card, o board SHALL convergir para o estado registrado no servidor (última gravação vence), em todas as telas conectadas.

#### Scenario: Dois usuários movem o mesmo card
- **WHEN** os usuários A e B movem o mesmo card para colunas diferentes quase ao mesmo tempo
- **THEN** ambos os boards convergem para a coluna da última gravação no servidor
