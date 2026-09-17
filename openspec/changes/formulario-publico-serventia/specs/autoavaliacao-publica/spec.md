# autoavaliacao-publica — Formulário público da serventia

## ADDED Requirements

### Requirement: Acesso pelo token
A página `/autoavaliacao/<token>` SHALL abrir o formulário do diagnóstico ligado ao token quando ele existe, não está revogado nem expirado e o diagnóstico está em "novo" ou "em_andamento". Token inexistente, revogado ou expirado MUST resultar em página de link inválido, sem revelar se o token existiu.

#### Scenario: Token válido
- **WHEN** a serventia abre um link válido
- **THEN** vê o cabeçalho com nome da serventia e município/UF e o formulário

#### Scenario: Token inválido ou revogado
- **WHEN** o token não existe ou foi revogado
- **THEN** a página exibe "Este link não é válido. Peça um novo link à Átrios" com o contato da Átrios, e nenhuma action aceita o token

#### Scenario: Token expirado
- **WHEN** a data atual é posterior à validade do link
- **THEN** a página exibe "Este link expirou. Peça um novo link à Átrios"

#### Scenario: Diagnóstico já concluído pela equipe
- **WHEN** o token é válido mas o diagnóstico não está mais em "novo"/"em_andamento"
- **THEN** a página exibe "Suas respostas estão em análise pela Átrios", em modo somente leitura

### Requirement: Identificação de quem responde e consentimento
Antes de responder às perguntas, o formulário SHALL exigir nome de quem responde e ao menos um contato (e-mail válido ou WhatsApp com DDD), com cargo opcional entre Titular, Interino, Escrevente e Outro, e aceite explícito da Política de Privacidade. O sistema MUST gravar data do aceite, versão da política e IP truncado junto ao registro de autoavaliação, e marcar `iniciado_em` na primeira gravação.

#### Scenario: Identificação completa
- **WHEN** a serventia informa nome, WhatsApp válido e marca o aceite
- **THEN** o registro é gravado com `iniciado_em`, `consentimento_em` e versão da política, e o formulário avança para as próximas seções

#### Scenario: Sem contato
- **WHEN** a serventia deixa e-mail e WhatsApp vazios
- **THEN** o formulário mostra "Informe um e-mail ou WhatsApp para contato" e não grava

#### Scenario: Sem aceite
- **WHEN** a serventia não marca a política de privacidade
- **THEN** o formulário mostra o erro no campo de aceite e não grava

#### Scenario: Retomada
- **WHEN** a serventia reabre o mesmo link depois de já ter se identificado
- **THEN** a identificação aparece preenchida e as respostas já dadas aparecem marcadas

### Requirement: Enquadramento declarado pela serventia
Quando o diagnóstico não tem classe, o formulário SHALL exibir a seção "Sobre o cartório" antes das perguntas, pedindo a faixa de receita bruta semestral (três faixas em texto simples, com nota "considere os últimos seis meses") e como funciona o sistema do cartório (modelo de solução em texto simples). Quando o diagnóstico já tem classe, a seção MUST aparecer pré-preenchida e editável. Salvar MUST gravar classe, subclasse (se informada), modelo e `enquadramento_declarado_em` no diagnóstico e recarregar as perguntas aplicáveis.

#### Scenario: Lead sem classe
- **WHEN** a serventia abre um link de diagnóstico sem classe
- **THEN** as perguntas do provimento só aparecem depois de ela salvar a faixa de receita e o modelo de solução

#### Scenario: Faixa inválida
- **WHEN** a action recebe classe fora de {1,2,3} ou modelo fora do catálogo
- **THEN** a gravação é recusada com erro de validação

#### Scenario: Serventia corrige a classe estimada pela equipe
- **WHEN** o diagnóstico tinha classe 2 definida pela equipe e a serventia escolhe a faixa da classe 1
- **THEN** o diagnóstico passa a classe 1 com `enquadramento_declarado_em` preenchido e o conjunto de perguntas é recalculado para a classe 1

### Requirement: Perguntas somente em linguagem simples
O formulário SHALL exibir, para cada requisito aplicável à classe e ao escopo e não dispensado, apenas a `perguntaSimples`, agrupada pelos títulos leigos de etapa (`ETAPAS`/`ETAPAS_ESCOPO`), mais as três perguntas de identidade digital em versão simples. O payload enviado ao cliente MUST conter, por requisito, apenas `id`, `etapa` e `perguntaSimples`; MUST NOT conter `perguntaTecnica`, `refNormativa`, `peso`, `apontamento*`, `roteiroExecucao`, `artefato`, `natureza`, esforços, nem dados de contato do diagnóstico.

#### Scenario: Conteúdo de uma pergunta
- **WHEN** a página renderiza um requisito
- **THEN** aparece só o texto simples, sem "(Anexo IV, ref · peso)", sem pergunta técnica e sem "Como perguntar"

#### Scenario: Requisito dispensado para a classe
- **WHEN** o requisito é dispensado para a classe do diagnóstico (ex.: DPO na Classe 1)
- **THEN** ele não é exibido nem contado no total de perguntas

#### Scenario: Teste de vazamento do payload
- **WHEN** o mapper do payload público é executado sobre requisitos completos
- **THEN** o objeto resultante não possui nenhuma das chaves proibidas (teste automatizado)

### Requirement: Opções de resposta com legenda
Cada pergunta SHALL oferecer Sim, Parcial, Não e Não sei; a seção de perguntas MUST exibir uma legenda fixa explicando cada opção: Sim = já existe e está em uso; Parcial = existe, mas incompleto, desatualizado ou só em parte do cartório; Não = não existe; Não sei = sem problema, a Átrios confirma com você.

#### Scenario: Legenda visível
- **WHEN** a serventia chega à primeira seção de perguntas
- **THEN** a legenda das quatro opções está visível antes da primeira pergunta

### Requirement: Salvamento automático e validação por token
Cada resposta marcada SHALL ser gravada imediatamente pela action pública, que identifica o diagnóstico exclusivamente pelo token e MUST recusar `requisitoId` fora do conjunto aplicável ao diagnóstico e valores fora de {sim, parcial, nao, nao_sei}. A UI SHALL indicar "Salvando…"/"Salvo" e, em falha, manter a marcação com aviso "não salvou, tente de novo".

#### Scenario: Resposta gravada
- **WHEN** a serventia marca "Parcial" numa pergunta
- **THEN** a linha em `resposta` para (diagnóstico, requisito) é criada ou atualizada e o indicador mostra "Salvo"

#### Scenario: Requisito não aplicável
- **WHEN** a action recebe um `requisitoId` que não está entre os aplicáveis do diagnóstico do token
- **THEN** a gravação é recusada

#### Scenario: Progresso
- **WHEN** a serventia responde perguntas
- **THEN** a barra "X de Y respondidas" reflete apenas requisitos aplicáveis não dispensados mais as três de identidade digital

### Requirement: Envio final
O botão "Enviar respostas" SHALL só concluir quando todas as perguntas exibidas (requisitos aplicáveis e identidade digital) estiverem respondidas, com "Não sei" contando como resposta; a verificação MUST ser refeita no servidor. Ao enviar, o sistema grava `enviado_em`, o formulário passa a somente leitura com a tela "Recebemos suas respostas" e a equipe é notificada.

#### Scenario: Faltam respostas
- **WHEN** a serventia clica em "Enviar respostas" com perguntas em branco
- **THEN** a página rola até a primeira pergunta pendente, destaca-a e mostra "Faltam N perguntas. Se não souber, marque Não sei"

#### Scenario: Envio completo
- **WHEN** todas as perguntas estão respondidas e a serventia clica em "Enviar respostas"
- **THEN** `enviado_em` é gravado, a tela de confirmação aparece com contagem e horário, e novas chamadas de resposta pelo token são recusadas

#### Scenario: Reabrir link após envio
- **WHEN** a serventia abre o link depois do envio
- **THEN** vê a tela "Recebemos suas respostas" com as respostas em somente leitura e o botão de WhatsApp da Átrios

### Requirement: Página pública mobile-first e fora dos buscadores
A página SHALL usar o topo e o rodapé das páginas públicas (sem a casca do app autenticado), funcionar em largura de celular com campos de toque de pelo menos 44px, e declarar metadata `robots` com `noindex, nofollow`.

#### Scenario: Celular
- **WHEN** a página é aberta em viewport de 375px
- **THEN** não há rolagem horizontal, os botões de resposta cabem lado a lado ou empilhados e a barra de envio permanece acessível

#### Scenario: Crawler
- **WHEN** um crawler lê o HTML da página
- **THEN** encontra a meta robots com `noindex, nofollow`
