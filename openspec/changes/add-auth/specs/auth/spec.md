# Spec delta: auth (add-auth)

## ADDED Requirements

### Requirement: Login com provedor social
O sistema SHALL permitir login via GitHub e Google na tela `/login`. Em caso de falha ou cancelamento do OAuth, o sistema SHALL exibir erro visível na tela de login. Se o email autenticado não pertencer a nenhum usuário existente nem a um convite pendente, o sistema SHALL redirecionar para `/sem-convite` sem criar conta.

#### Scenario: Login social bem-sucedido
- **WHEN** um membro existente conclui o OAuth do GitHub ou Google com o email da sua conta
- **THEN** o sistema cria a sessão e redireciona para `/produtos`

#### Scenario: OAuth falha ou é cancelado
- **WHEN** o fluxo OAuth retorna erro ou é cancelado pelo usuário
- **THEN** a tela `/login` exibe uma mensagem de erro visível

#### Scenario: Email sem usuário e sem convite
- **WHEN** o OAuth conclui com um email que não corresponde a usuário nem a convite pendente
- **THEN** nenhuma conta é criada e o usuário é redirecionado para `/sem-convite`

### Requirement: Login com email e senha
O sistema SHALL permitir login com email e senha na tela `/login`, exibindo erro inline para credenciais inválidas e um link "Esqueci minha senha".

#### Scenario: Credenciais válidas
- **WHEN** o usuário submete email e senha corretos
- **THEN** o sistema cria a sessão e redireciona para `/produtos`

#### Scenario: Credenciais inválidas
- **WHEN** o usuário submete email ou senha incorretos
- **THEN** a tela exibe erro inline sem revelar qual campo está errado

### Requirement: Recuperação de senha
O sistema SHALL permitir redefinir a senha via link enviado por email, sem revelar se o email possui conta. O link SHALL expirar.

#### Scenario: Solicitar recuperação
- **WHEN** o usuário submete um email em `/esqueci-senha`
- **THEN** o sistema responde com a mensagem neutra "se existir conta, enviamos um link", independentemente de o email existir

#### Scenario: Redefinir com link válido
- **WHEN** o usuário abre o link do email e submete nova senha com confirmação
- **THEN** a senha é atualizada e o usuário pode entrar com ela

#### Scenario: Link expirado
- **WHEN** o usuário abre um link de redefinição expirado ou já utilizado
- **THEN** o sistema exibe estado de link inválido com orientação para solicitar novo link

### Requirement: Sessão persistente e logout
O sistema SHALL manter o usuário logado entre visitas via cookie de sessão. O menu do avatar na sidebar SHALL exibir nome, email e ação "Sair". Rotas do app SHALL redirecionar para `/login` quando não houver sessão.

#### Scenario: Rota protegida sem sessão
- **WHEN** um usuário deslogado acessa `/produtos` ou `/time`
- **THEN** o sistema redireciona para `/login`

#### Scenario: Sair
- **WHEN** o usuário clica em "Sair" no menu do avatar
- **THEN** a sessão é encerrada e o usuário é redirecionado para `/login`

#### Scenario: Usuário logado acessa /login
- **WHEN** um usuário com sessão válida acessa `/login`
- **THEN** o sistema redireciona para `/produtos`

### Requirement: Bootstrap do primeiro admin
O sistema SHALL atribuir role `admin` ao primeiro usuário criado no banco, sem exigir convite.

#### Scenario: Primeiro signup do banco
- **WHEN** não existe nenhum usuário e alguém cria conta (qualquer método)
- **THEN** a conta é criada com role `admin` sem necessidade de convite
