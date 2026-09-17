# autoavaliacao-tema-claro — Tema claro da rota pública de autoavaliação

## ADDED Requirements

### Requirement: Rota pública sempre em tema claro
A rota `/autoavaliacao/*` SHALL renderizar em tema claro (fundo claro, texto escuro) em todos os seus estados: formulário, pós-envio, link inválido, link expirado e "em análise". O tema MUST NOT depender de preferência do sistema nem de toggle do usuário.

#### Scenario: Formulário aberto por link válido
- **WHEN** a serventia abre um link válido
- **THEN** o fundo da página é claro, os cartões são brancos e o texto principal é escuro, independentemente de `prefers-color-scheme`

#### Scenario: Tela de link inválido
- **WHEN** um token inexistente ou expirado é acessado
- **THEN** a tela de aviso também aparece em tema claro

#### Scenario: App interno inalterado
- **WHEN** um membro abre qualquer rota autenticada, a landing `/diagnostico` ou o site `/`
- **THEN** a aparência escura atual permanece idêntica

### Requirement: Tema implementado por redefinição de tokens
O tema claro SHALL ser aplicado redefinindo as variáveis `--color-*` do design system dentro de `[data-theme="light"]` (e no `body` que o contenha), sem duplicar classes de cor nos componentes. Os componentes da rota MUST usar apenas tokens (ou opacidades de tokens) para cor.

#### Scenario: Componente usa token
- **WHEN** um elemento da rota usa `bg-surface-card` ou `text-fg-1`
- **THEN** no tema claro ele resolve para os valores claros sem mudança de classe

#### Scenario: Teste de cores fixas
- **WHEN** o teste de regressão varre `telas.tsx` e `autoavaliacao-form.tsx`
- **THEN** não encontra nenhum literal hex ou `rgb/rgba(` fora de comentários

### Requirement: Contraste mínimo
No tema claro, o texto de corpo e rótulos (`fg-hi` a `fg-6`) SHALL ter contraste ≥ 4.5:1 sobre `surface-card` e sobre o fundo; texto auxiliar (`fg-7` a `fg-9`) e bordas de campo MUST ter ≥ 3:1. Links (`primary-ink`) MUST ter ≥ 4.5:1 sobre branco.

#### Scenario: Pergunta e opções
- **WHEN** uma pergunta é renderizada com as quatro opções
- **THEN** o texto da pergunta, o rótulo das opções e a legenda "Salvo" atendem aos mínimos acima

#### Scenario: Estado de erro
- **WHEN** um campo mostra mensagem de erro
- **THEN** o texto em `danger` claro tem ≥ 4.5:1 sobre o cartão branco

### Requirement: Controles nativos e barra do navegador claros
A rota SHALL declarar `color-scheme: light` para que select, checkbox e radio nativos rendam claros, e SHALL exportar `themeColor` claro para a barra do navegador no celular, sem alterar o `themeColor` do restante do app.

#### Scenario: Select de cargo
- **WHEN** a serventia abre o select "Cargo" no celular
- **THEN** o menu nativo aparece em estilo claro

#### Scenario: Meta theme-color
- **WHEN** o HTML da rota é lido
- **THEN** contém `<meta name="theme-color">` com o valor claro definido no design, enquanto `/login` mantém o valor escuro

### Requirement: Logo legível nos dois temas
O logo do topo compartilhado SHALL usar a cor de primeiro plano de maior contraste do tema (`fg-hi`) em vez de branco fixo, ficando escuro no tema claro e visualmente inalterado no escuro.

#### Scenario: Topo na autoavaliação
- **WHEN** a página pública renderiza o `Topo`
- **THEN** o logo aparece escuro sobre o fundo claro

#### Scenario: Topo na landing
- **WHEN** `/diagnostico` renderiza o `Topo`
- **THEN** o logo continua claro sobre o fundo escuro
