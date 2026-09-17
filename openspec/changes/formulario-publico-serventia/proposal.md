# Proposal — Autoavaliação pública da serventia

## Why

Hoje o questionário do Provimento 243 só existe como **roteiro de entrevista interno** (`/diagnosticos/[id]`, atrás de login): a equipe lê a pergunta técnica, traduz na call e marca a resposta. Isso trava a operação na agenda da equipe e limita quantas serventias dá para diagnosticar por semana. A própria serventia (titular, escrevente, interino) consegue responder sozinha se as perguntas forem em linguagem comum e se o sistema souber, sem ambiguidade, **qual cartório está respondendo** — o fluxo previsto desde o blueprint do módulo ("comercial gera link → cartório preenche"), ainda não construído.

## What Changes

- **Link de autoavaliação por diagnóstico.** A equipe gera, na página do diagnóstico (ou do lead), um link único com token secreto e prazo de validade, copia e envia por WhatsApp/e-mail. O token amarra cada resposta a um diagnóstico específico, logo a uma serventia específica: é assim que se sabe "qual cartório preencheu". Pode ser regenerado (invalida o anterior) ou revogado.
- **Formulário público `/autoavaliacao/[token]`**, fora da autenticação (liberado em `src/proxy.ts`), mobile-first, no visual da landing pública. Mostra o nome da serventia e município pré-identificados e pede:
  1. **Quem está respondendo** (nome, cargo, e-mail ou WhatsApp) + aceite da Política de Privacidade, no mesmo padrão LGPD do pré-cadastro.
  2. **Enquadramento**, quando o diagnóstico ainda não tem classe (leads): faixa de receita bruta semestral e como o sistema do cartório funciona (modelo de solução), em texto simples. O art. 16 §1º diz que o enquadramento oficial é o declarado pela própria serventia, então a declaração da serventia prevalece sobre a estimativa da equipe.
  3. **As perguntas do provimento**, só na versão em linguagem simples (`perguntaSimples`, que já existe no banco para todos os requisitos), sem referência normativa, peso ou pergunta técnica; itens dispensados para a classe não são perguntados. Opções Sim / Parcial / Não / Não sei com explicação curta de cada uma. Respostas salvas automaticamente a cada marcação; o mesmo link retoma de onde parou.
  4. **Envio final**, exigindo todas as perguntas respondidas ("Não sei" vale). Depois do envio o link vira somente leitura ("recebemos, a Átrios vai analisar").
- **Recebimento na ferramenta interna.** O diagnóstico exibe quem respondeu, quando iniciou e quando enviou; a equipe é avisada por e-mail e em tempo real. As respostas caem nas mesmas tabelas (`resposta`, `resposta_identidade`), então o roteiro interno mostra o que a serventia marcou e a equipe revisa, ajusta se preciso e **conclui** como hoje. O score continua sendo calculado só na conclusão pela equipe (portão de revisão antes do relatório).
- **Lead do pré-cadastro** que recebe o link: ao declarar o enquadramento, o lead sai de "Novo" para "Em andamento" (passa a ter classe e roteiro aplicável).
- **Revisão editorial das perguntas simples** (`src/db/provimento-data.ts`): passar pelos ~40 textos com o critério "um escrevente sem formação em TI entende sem ajuda"; ajustar os que ainda usam sigla ou jargão. O seed já é upsert idempotente, então é só rodar de novo.
- Sem mudança na regra de score, prazos, relatórios ou PDFs.

## Capabilities

### New Capabilities

- `autoavaliacao-equipe`: geração, compartilhamento, regeneração e revogação do link de autoavaliação pela equipe; indicação de status (não enviado / aberto / enviado / expirado) e dos dados do respondente no diagnóstico; efeito sobre lead "Novo"; notificação de recebimento.
- `autoavaliacao-publica`: o formulário público acessado pelo token: identificação do respondente e consentimento, enquadramento declarado pela serventia, perguntas em linguagem simples com salvamento automático, validação e envio final, estados de link inválido/expirado/enviado; regras de exposição mínima de dados (nunca pergunta técnica, referência, peso, roteiro, nem dados de contato do lead).

### Modified Capabilities

(nenhuma — `openspec/specs/` está vazio; não há requisitos existentes a alterar)

## Impact

- **Schema/DB**: nova tabela `autoavaliacao` (1:1 com `diagnostico`: token único, validade, respondente, consentimento, iniciado/enviado em, IP truncado, quem gerou) + migração Drizzle. Coluna nova em `diagnostico` para registrar que classe/modelo foram declarados pela serventia.
- **Rotas**: nova `src/app/autoavaliacao/[token]/` (page + form client + actions); `src/proxy.ts` ganha `autoavaliacao` na lista pública.
- **Server actions internas** (`src/app/diagnosticos/actions.ts`): gerar/regenerar/revogar link. O upsert de respostas de `salvarRespostas` é extraído para uma função compartilhada com a action pública.
- **UI interna**: `diagnosticos/[id]/page.tsx` e `lead-novo.tsx` ganham o bloco "Link para a serventia" (gerar, copiar, abrir WhatsApp do contato com mensagem pronta, status, regenerar/revogar) e o aviso "Autoavaliação recebida por X em Y" no roteiro de entrevista.
- **Dados de norma**: revisão de textos em `provimento-data.ts` (sem mudança de estrutura); `npm run db:seed:provimento`.
- **Segurança/LGPD**: token de 256 bits, expiração, `noindex`, consentimento com versão da política, IP truncado como no pré-cadastro; o formulário público recebe do servidor apenas `id`, `etapa` e `perguntaSimples` de cada requisito.
- **Reuso**: `getRequisitosAplicaveis`, `etapasDoEscopo`, `dispensadoParaClasse`, `IDENTIDADE_QUESTOES`, `CLASSE_LABEL`, `MODELO_LABEL`, validações de e-mail/WhatsApp de `pre-cadastro.ts`, `sendEmail`, `publish`, componentes `Topo`/`Rodape` e estilos de campo da landing.
