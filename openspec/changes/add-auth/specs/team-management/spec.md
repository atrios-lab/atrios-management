# Spec delta: team-management (add-auth)

## ADDED Requirements

### Requirement: Ver o time
O sistema SHALL exibir em `/time` a lista de pessoas do time com avatar, nome, email, role e status (ativo / convite pendente). Convites pendentes SHALL aparecer na mesma lista, marcados como "Pendente". Membros sem role admin SHALL ver a lista sem ações de gerenciamento.

#### Scenario: Membro vê o time
- **WHEN** um usuário com role `member` acessa `/time`
- **THEN** vê a lista completa de membros e convites pendentes, sem botões de convidar, remover ou mudar role

#### Scenario: Convite pendente na lista
- **WHEN** existe um convite não aceito e não expirado
- **THEN** ele aparece na lista com o email convidado e o marcador "Pendente"

### Requirement: Gerenciar o time
O sistema SHALL permitir que admins convidem novas pessoas (modal com email + role), mudem o role de membros, removam membros (com confirmação) e reenviem ou cancelem convites pendentes. As invariantes SHALL ser aplicadas no servidor: admin não pode remover a si mesmo nem rebaixar o último admin; toda ação exige sessão com role `admin`.

#### Scenario: Convidar pessoa
- **WHEN** um admin submete o modal de convite com email e role
- **THEN** um convite pendente com token e expiração é criado e o email com o link é enviado

#### Scenario: Convidar email já existente
- **WHEN** um admin convida um email que já é membro ou já tem convite pendente
- **THEN** o sistema rejeita com mensagem clara

#### Scenario: Mudar role
- **WHEN** um admin altera o role de um membro
- **THEN** o novo role passa a valer nas próximas verificações de autorização

#### Scenario: Remover membro
- **WHEN** um admin confirma a remoção de um membro
- **THEN** o usuário é removido e suas sessões são invalidadas

#### Scenario: Admin não remove a si mesmo
- **WHEN** um admin tenta remover a própria conta
- **THEN** o servidor rejeita a ação

#### Scenario: Último admin é protegido
- **WHEN** uma ação removeria ou rebaixaria o único admin restante
- **THEN** o servidor rejeita a ação com mensagem explicando o motivo

#### Scenario: Reenviar convite
- **WHEN** um admin reenvia um convite pendente
- **THEN** um novo token com nova expiração é gerado e um novo email é enviado

#### Scenario: Member tenta ação de admin
- **WHEN** uma requisição de convite, remoção ou mudança de role chega sem sessão de admin
- **THEN** o servidor rejeita, independentemente do que a UI exibia
