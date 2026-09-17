# Tasks — Autoavaliação pública da serventia

## 1. Preparação

- [x] 1.1 Ler os guias do Next 16 em `node_modules/next/dist/docs/` para server actions, `params` assíncronos, `notFound`, metadata `robots` e `revalidatePath` (AGENTS.md avisa que há breaking changes)
- [x] 1.2 Reler `src/app/diagnostico/landing-form.tsx`, `src/app/diagnostico/actions.ts` e `src/lib/diagnostico/pre-cadastro.ts` para reaproveitar classes de campo, padrão lógica pura + action fina, `truncarIp`, validadores e `POLITICA_VERSAO`

## 2. Schema e migração

- [x] 2.1 Adicionar a tabela `autoavaliacao` em `src/db/schema.ts` conforme D2 (id uuid, `diagnostico_id` unique com cascade, `token` unique, `expira_em`, `revogado_em`, `criado_por_id`, campos do respondente, consentimento, `ip`, `iniciado_em`, `enviado_em`) + `relations` com `diagnostico` e `user`
- [x] 2.2 Adicionar `enquadramentoDeclaradoEm: timestamp("enquadramento_declarado_em")` em `diagnostico`, com comentário sobre o art. 16 §1º
- [x] 2.3 Gerar a migração com `drizzle-kit generate`, aplicar no banco local e conferir que `npm run db:seed:provimento` e `npm run db:seed` continuam funcionando

## 3. Lógica pura compartilhada

- [x] 3.1 Criar `src/lib/diagnostico/respostas.ts` com `upsertRespostas(tx, diagnosticoId, respostas, identidade)` extraído de `salvarRespostas`, e fazer `salvarRespostas` usar a função (comportamento inalterado)
- [x] 3.2 Criar `src/lib/diagnostico/autoavaliacao.ts` (sem `next/*`): `gerarToken()` (32 bytes base64url), `LINK_VALIDADE_DIAS = 30`, `estadoLink(row, agora)` (D3), `validarRespondente`, `validarEnquadramento`, `faltantesParaEnvio(aplicaveis, respostas, identidade)`, `montarPayloadPublico(diag, requisitos, classe)` (D6), `LEGENDA_OPCOES` (D7) e `mensagemWhatsappLink(serventia, url)`
- [x] 3.3 Escrever `src/lib/diagnostico/autoavaliacao.test.ts`: estados do link (revogado > enviado > expirado > aberto > não iniciado), validações de respondente (nome obrigatório, e-mail OU WhatsApp, cargo fora de `CARGOS` vira null, consentimento obrigatório), enquadramento inválido, faltantes com dispensados excluídos, e **teste de vazamento** garantindo que o payload público não tem `perguntaTecnica`, `refNormativa`, `peso`, `apontamento*`, `roteiroExecucao`, `artefato`, `natureza`, `esforco*`, `contatoEmail`, `contatoWhatsapp`

## 4. Actions internas (equipe)

- [x] 4.1 Em `src/app/diagnosticos/actions.ts`, adicionar `gerarLinkAutoavaliacao(diagnosticoId)`: `requireSession`, recusar se status fora de {novo, em_andamento}, insert ou update da linha de `autoavaliacao` (novo token, nova validade, `revogadoEm = null`, `criadoPorId`), `revalidatePath` e `notifyDiagnosticos`; retornar `{ token }`
- [x] 4.2 Adicionar `revogarLinkAutoavaliacao(diagnosticoId)`: grava `revogadoEm = now()`, revalida e notifica
- [x] 4.3 Em `queries.ts`, incluir `autoavaliacao` no `with` de `getDiagnostico` (colunas necessárias ao estado, respondente e datas) e expor um `getProgressoAutoavaliacao` ou reusar `respostas` já carregadas para "X de Y"

## 5. UI interna (equipe)

- [x] 5.1 Criar `src/app/diagnosticos/[id]/link-autoavaliacao.tsx` (client): estado via `estadoLink`, URL absoluta (`siteUrl()` + `/autoavaliacao/<token>`), "Copiar link" (`navigator.clipboard` com feedback), "Abrir WhatsApp do contato" só quando há `contatoWhatsapp`, "Gerar link" / "Gerar novo link" (com `confirm` quando já existe) e "Revogar"; mostrar respondente, iniciado em, enviado em e "X de Y respondidas"
- [x] 5.2 Renderizar `LinkAutoavaliacao` na `LeadNovoView` (abaixo dos contatos) e no topo da `EntrevistaForm` (`page.tsx` passa os dados da autoavaliação)
- [x] 5.3 Na `EntrevistaForm`, exibir a faixa "Autoavaliação recebida por <nome> (<cargo>) em <data> — revise e conclua" quando `enviadoEm` existir, e "Classe declarada pela serventia" no header quando `enquadramentoDeclaradoEm` existir
- [x] 5.4 Na lista `/diagnosticos/page.tsx`, marcar com chip discreto os diagnósticos com autoavaliação enviada e ainda em andamento (sinal de "tem coisa para revisar")

## 6. Rota pública

- [x] 6.1 Adicionar `autoavaliacao` ao regex `PUBLIC` em `src/proxy.ts` (mesmo padrão de `diagnostico`, com comentário) e conferir que `/diagnosticos` continua protegido
- [x] 6.2 Criar `src/app/autoavaliacao/[token]/page.tsx` (server, `dynamic = "force-dynamic"`, metadata com `robots: { index: false, follow: false }`): buscar `autoavaliacao` por token com o diagnóstico; decidir entre página de link inválido/expirado, "em análise" (status fora de novo/em_andamento), somente leitura (enviado) e formulário; carregar `getRequisitosAplicaveis` e montar o payload com `montarPayloadPublico`
- [x] 6.3 Criar `src/app/autoavaliacao/[token]/actions.ts` com `iniciarAutoavaliacao`, `declararEnquadramento` (muda "novo" → "em_andamento", grava `enquadramentoDeclaradoEm`, revalida `/diagnosticos`, `/diagnosticos/leads` e a rota pública, `publish`), `responderAutoavaliacao` (uma resposta; valida requisito aplicável e valor; recusa após `enviadoEm`) e `enviarAutoavaliacao` (recalcula faltantes no servidor, grava `enviadoEm`, `sendEmail` para `LEAD_NOTIFY_EMAIL` com serventia, respondente e link interno, `publish`); todas resolvem o diagnóstico pelo token e aplicam `estadoLink` antes de gravar
- [x] 6.4 Criar `src/app/autoavaliacao/[token]/autoavaliacao-form.tsx` (client, mobile-first, `Topo` + `Rodape`): cabeçalho fixo com serventia e município/UF; seção Identificação (nome, cargo, e-mail, WhatsApp com `formatarWhatsapp`, checkbox da política com link para `/privacidade`); seção "Sobre o cartório" (faixa de receita com `CLASSE_LABEL` e nota dos seis meses, modelo com `MODELO_LABEL`), exibida obrigatoriamente quando não há classe e pré-preenchida quando há; `router.refresh()` após salvar
- [x] 6.5 Implementar a seção de perguntas: legenda fixa das quatro opções, grupos por etapa com `ETAPAS`/`ETAPAS_ESCOPO`, identidade digital com `perguntaSimples`, botões de resposta com altura ≥44px, autosave por resposta com indicador "Salvando…"/"Salvo"/"não salvou, tente de novo", barra "X de Y respondidas"
- [x] 6.6 Implementar o rodapé fixo com "Enviar respostas": ao faltar, rolar até a primeira pendente (`scrollIntoView`), destacar e mostrar "Faltam N perguntas. Se não souber, marque Não sei"; ao enviar, mostrar tela "Recebemos suas respostas" (contagem, horário, botão WhatsApp da Átrios via `whatsappUrl`) e travar o formulário
- [x] 6.7 Criar as telas de link inválido/expirado e "em análise" com contato da Átrios (`CONTATO_EMAIL`, `WHATSAPP_EXIBICAO`), sem revelar se o token existiu

## 7. Revisão editorial das perguntas simples

- [x] 7.1 Passar pelas entradas de `REQS` em `src/db/provimento-data.ts` e pelas 3 de `IDENTIDADE_QUESTOES` com o critério de D9 (escrevente sem TI entende; sigla só com explicação na frase; sem artigo/anexo); ajustar os textos que ainda usam jargão
- [x] 7.2 Rodar `npm test` (ajustar testes que fixem texto), depois `npm run db:seed:provimento` no banco local e conferir no formulário público

## 8. Verificação

- [x] 8.1 `npm run lint`, `npm test` e `npx tsc --noEmit` passando
- [ ] 8.2 Fluxo completo no dev server: criar diagnóstico → gerar link → abrir em janela anônima (sem sessão) → identificar → responder → enviar → conferir e-mail/realtime, faixa de recebimento e "Concluir diagnóstico" gerando relatório
- [x] 8.3 Fluxo do lead: pré-cadastro na landing → gerar link do lead → serventia declara enquadramento → lead sai de "Novo" para "Em andamento" com "Classe declarada pela serventia"
- [x] 8.4 Casos de borda: token inexistente, revogado, expirado, link após envio, requisito não aplicável enviado à action, `/autoavaliacao/x` sem sessão não redireciona para `/login`, viewport 375px sem rolagem horizontal

## Notas da implementação

- 7.1: revisão feita sobre os 49 textos de `REQS` e os 3 de `IDENTIDADE_QUESTOES`; todos já explicam a sigla na própria frase ou não usam sigla, e nenhum cita artigo/anexo. Nenhuma alteração de texto foi necessária.
- 7.2: o banco local estava dessincronizado do seed (req-02 sem a condição de dispensa do DPO); `npm run db:seed:provimento` foi rodado e resolveu.
- 8.2: o lado público (identificar → responder → enviar → e-mail → "Recebemos") foi verificado no browser. O lado interno (bloco do link, faixa "Autoavaliação recebida", chip na lista, Concluir) só passou por typecheck/lint: o browser da sessão não tinha sessão autenticada e a política de uso proíbe digitar senha em formulário. Verificar manualmente em `/diagnosticos/<id>`.
- Atenção: o `.env` local tem Resend configurado, então o envio de teste disparou um e-mail real para `LEAD_NOTIFY_EMAIL` (padrão contato@atrioss.com).
