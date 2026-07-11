## ADDED Requirements

### Requirement: Publicação de eventos nas mutações
Toda server action que grava dados compartilhados (produtos/cards, cofre, time, diagnósticos, documentos) SHALL publicar um evento de mudança no barramento (Postgres `NOTIFY`) após a gravação bem-sucedida, contendo canal, tipo do evento e identificadores mínimos do recurso afetado (não o payload completo).

#### Scenario: Mutação publica evento
- **WHEN** um usuário move um card via `setCardStatus`
- **THEN** após o commit no banco, um evento `card.updated` é publicado no canal do produto correspondente

#### Scenario: Mutação com erro não publica evento
- **WHEN** uma server action falha antes de gravar no banco
- **THEN** nenhum evento é publicado

#### Scenario: Falha na publicação não quebra a mutação
- **WHEN** a gravação no banco tem sucesso mas o `NOTIFY` falha
- **THEN** a server action ainda retorna sucesso ao usuário e o erro de publicação é apenas logado

### Requirement: Endpoint SSE autenticado por canal
O sistema SHALL expor um endpoint SSE (`GET /api/realtime?channel=<canal>`) que valida a sessão better-auth antes de abrir o stream e transmite ao cliente apenas os eventos do canal assinado.

#### Scenario: Cliente autenticado assina um canal
- **WHEN** um usuário logado abre `GET /api/realtime?channel=product:abc`
- **THEN** a resposta é um stream `text/event-stream` que entrega os eventos publicados nesse canal

#### Scenario: Cliente sem sessão é rejeitado
- **WHEN** uma requisição sem sessão válida acessa `/api/realtime`
- **THEN** o endpoint responde 401 e nenhum stream é aberto

#### Scenario: Eventos de outros canais não vazam
- **WHEN** um cliente assina o canal `product:abc` e um evento é publicado em `product:xyz`
- **THEN** o cliente não recebe esse evento

### Requirement: Assinatura no cliente com reconexão
O cliente SHALL assinar o endpoint SSE via hook `useRealtime(channel, onEvent)` que reconecta automaticamente após queda ou encerramento do stream (inclusive o encerramento periódico imposto pelo limite de duração da function) sem intervenção do usuário.

#### Scenario: Reconexão automática após queda
- **WHEN** o stream SSE é encerrado pelo servidor ou pela rede
- **THEN** o cliente reconecta automaticamente com backoff e volta a receber eventos

#### Scenario: Aba em segundo plano retoma dados atuais
- **WHEN** a aba volta ao primeiro plano após período sem conexão
- **THEN** o cliente ressincroniza (refresh dos dados) para cobrir eventos perdidos durante a desconexão

### Requirement: Telas assinantes atualizam sem reload
Telas que exibem dados compartilhados (cofre, time, diagnósticos, documentos) SHALL atualizar seus dados automaticamente (via `router.refresh()`) ao receber evento do seu canal, sem o usuário recarregar a página.

#### Scenario: Outro usuário cria um acesso no cofre
- **WHEN** o usuário A está na tela do cofre e o usuário B cria um novo acesso
- **THEN** a lista do usuário A é atualizada em poucos segundos sem reload manual

### Requirement: Ações próprias não causam eco visível
O sistema SHALL evitar que o autor de uma mutação tenha sua UI degradada pelo próprio evento (flicker, sobrescrita de estado otimista): eventos originados pelo próprio cliente são ignorados ou mesclados de forma idempotente.

#### Scenario: Autor move card e recebe o próprio evento
- **WHEN** o usuário move um card e o evento correspondente retorna via SSE
- **THEN** a UI do autor permanece consistente, sem flicker nem duplicação
