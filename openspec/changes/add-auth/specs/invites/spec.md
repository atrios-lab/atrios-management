# Spec delta: invites (add-auth)

## ADDED Requirements

### Requirement: Aceitar convite via link
O sistema SHALL permitir criar conta a partir de um link de convite em `/convite/<token>`. A página SHALL mostrar quem convidou e o email convidado (pré-preenchido, não editável) e oferecer GitHub, Google ou definição de senha. O convite SHALL valer apenas para o email convidado.

#### Scenario: Convite válido aberto
- **WHEN** o convidado abre `/convite/<token>` com convite pendente e não expirado
- **THEN** a página mostra quem convidou, o email convidado fixo e os três métodos de criação de conta

#### Scenario: Criar conta definindo senha
- **WHEN** o convidado escolhe definir senha e submete o formulário
- **THEN** a conta é criada com o email do convite e o role definido no convite, o convite é marcado como aceito e o usuário entra logado

#### Scenario: OAuth com email diferente do convidado
- **WHEN** o convidado entra via GitHub/Google com um email diferente do convite
- **THEN** nenhuma conta é criada e a página exibe erro claro explicando que o convite vale apenas para o email convidado

#### Scenario: Convite expirado ou já usado
- **WHEN** alguém abre um link de convite expirado ou já aceito
- **THEN** o sistema exibe tela própria orientando a pedir um novo convite a um admin

### Requirement: Aceite implícito no login social
O sistema SHALL consumir automaticamente um convite pendente quando a pessoa convidada entrar via GitHub/Google diretamente pela tela de login, sem abrir o link do convite.

#### Scenario: Login social com convite pendente
- **WHEN** uma pessoa com convite pendente conclui OAuth pela tela `/login` com o email convidado
- **THEN** a conta é criada com o role do convite, o convite é marcado como aceito e o usuário entra direto

### Requirement: Signup bloqueado sem convite
O sistema SHALL bloquear a criação de conta para emails sem convite pendente (exceto o primeiro usuário do banco) e exibir a tela `/sem-convite` explicando o motivo, sem formulário.

#### Scenario: Tela sem convite
- **WHEN** o usuário é redirecionado para `/sem-convite`
- **THEN** a página exibe a mensagem "Este espaço é da Átrios — peça um convite a um admin" e apenas um botão de voltar ao login

#### Scenario: Tentativa de signup direto sem convite
- **WHEN** qualquer fluxo tenta criar usuário com email sem convite pendente e o banco já possui usuários
- **THEN** o servidor rejeita a criação, independentemente da UI utilizada
