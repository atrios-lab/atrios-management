# Histórias de usuário — Autenticação, Time e Convites

Escopo: organização única (Átrios). Roles: `admin` e `member`.
Login: GitHub, Google e email+senha.

---

## Tela: Login (`/login`)

**H1 — Entrar com provedor social**
Como membro do time, quero entrar com GitHub ou Google, para acessar sem gerenciar senha.

- Botões "Continuar com GitHub" e "Continuar com Google"
- Erro visível se o OAuth falhar ou for cancelado
- Se o email não pertence a nenhum usuário nem convite → vai para a tela "Sem convite" (H8)

**H2 — Entrar com email e senha**
Como membro do time, quero entrar com email e senha, caso não use GitHub/Google.

- Campos email + senha, erro inline para credenciais inválidas
- Link "Esqueci minha senha" (H3)

**H3 — Recuperar senha**
Como usuário, quero redefinir minha senha por email, para recuperar o acesso sozinho.

- Tela de email → mensagem "se existir conta, enviamos um link" (não revelar se o email existe)
- Tela de nova senha via link do email, com confirmação e expiração do link

---

## Tela: Aceitar convite (`/convite/<token>`)

**H4 — Criar conta a partir de um convite**
Como pessoa convidada, quero abrir o link do email e criar minha conta, para entrar no time.

- Mostra quem convidou e o email convidado (pré-preenchido, não editável)
- Escolha do método: GitHub, Google ou definir senha
- Se entrar via OAuth com email diferente do convidado → erro claro explicando o motivo
- Convite expirado ou já usado → tela própria com orientação de pedir novo convite

**H5 — Convite aceito implicitamente**
Como pessoa convidada, quero conseguir entrar direto pelo login com GitHub/Google sem clicar no link, desde que meu email tenha convite pendente.

- Fluxo idêntico ao login normal; o convite é consumido automaticamente
- (Sem tela nova — só afeta a lógica do H1)

---

## Tela: Time (`/time` — configurações)

**H6 — Ver o time**
Como membro, quero ver a lista de pessoas do time, para saber quem é quem.

- Lista com avatar, nome, email, role e status (ativo / convite pendente)
- Convites pendentes aparecem na mesma lista, marcados como "Pendente"

**H7 — Gerenciar o time (só admin)**
Como admin, quero convidar, remover e mudar o role das pessoas, para controlar o acesso.

- Botão "Convidar" → modal com email + role
- Ações por linha: mudar role, remover membro, reenviar/cancelar convite pendente
- Confirmação antes de remover
- Member vê a lista sem os botões de ação
- Admin não pode remover a si mesmo nem rebaixar o último admin

---

## Tela: Sem convite (`/sem-convite`)

**H8 — Signup bloqueado**
Como pessoa sem convite, quero entender por que não consigo entrar, para saber o que fazer.

- Mensagem "Este espaço é da Átrios — peça um convite a um admin"
- Sem formulário; só botão de voltar ao login

---

## Transversal

**H9 — Sessão e saída**
Como usuário, quero permanecer logado entre visitas e poder sair, para usar com segurança.

- Menu do avatar (sidebar) com nome, email e "Sair"
- Rotas do app redirecionam para `/login` quando deslogado

**H10 — Primeiro acesso (bootstrap)**
Como primeiro usuário do sistema, quero virar admin automaticamente, para não travar a configuração inicial.

- Sem tela; primeiro signup do banco recebe role `admin`
