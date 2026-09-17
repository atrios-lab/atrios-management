# Design — Autoavaliação pública da serventia

## Context

O módulo de diagnóstico (Next 16 App Router, React 19, Drizzle/Postgres, better-auth, Tailwind v4, Biome) tem hoje dois pontos de entrada:

- **Landing pública `/diagnostico`** (fora do login, liberada em `src/proxy.ts`): pré-cadastro que cria um `diagnostico` com `statusFunil = "novo"`, `origem = "pre-cadastro"`, sem classe. Já traz o padrão de formulário público do projeto: validação pura em `src/lib/diagnostico/pre-cadastro.ts` (testável, sem `next/*`), server action fina em `src/app/diagnostico/actions.ts`, honeypot, rate limit por IP truncado (`pre_cadastro_submission`), consentimento LGPD com versão da política (`POLITICA_VERSAO`), e-mail para a equipe (`sendEmail`) e realtime (`publish`).
- **Roteiro interno `/diagnosticos/[id]`** (autenticado): `EntrevistaForm` mostra `perguntaTecnica` + "Como perguntar: perguntaSimples" + `(Anexo IV, ref · peso)`; salva via `salvarRespostas` (upsert em `resposta` / `resposta_identidade`) e conclui via `concluirDiagnostico`, que exige todas as perguntas aplicáveis respondidas e grava `scoreGeral` + `statusFunil = "concluido"`. Requisitos aplicáveis vêm de `getRequisitosAplicaveis(classe, etapasDoEscopo(escopo))` e excluem dispensados via `dispensadoParaClasse`.

Dados relevantes já existentes: `requisito.perguntaSimples` (obrigatória, presente nos ~40 requisitos, redação já leiga na maioria), `IDENTIDADE_QUESTOES[].perguntaSimples`, `ETAPAS`/`ETAPAS_ESCOPO` (títulos leigos), `CLASSE_LABEL` e `MODELO_LABEL` (texto de faixa de receita e de modelo de solução), validadores `emailValido`/`telefoneValido`/`formatarWhatsapp`, `CARGOS`.

Restrições: o `roteiroExecucao`, `apontamento*`, `perguntaTecnica`, `refNormativa` e `peso` são material interno e não podem chegar ao cliente público (o teste `relatorio-doc.test.ts` já protege o PDF; aqui precisamos do mesmo cuidado no payload do server component). A `AppShell` é só para rotas autenticadas; as páginas públicas usam `Topo`/`Rodape` de `src/components/landing`.

**Atenção (AGENTS.md):** este Next 16 tem breaking changes — consultar `node_modules/next/dist/docs/` (server actions, `params` assíncronos, `notFound`, metadata `robots`) antes de codar.

## Goals / Non-Goals

**Goals:**
- A serventia responde o questionário sozinha, pelo celular, em linguagem comum, sem login.
- Cada resposta fica inequivocamente ligada a um diagnóstico (e portanto a uma serventia), via link com token gerado pela equipe.
- Lead do pré-cadastro pode receber o link e declarar o próprio enquadramento (classe/modelo), destravando o roteiro.
- Retomada pelo mesmo link; envio final só com tudo respondido; equipe avisada e revisando antes de concluir.
- Exposição mínima de dados no lado público.

**Non-Goals:**
- Questionário aberto sem token (qualquer visitante "se declarar" um cartório). A entrada aberta continua sendo o pré-cadastro da landing.
- Conclusão automática e relatório/PDF entregue direto à serventia (a equipe conclui e apresenta).
- Login/conta para a serventia, e-mail transacional para a serventia, lembretes automáticos.
- Editor de perguntas no app; nova coluna de "ajuda" por pergunta (revisão de texto entra no seed existente).
- Mudança em motor, score, prazos, relatórios, PDFs ou funil.

## Decisions

### D1 — Identificação por link com token, não por autodeclaração
Quem identifica o cartório é a **equipe**, ao gerar o link a partir de um `diagnostico` já existente (criado na call, ou vindo do pré-cadastro). O token é um segredo de 32 bytes (`crypto.getRandomValues` → base64url, ~43 chars) e a URL é `/autoavaliacao/[token]`. Tudo que a serventia responde grava no diagnóstico do token.

*Alternativas:* (a) formulário aberto com select "escolha seu cartório" a partir da base `serventia` — qualquer pessoa poderia responder por qualquer cartório, e a base cobre só o RN; (b) token curto/numérico — enumerável. O token longo dispensa CAPTCHA e rate limit por tentativa: 256 bits não se adivinham.

### D2 — Tabela `autoavaliacao` 1:1 com `diagnostico`
Nova tabela em vez de colunas soltas em `diagnostico` (que já tem ~25 colunas):

```
autoavaliacao
  id              text pk (uuid)
  diagnostico_id  text unique not null → diagnostico(id) on delete cascade
  token           text unique not null
  expira_em       timestamp not null           -- 30 dias a partir da geração
  revogado_em     timestamp                    -- revogação explícita
  criado_por_id   text → user(id) set null
  created_at      timestamp default now
  -- preenchidos pela serventia:
  respondente_nome      text
  respondente_cargo     text                    -- CARGOS de pre-cadastro.ts
  respondente_email     text
  respondente_whatsapp  text
  consentimento_em      timestamp
  consentimento_politica text                   -- POLITICA_VERSAO
  ip                    text                    -- truncado (truncarIp)
  iniciado_em           timestamp               -- 1ª gravação da serventia
  enviado_em            timestamp               -- envio final (trava o form)
```

Regenerar link = `update` de `token`/`expira_em`/`revogado_em = null` na mesma linha (mantém respondente e progresso). Revogar = `revogado_em = now()`. `diagnostico` ganha uma coluna `enquadramento_declarado_em timestamp` (nulo = classe/modelo definidos pela equipe).

*Alternativa:* guardar só o token em `diagnostico` — não teria onde registrar respondente, consentimento e envio sem inchar a tabela principal.

### D3 — Estado do link derivado, sem coluna de status
`estadoLink(row, agora)`: `revogado` se `revogado_em`; `enviado` se `enviado_em`; `expirado` se `agora > expira_em`; `aberto` se `iniciado_em`; senão `nao_iniciado`. Função pura em `src/lib/diagnostico/autoavaliacao.ts`, testada. Regra de aceitação do token no servidor: existe, não revogado, não expirado, diagnóstico com `statusFunil ∈ {novo, em_andamento}`. Se `enviado_em` está preenchido a página abre em modo somente leitura (não é erro). Se o diagnóstico foi concluído pela equipe, a página mostra "em análise" (também somente leitura).

### D4 — Lógica pura + action fina, como no pré-cadastro
`src/lib/diagnostico/autoavaliacao.ts` concentra: `gerarToken`, `estadoLink`, `validarRespondente` (nome obrigatório; cargo ∈ `CARGOS` opcional; e-mail **ou** WhatsApp obrigatório, reusando `emailValido`/`telefoneValido`/`formatarWhatsapp`; consentimento `=== true`), `validarEnquadramento` (classe ∈ {1,2,3}, subclasse opcional em `SUBCLASSES[classe]`, modelo ∈ `MODELO_LABEL`), e `faltantesParaEnvio(aplicaveis, respostas, identidade)`. Actions em `src/app/autoavaliacao/[token]/actions.ts`, todas recebendo o `token` como primeiro argumento e resolvendo o diagnóstico por ele (nunca por `diagnosticoId`):

- `iniciarAutoavaliacao(token, respondente)` — grava respondente/consentimento/IP/`iniciado_em`.
- `declararEnquadramento(token, {classe, subclasse?, modelo})` — grava em `diagnostico` (`classe`, `subclasse`, `modeloSolucao`, `enquadramento_declarado_em`); se `statusFunil = "novo"`, passa a `"em_andamento"`.
- `responderAutoavaliacao(token, {requisitoId, valor} | {item, valor})` — uma resposta por chamada (autosave); valida que o `requisitoId` está entre os aplicáveis do diagnóstico (não aceita id arbitrário).
- `enviarAutoavaliacao(token)` — recalcula faltantes no servidor; se zero, grava `enviado_em`, e-mail para `LEAD_NOTIFY_EMAIL` e `publish` no canal `diagnosticos`.

O upsert de respostas hoje inline em `salvarRespostas` é extraído para `upsertRespostas(tx, diagnosticoId, respostas, identidade)` em `src/lib/diagnostico/respostas.ts` e usado pelas duas actions (interna e pública), para que não existam duas gravações divergentes.

### D5 — Enquadramento declarado pela serventia
Se `diag.classe == null` (lead), o formulário tem a etapa "Sobre o cartório" antes das perguntas: faixa de receita bruta semestral (as três de `CLASSE_LABEL`, com reforço "considere os últimos seis meses") e "como funciona o sistema do cartório" (`MODELO_LABEL`). Se a classe já existe (diagnóstico da call), a etapa aparece pré-preenchida e editável; salvar marca `enquadramento_declarado_em` e sobrescreve classe/modelo. Base: art. 16 §1º — o enquadramento oficial é o declarado pela serventia. O roteiro interno passa a mostrar "Classe declarada pela serventia" quando a coluna está preenchida.

*Alternativa:* exigir que a equipe defina classe antes de gerar o link — inviável para lead (é justamente o que a equipe não sabe) e desperdiça a informação que a serventia tem.

### D6 — Payload público mínimo, calculado no servidor
`page.tsx` (server component) carrega diagnóstico + `getRequisitosAplicaveis` e passa ao client **apenas** `{ id, etapa, perguntaSimples }` dos requisitos **não dispensados** para a classe, os títulos de etapa (`ETAPAS`, `ETAPAS_ESCOPO`), `IDENTIDADE_QUESTOES` só com `item` + `perguntaSimples`, e do diagnóstico só `serventia`, `municipio`, `uf`, `classe`, `subclasse`, `modeloSolucao`. Um teste de unidade sobre o mapper (`montarPayloadPublico`) garante que chaves como `perguntaTecnica`, `refNormativa`, `peso`, `roteiroExecucao`, `contatoEmail` não vazam — mesmo espírito do teste que protege o PDF do cliente. Metadata `robots: { index: false, follow: false }`.

### D7 — UX do formulário público
Rota pública com `Topo` + `Rodape` da landing (sem `AppShell`), largura máx. ~640px, campos com as classes de `landing-form.tsx` (altura 48px no mobile). Cabeçalho fixo: "Autoavaliação · {serventia} · {município/UF}". Etapas em sequência única com rolagem (identificação → enquadramento, se aplicável → Identidade digital → Etapas 1..N do escopo) e barra de progresso "X de Y respondidas". Opções com legenda fixa no topo da seção de perguntas:

- **Sim**: já existe e está em uso.
- **Parcial**: existe, mas incompleto, desatualizado ou só em parte do cartório.
- **Não**: não existe.
- **Não sei**: sem problema, a Átrios confirma com você.

Autosave por resposta (`useTransition`, indicador "Salvo"/"Salvando…" discreto, erro inline com "tentar de novo"). Botão único "Enviar respostas" no rodapé fixo; se faltar algo, rola até a primeira pendente e destaca. Após envio: tela "Recebemos suas respostas" com resumo (X respostas, enviado às HH:MM) e botão WhatsApp da Átrios (`whatsappUrl`).

### D8 — UI da equipe
Componente client `LinkAutoavaliacao` (em `src/app/diagnosticos/[id]/`) usado na `EntrevistaForm` (acima do roteiro) e na `LeadNovoView`: estado (`nao_gerado | nao_iniciado | aberto | enviado | expirado | revogado`), URL absoluta (`siteUrl()` + path) com botão copiar (`navigator.clipboard`), botão "Abrir WhatsApp do contato" (`wa.me/55{contatoWhatsapp}` + texto pronto citando a serventia e o link), "Gerar novo link" (com `confirm` quando já existe) e "Revogar". Quando `enviado_em`, o roteiro interno exibe faixa "Autoavaliação recebida por {nome} ({cargo}) em {data}; revise e conclua" e as respostas já aparecem marcadas (mesmas tabelas). Actions internas em `diagnosticos/actions.ts`: `gerarLinkAutoavaliacao`, `revogarLinkAutoavaliacao` (com `requireSession`).

### D9 — Revisão editorial das perguntas simples
Critério: um escrevente sem formação em TI entende sem ajuda externa; siglas só com explicação entre parênteses na própria frase; sem referência a artigo/anexo. Passar pelas ~40 entradas de `REQS` em `provimento-data.ts` (e as 3 de `IDENTIDADE_QUESTOES`), ajustar em código e rodar `npm run db:seed:provimento` (upsert). Não muda estrutura nem testes, exceto onde o teste fixe texto.

## Risks / Trade-offs

- [Link vaza ou é encaminhado a terceiro] → token de 256 bits, expiração em 30 dias, revogação e regeneração com um clique; a página só expõe nome e município da serventia; e-mail à equipe em cada envio permite detectar uso indevido.
- [Serventia responde "Sim" para tudo por otimismo] → a equipe conclui, não a serventia; faixa "Autoavaliação recebida, revise" no roteiro; a legenda de "Parcial" reduz falso "Sim". O relatório continua carregando a ressalva do art. 16 §1º para a classe.
- [Autosave por resposta gera ~40 chamadas de action] → volume irrisório; cada uma é um upsert indexado. Se virar problema, agrupar por seção.
- [Lead muda de "novo" para "em_andamento" sem a equipe agir] → é o comportamento desejado (sai da fila de leads e entra na lista principal); o realtime já atualiza a lista; `origem = "pre-cadastro"` e `enquadramento_declarado_em` preservam a rastreabilidade.
- [Equipe e serventia editam a mesma resposta] → último grava vence (mesmo comportamento atual de duas abas internas); após `enviado_em` o público é somente leitura, então na prática a edição concorrente só ocorre antes do envio.
- [Pergunta dispensada para a classe não é exibida; se a serventia mudar a classe, o conjunto muda] → o payload é recalculado no servidor a cada render após `declararEnquadramento` (`router.refresh()`); respostas a requisitos que deixaram de ser aplicáveis ficam gravadas mas ignoradas pelo motor (comportamento já existente na ferramenta interna).
- [Textos revisados divergem do PDF] → `perguntaSimples` nunca aparece no relatório do cliente; mudança de redação não afeta PDFs.

## Migration Plan

1. Migração Drizzle: tabela `autoavaliacao` + coluna `diagnostico.enquadramento_declarado_em` (aditiva, sem backfill).
2. Deploy do código; `vercel-build` já roda `drizzle-kit migrate` e o seed do provimento (textos revisados entram sozinhos).
3. Liberar `autoavaliacao` em `src/proxy.ts` no mesmo deploy (sem isso a rota redireciona para `/login`).
4. Rollback: reverter deploy; a tabela nova pode ficar (sem leitura) até uma migração de limpeza.

## Open Questions

- Prazo de validade padrão do link: 30 dias assumido; ajustar se a operação preferir mais curto.
- Regenerar link deve apagar o progresso da serventia? Assumido **não** (mantém respostas e respondente; só troca o segredo).
