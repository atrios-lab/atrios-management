# autoavaliacao-equipe — Link de autoavaliação (lado da equipe)

## ADDED Requirements

### Requirement: Gerar link de autoavaliação para um diagnóstico
O sistema SHALL permitir a um membro autenticado gerar, a partir da página de um diagnóstico com `statusFunil` "novo" ou "em_andamento", um link único `/autoavaliacao/<token>` com token secreto de pelo menos 256 bits e validade de 30 dias. Cada diagnóstico MUST ter no máximo um link ativo por vez.

#### Scenario: Geração a partir do roteiro de entrevista
- **WHEN** o membro clica em "Gerar link para a serventia" num diagnóstico em andamento sem link
- **THEN** o sistema cria o registro de autoavaliação com token e validade, e exibe a URL absoluta com botão de copiar

#### Scenario: Geração a partir de um lead do pré-cadastro
- **WHEN** o membro clica em "Gerar link para a serventia" num lead com status "novo" e sem classe
- **THEN** o link é gerado normalmente e o lead permanece "novo" até a serventia declarar o enquadramento

#### Scenario: Diagnóstico já concluído
- **WHEN** o membro tenta gerar link para um diagnóstico com status diferente de "novo" ou "em_andamento"
- **THEN** o sistema recusa com mensagem "Reabra o diagnóstico para gerar o link"

#### Scenario: Sem sessão
- **WHEN** a action de gerar link é chamada sem sessão válida
- **THEN** o sistema recusa com "Sessão expirada" e nada é criado

### Requirement: Compartilhar o link com o contato da serventia
A UI SHALL oferecer, junto ao link gerado, um botão que abre o WhatsApp do contato do diagnóstico (`contatoWhatsapp`) com mensagem pronta citando o nome da serventia e contendo a URL. Quando o diagnóstico não tem WhatsApp de contato, o botão MUST ficar oculto e apenas "Copiar link" permanece.

#### Scenario: Contato com WhatsApp
- **WHEN** o diagnóstico tem `contatoWhatsapp` e o membro clica em "Abrir WhatsApp do contato"
- **THEN** abre-se `wa.me/55<dígitos>` em nova aba com texto pré-preenchido que inclui a URL do link

#### Scenario: Contato sem WhatsApp
- **WHEN** o diagnóstico não tem `contatoWhatsapp`
- **THEN** só o botão "Copiar link" é exibido

### Requirement: Estado do link visível para a equipe
O sistema SHALL exibir, no diagnóstico, o estado do link derivado dos dados: `não gerado`, `não iniciado`, `aberto` (serventia iniciou), `enviado`, `expirado` ou `revogado`, junto com quem respondeu (nome, cargo, contato) e as datas de início e envio quando existirem.

#### Scenario: Serventia em preenchimento
- **WHEN** a serventia já se identificou mas não enviou
- **THEN** o estado exibido é "Aberto", com nome/cargo do respondente, data de início e contagem "X de Y respondidas"

#### Scenario: Link vencido
- **WHEN** a data atual é posterior a `expira_em` e não houve envio
- **THEN** o estado exibido é "Expirado" e a ação "Gerar novo link" fica disponível

### Requirement: Regenerar e revogar o link
O sistema SHALL permitir regenerar o link (novo token e nova validade, invalidando o anterior, sem apagar respondente nem respostas já gravadas) e revogar o link (nenhum acesso público até nova geração).

#### Scenario: Regenerar link existente
- **WHEN** o membro confirma "Gerar novo link" num diagnóstico que já tem link
- **THEN** o token anterior deixa de abrir a página pública, o novo abre, e o progresso da serventia continua o mesmo

#### Scenario: Revogar
- **WHEN** o membro clica em "Revogar"
- **THEN** o token atual passa a responder como link inválido e o estado exibido vira "Revogado"

### Requirement: Recebimento da autoavaliação na ferramenta interna
Quando a serventia envia as respostas, o sistema SHALL notificar a equipe por e-mail (destino `LEAD_NOTIFY_EMAIL`) e via realtime no canal de diagnósticos, e o roteiro de entrevista MUST exibir uma faixa "Autoavaliação recebida por <nome> (<cargo>) em <data>" com as respostas da serventia já marcadas. O diagnóstico MUST permanecer "em_andamento" até a equipe concluir.

#### Scenario: Envio pela serventia
- **WHEN** a serventia clica em "Enviar respostas" com tudo respondido
- **THEN** a equipe recebe e-mail com serventia, respondente e link interno do diagnóstico, a lista de diagnósticos atualiza em tempo real, e o status do diagnóstico continua "em_andamento"

#### Scenario: Equipe conclui após revisar
- **WHEN** a equipe abre o roteiro, ajusta respostas se necessário e clica em "Concluir diagnóstico"
- **THEN** o score é calculado e o diagnóstico passa a "concluido" exatamente como no fluxo atual

### Requirement: Lead sai de "Novo" quando a serventia declara o enquadramento
Quando a serventia grava classe e modelo de solução por um link de um diagnóstico com `statusFunil = "novo"`, o sistema SHALL mudar o status para "em_andamento" e registrar `enquadramento_declarado_em`.

#### Scenario: Lead declara enquadramento
- **WHEN** a serventia salva a etapa "Sobre o cartório" num lead "novo"
- **THEN** o diagnóstico passa a "em_andamento", ganha classe/modelo, sai da fila de leads e aparece na lista principal com indicação "Classe declarada pela serventia"

### Requirement: Rota pública liberada sem sessão
A rota `/autoavaliacao/*` SHALL ser alcançável sem cookie de sessão; todas as demais rotas mantêm a proteção atual.

#### Scenario: Visitante sem sessão
- **WHEN** um visitante sem sessão acessa `/autoavaliacao/<token>`
- **THEN** a página responde normalmente (200 ou 404 conforme o token), sem redirecionar para `/login`
