// Dados normativos e editoriais do Provimento CNJ 213/2026 — módulo PURO,
// sem banco: o seed (seed-provimento.ts) grava daqui e os testes de regra
// editorial (relatorio-doc.test.ts) validam daqui.
//
// Regra editorial dos campos que saem no PDF DO CLIENTE (titulo, exigencia,
// consequencia): português claro, dispositivo exato entre parênteses, NUNCA
// o "como fazer" (nada de "recomenda-se", "instale", "configure", "habilite",
// "basta", "passo a passo") e nenhum travessão/meia-risca. Consequência só a
// que está na norma e pode ser conferida (trava de etapa, art. 20/21/23/24/25).
// O roteiro é INTERNO: nunca aparece no PDF do cliente.

import type { RequisitoCondicoes, RequisitoNatureza } from "./schema.ts";

/* ---- Requisitos do Anexo IV (perguntas da entrevista) -------------------- */

// [etapa, ref no Anexo IV, pergunta simples ("como perguntar"),
//  pergunta técnica, peso 1-3, classes aplicáveis]
export type ReqRow = [number, string, string, string, number, number[]];

export const REQS: ReqRow[] = [
  [
    1,
    "1.1",
    "Existe uma pessoa nomeada por escrito como responsável pela parte de tecnologia do cartório?",
    "Há responsável técnico interno formalmente designado?",
    2,
    [1, 2, 3],
  ],
  [
    1,
    "1.1",
    'Existe uma pessoa nomeada como responsável pela proteção dos dados pessoais (o "encarregado de dados")?',
    "Há Encarregado de Proteção de Dados (DPO) designado, quando aplicável?",
    2,
    [1, 2, 3],
  ],
  [
    1,
    "1.1-II",
    'O titular assinou um documento formal assumindo a responsabilidade pelos dados pessoais tratados no cartório (papel de "controlador")?',
    "O titular foi formalmente designado como controlador de dados pessoais?",
    1,
    [1, 2, 3],
  ],
  [
    1,
    "1.2",
    "O cartório tem um documento escrito com as regras de segurança: quem pode acessar o quê, regras de senha, o que fazer em caso de problema?",
    "Existe Política de Segurança da Informação (PSI) formalizada, aprovada e divulgada, com o conteúdo mínimo do Anexo III?",
    3,
    [1, 2, 3],
  ],
  [
    1,
    "1.3",
    "Cada funcionário tem seu próprio usuário e senha (ninguém compartilha), e os acessos mais importantes pedem uma confirmação extra, como código no celular?",
    "Os acessos são individualizados, com MFA obrigatório nos acessos administrativos e vedação a credenciais compartilhadas?",
    3,
    [1, 2, 3],
  ],
  [
    1,
    "1.4",
    "Existe um registro escrito de quais dados pessoais o cartório coleta, para que usa e com quem compartilha (exigência da LGPD)?",
    "Existe registro das operações de tratamento de dados pessoais (ROPA — art. 7º §1º)?",
    3,
    [1, 2, 3],
  ],
  [
    1,
    "1.5",
    "Se acontecer um problema grave (invasão, vazamento de dados, sistema fora do ar), já está definido quem avisa a Corregedoria em até 72 horas e como?",
    "Há procedimento formalizado de comunicação de incidentes críticos à Corregedoria (≤72h) e à ANPD?",
    3,
    [1, 2, 3],
  ],
  [
    1,
    "1.7",
    "Existe uma lista atualizada de tudo que o cartório usa: computadores, programas, certificados digitais e contratos com empresas de tecnologia?",
    "Existe inventário completo de ativos tecnológicos, integrações, bancos de dados, certificados e contratos?",
    2,
    [1, 2, 3],
  ],
  [
    1,
    "1.8",
    "Todos os programas são originais (licenciados) e o contrato com a empresa do sistema garante que, se o cartório quiser trocar de fornecedor, leva todos os dados junto?",
    "Os softwares são licenciados e os contratos possuem cláusulas de confidencialidade, reversibilidade, portabilidade em formato aberto e LGPD?",
    2,
    [1, 2, 3],
  ],
  [
    1,
    "1.9",
    "O cartório já declarou a conclusão da Etapa 1 no sistema Justiça Aberta do CNJ?",
    "A conclusão da Etapa 1 foi declarada no Sistema Justiça Aberta?",
    1,
    [1, 2, 3],
  ],
  [
    2,
    "2.1",
    "Os computadores principais têm no-break (aparelho que segura a energia quando a luz cai) e a parte elétrica tem aterramento com laudo de um profissional?",
    "Há SAI/UPS com autonomia ~30 min e aterramento técnico aferido com laudo (art. 12 §8º)?",
    2,
    [1, 2, 3],
  ],
  [
    2,
    "2.2",
    "Se faltar energia por muito tempo, já está combinado o que fazer para proteger os equipamentos e retomar o atendimento?",
    "Existe plano de contingência energética compatível com a classe?",
    1,
    [1, 2, 3],
  ],
  [
    2,
    "2.3",
    "O servidor/computador principal fica em local fechado, com acesso controlado e protegido contra incêndio, goteira e calor excessivo?",
    "O ambiente físico dos equipamentos críticos possui acesso restrito e proteção contra incêndio, inundação e variações térmicas?",
    2,
    [1, 2, 3],
  ],
  [
    2,
    "2.4",
    "A internet do cartório é rápida e estável o bastante para o trabalho do dia a dia e para enviar as cópias de segurança?",
    "A conectividade é compatível com a classe (ou o backup comprovadamente cumpre o RPO)?",
    2,
    [1, 2, 3],
  ],
  [
    2,
    "2.5",
    "Existe um plano escrito do que fazer se o sistema parar (quem faz o quê, em quanto tempo tudo volta a funcionar e quanto de trabalho é aceitável perder)?",
    "PCN e PRD estão formalizados, com análise de riscos, RTO/RPO definidos e medidas de 30/90 dias?",
    3,
    [1, 2, 3],
  ],
  [
    2,
    "2.6",
    "Os computadores dão conta do trabalho e existe um técnico ou empresa de suporte que atende sempre que precisa?",
    "Há equipamentos adequados e suporte técnico contínuo (próprio ou contratado)?",
    1,
    [1, 2, 3],
  ],
  [
    2,
    "2.7",
    "Todos os computadores do cartório têm antivírus instalado e atualizado?",
    "Há proteção de endpoint (antivírus/antimalware) em todas as estações e servidores?",
    2,
    [1, 2, 3],
  ],
  [
    2,
    "2.8",
    "Existe um documento que descreve como a rede do cartório é montada: quais equipamentos, onde ficam os dados e onde são guardadas as cópias de segurança?",
    "Existe documento técnico de arquitetura com topologia de rede, ambientes, fluxos de dados críticos e localização dos backups?",
    1,
    [1, 2, 3],
  ],
  [
    2,
    "art. 4º §3º",
    "Os programas e o Windows dos computadores estão em versões atuais, que ainda recebem atualização do fabricante (nada de Windows 7, por exemplo)?",
    "Sistemas operacionais, SGBDs e aplicações críticas estão fora de EOL, com evidência documental de suporte vigente?",
    2,
    [1, 2, 3],
  ],
  [
    2,
    "2.9",
    "O cartório já declarou a conclusão da Etapa 2 no Justiça Aberta?",
    "A conclusão da Etapa 2 foi declarada no Justiça Aberta?",
    1,
    [1, 2, 3],
  ],
  [
    3,
    "3.1",
    "Os dados do cartório ficam protegidos por criptografia (embaralhados, de forma que só o cartório consegue ler), tanto guardados quanto quando são enviados pela internet?",
    "Há criptografia em trânsito (TLS 1.2+) e em repouso (AES-256), inclusive nos backups?",
    3,
    [1, 2, 3],
  ],
  [
    3,
    "3.1",
    'As "chaves" dessa proteção (senhas de criptografia e certificados) têm controle de quem guarda, quem acessa e quando são trocadas?',
    "Há gestão formal de chaves criptográficas (inventário, custódia segregada, rotação e registro)?",
    2,
    [1, 2, 3],
  ],
  [
    3,
    "3.2",
    "É feita cópia de segurança (backup) completa e automática de todos os dados, com a frequência exigida para o porte do cartório?",
    "O backup completo é executado no prazo da classe, com incrementais dentro do RPO?",
    3,
    [1, 2, 3],
  ],
  [
    3,
    "3.2.III-d",
    "As cópias de segurança ficam guardadas em pelo menos dois lugares diferentes, sendo um deles protegido de tal forma que nem um vírus ou invasor consegue apagar?",
    "Os backups são mantidos em 2 ambientes independentes, ao menos 1 com imutabilidade (WORM/retention lock, anti-ransomware)?",
    3,
    [1, 2, 3],
  ],
  [
    3,
    "3.3",
    "Se a cópia de segurança falhar, alguém recebe um aviso automático no mesmo dia?",
    "As rotinas de backup são monitoradas, com alerta automático e registro formal de falhas?",
    2,
    [1, 2, 3],
  ],
  [
    3,
    "3.4",
    "A rede tem um equipamento ou programa (firewall) que filtra o que entra e sai da internet, e a rede do público/wi-fi é separada da rede dos funcionários?",
    "Há firewall stateful com IPS/IDS e segmentação lógica de rede (VLAN ou equivalente)?",
    3,
    [2, 3],
  ],
  [
    3,
    "art. 8º §5º",
    "Existe uma proteção básica que bloqueia acessos vindos de fora da internet, e o wi-fi de visitantes é separado dos computadores de trabalho?",
    "Há proteção de perímetro simplificada: filtragem de conexões, registro de eventos e configuração documentada?",
    2,
    [1],
  ],
  [
    3,
    "3.5",
    "Além do antivírus comum, os computadores têm uma proteção mais avançada, que monitora comportamentos estranhos e avisa quando algo suspeito acontece?",
    "Há proteção avançada de endpoint (EDR/monitoramento ativo com detecção comportamental)?",
    2,
    [3],
  ],
  [
    3,
    "3.6",
    "O sistema do cartório usa um banco de dados confiável, que não perde nem corrompe informações quando há falha?",
    "O SGBD possui integridade transacional e logs ativos?",
    2,
    [1, 2, 3],
  ],
  [
    3,
    "3.7",
    "Se um equipamento importante quebrar, existe um reserva ou um plano para o cartório continuar funcionando?",
    "Há tolerância a falhas ou alta disponibilidade compatível com a classe?",
    2,
    [2, 3],
  ],
  [
    3,
    "3.8",
    "O sistema registra automaticamente quem fez cada coisa e a que horas, e esse histórico não pode ser apagado nem alterado por ninguém?",
    "As trilhas de auditoria são imutáveis, com sincronização de tempo (NTP) e identificação inequívoca do usuário?",
    3,
    [1, 2, 3],
  ],
  [
    3,
    "3.9",
    "O cartório já declarou a conclusão da Etapa 3 no Justiça Aberta?",
    "A conclusão da Etapa 3 foi declarada no Justiça Aberta?",
    1,
    [1, 2, 3],
  ],
  [
    4,
    "4.1",
    "Já foi feita uma verificação, com relatório escrito, provando que esse histórico de atividades funciona e fica guardado por pelo menos 5 anos?",
    "Foi emitido relatório de conformidade das trilhas de auditoria (imutabilidade, NTP, retenção mínima de 5 anos)?",
    2,
    [1, 2, 3],
  ],
  [
    4,
    "4.2",
    'Existe uma rotina combinada para manter os sistemas sempre atualizados (não se atualiza "quando dá")?',
    "Existe rotina documentada de atualização periódica de sistemas e aplicações?",
    2,
    [1, 2, 3],
  ],
  [
    4,
    "4.3",
    "Quando aparece uma falha de segurança grave, ela é corrigida em até 30 dias, com registro do que foi feito?",
    "Há gestão formal de vulnerabilidades (críticas ≤30 dias; ≤72h com exploração ativa), com registro no dossiê?",
    3,
    [1, 2, 3],
  ],
  [
    4,
    "4.4",
    "Pelo menos uma vez por ano é feito um treino simulando um desastre (ex: servidor queimou) para testar se o plano de emergência funciona?",
    "É realizada simulação anual de desastre para validação do PCN/PRD?",
    2,
    [1, 2, 3],
  ],
  [
    4,
    "4.5",
    "O cartório já testou, de verdade, recuperar os dados a partir da cópia de segurança — e documentou esse teste em ata?",
    "Há testes documentados de restauração de backup na periodicidade da classe, com ata (Anexo V)?",
    3,
    [1, 2, 3],
  ],
  [
    4,
    "4.6",
    "De tempos em tempos, um técnico ou empresa faz uma revisão geral de segurança no cartório, procurando falhas?",
    "São realizadas avaliações técnicas periódicas de segurança?",
    2,
    [1, 2, 3],
  ],
  [
    4,
    "4.7",
    "O cartório já contratou (ou recebeu do fornecedor do sistema) um teste de invasão, em que especialistas tentam invadir para encontrar falhas?",
    "Foi realizado pentest bienal (ou validado relatório técnico coletivo do fornecedor — Anexo II, 6)?",
    2,
    [3],
  ],
  [
    4,
    "4.8",
    "Quando acontece um problema de segurança, alguém investiga a causa e registra o que foi feito para não repetir?",
    "Todos os incidentes possuem análise de causa raiz e lições aprendidas documentadas?",
    1,
    [1, 2, 3],
  ],
  [
    4,
    "4.9",
    "O cartório já declarou a conclusão da Etapa 4 no Justiça Aberta?",
    "A conclusão da Etapa 4 foi declarada no Justiça Aberta?",
    1,
    [1, 2, 3],
  ],
  [
    5,
    "5.1",
    "O sistema do cartório consegue enviar informações automaticamente para as centrais e plataformas do Judiciário/CNJ?",
    "O sistema é interoperável com as plataformas eletrônicas de fiscalização do Judiciário (art. 19)?",
    2,
    [1, 2, 3],
  ],
  [
    5,
    "5.2",
    "Os documentos e dados ficam salvos em formatos abertos (como PDF/A), que qualquer sistema consegue ler — sem ficar preso ao fornecedor atual?",
    "São adotados padrões abertos (PDF/A, XML) com neutralidade tecnológica e prevenção de lock-in de fornecedor?",
    2,
    [1, 2, 3],
  ],
  [
    5,
    "5.3",
    "Os funcionários recebem treinamentos periódicos sobre segurança (senhas, golpes por e-mail, cuidados com dados), com lista de presença?",
    "Há capacitação periódica dos colaboradores com registro formal?",
    1,
    [1, 2, 3],
  ],
  [
    5,
    "5.4",
    "As regras de segurança do cartório são revisadas quando muda alguma lei ou tecnologia (não ficam esquecidas na gaveta)?",
    "A PSI e os padrões criptográficos são revisados formalmente a cada alteração normativa ou tecnológica relevante?",
    1,
    [1, 2, 3],
  ],
  [
    5,
    "5.5",
    "Os comprovantes de tudo isso (atas, relatórios, prints) ficam guardados de forma organizada por pelo menos 5 anos?",
    "As evidências do dossiê técnico são retidas por no mínimo 5 anos?",
    2,
    [1, 2, 3],
  ],
  [
    5,
    "5.6",
    "O cartório já testou exportar TODOS os seus dados do sistema, para provar que conseguiria migrar de fornecedor se precisasse?",
    "Foi realizada simulação documentada de extração integral do acervo em formato não proprietário (teste de reversibilidade)?",
    3,
    [1, 2, 3],
  ],
  [
    5,
    "5.7",
    "O cartório já declarou a conclusão da Etapa 5 no Justiça Aberta?",
    "A conclusão da Etapa 5 foi declarada no Justiça Aberta?",
    1,
    [1, 2, 3],
  ],
];

/* ---- Apontamento (cliente) + roteiro de execução (interno) --------------- */

// Consequências padrão por etapa: só o que a norma diz e se confere nela.
const TRAVA_E1 =
  "A Etapa 1 não pode ser declarada como concluída no Justiça Aberta enquanto este ponto não for atendido. As Etapas 1 e 2 têm data limite fixada pelo art. 20.";
const TRAVA_E2 =
  "A Etapa 2 não pode ser declarada como concluída no Justiça Aberta enquanto este ponto não for atendido. As Etapas 1 e 2 têm data limite fixada pelo art. 20.";
const TRAVA_E3 =
  "A Etapa 3 não pode ser declarada como concluída no Justiça Aberta enquanto este ponto não for atendido. As etapas do Anexo IV são sequenciais: as Etapas 4 e 5 dependem desta.";
const TRAVA_E4 =
  "A Etapa 4 não pode ser declarada como concluída no Justiça Aberta enquanto este ponto não for atendido. As etapas do Anexo IV são sequenciais: a Etapa 5 depende desta.";
const TRAVA_E5 =
  "A Etapa 5 não pode ser declarada como concluída no Justiça Aberta enquanto este ponto não for atendido. O prazo global do art. 23 abrange todas as etapas.";
const ART_24 =
  "A declaração é ato do titular, que responde pessoalmente por omissão relevante (art. 24).";
const DECLARACAO =
  "As etapas do Anexo IV são sequenciais e declaradas no Justiça Aberta: sem esta declaração, a etapa seguinte não pode ser declarada. A declaração é ato pessoal do titular da delegação, que responde pelo seu conteúdo (art. 24).";

export interface ExecucaoRow {
  /** Apontamento do CLIENTE, partes 1 e 2: título e exigência com dispositivo. */
  titulo: string;
  exigencia: string;
  /** Parte 4 do apontamento: consequência conferível na norma. */
  consequencia: string;
  /** INTERNO: como executar. Esqueleto pendente de revisão (revisado=false). */
  roteiro: string;
  /** O que existe ao final do trabalho. */
  artefato: string;
  natureza: RequisitoNatureza;
  /** Horas para criar o artefato reutilizável (uma vez). */
  esforcoTemplateHoras: number;
  /** Horas para adaptar/executar por serventia. */
  esforcoServentiaHoras: number;
  /** Item que o cartório compra (repasse). Presente = exige_capex. */
  capex?: string;
}

export const EXECUCAO: ExecucaoRow[] = [
  {
    titulo: "Designação formal do responsável técnico",
    exigencia:
      "A norma exige que a serventia tenha um responsável técnico interno formalmente designado, por escrito, pela área de tecnologia (Anexo IV, item 1.1).",
    consequencia: TRAVA_E1,
    roteiro:
      "1. Identificar com o titular quem responde pela tecnologia no dia a dia.\n2. Adaptar o termo de designação padrão da Átrios (função, atribuições, responsabilidades).\n3. Colher assinatura do titular e do designado.\n4. Arquivar o termo no dossiê técnico.",
    artefato: "Termo de designação do responsável técnico assinado",
    natureza: "documento",
    esforcoTemplateHoras: 2,
    esforcoServentiaHoras: 0.5,
  },
  {
    titulo: "Designação do encarregado de proteção de dados",
    exigencia:
      "A norma exige a designação formal de um encarregado pela proteção de dados pessoais, ponto de contato entre a serventia, os titulares de dados e as autoridades (Anexo IV, item 1.1).",
    consequencia: TRAVA_E1,
    roteiro:
      "1. Definir com o titular quem exercerá a função (pessoa interna ou serviço externo).\n2. Adaptar o termo de designação do encarregado (atribuições e canal de contato).\n3. Colher assinaturas e divulgar o contato do encarregado no atendimento.\n4. Arquivar no dossiê técnico.",
    artefato: "Termo de designação do encarregado assinado e contato divulgado",
    natureza: "documento",
    esforcoTemplateHoras: 2,
    esforcoServentiaHoras: 0.5,
  },
  {
    titulo: "Formalização do titular como controlador dos dados",
    exigencia:
      "A norma exige a formalização do titular da delegação como controlador dos dados pessoais tratados na serventia, com assunção documental dessa responsabilidade (Anexo IV, item 1.1, II).",
    consequencia: TRAVA_E1,
    roteiro:
      "1. Adaptar o termo de assunção de responsabilidade do controlador.\n2. Revisar com o titular o alcance da responsabilidade assumida.\n3. Colher assinatura e arquivar no dossiê técnico.",
    artefato: "Termo de assunção de responsabilidade do controlador assinado",
    natureza: "documento",
    esforcoTemplateHoras: 1,
    esforcoServentiaHoras: 0.5,
  },
  {
    titulo: "Política de Segurança da Informação",
    exigencia:
      "A norma exige uma Política de Segurança da Informação formalizada, aprovada e divulgada, com o conteúdo mínimo do Anexo III: papéis e responsabilidades, regras de acesso, uso aceitável dos recursos e resposta a incidentes (Anexo IV, item 1.2, e Anexo III).",
    consequencia: `É o documento central da Etapa 1: sem ele a etapa não pode ser declarada como concluída no Justiça Aberta. ${ART_24}`,
    roteiro:
      "1. Levantar rotinas, sistemas, acessos e fornecedores da serventia (entrevista + inventário).\n2. Adaptar o template de PSI da Átrios ao contexto, cobrindo todo o conteúdo mínimo do Anexo III.\n3. Validar o texto com o titular e colher aprovação formal.\n4. Divulgar à equipe com registro de ciência.\n5. Arquivar a PSI e os registros no dossiê técnico.",
    artefato: "Política de Segurança da Informação assinada e divulgada",
    natureza: "documento",
    esforcoTemplateHoras: 16,
    esforcoServentiaHoras: 4,
  },
  {
    titulo: "Autenticação multifator nos acessos administrativos",
    exigencia:
      "A norma exige que os acessos administrativos tenham autenticação multifator obrigatória, com credenciais individualizadas e vedação a senhas compartilhadas (Anexo IV, item 1.3).",
    consequencia: `A Etapa 1 não pode ser declarada como concluída no Justiça Aberta enquanto este ponto não for atendido. ${ART_24}`,
    roteiro:
      "1. Inventariar as contas administrativas (sistema do cartório, e-mail, servidores, backup, roteador).\n2. Eliminar contas compartilhadas: criar usuário individual para cada colaborador.\n3. Ativar MFA em cada sistema junto ao fornecedor (aplicativo autenticador; evitar SMS quando possível).\n4. Registrar evidências (telas, atas) no dossiê técnico.",
    artefato: "Acessos individualizados com MFA ativo e evidências arquivadas",
    natureza: "configuracao",
    esforcoTemplateHoras: 0,
    esforcoServentiaHoras: 4,
  },
  {
    titulo: "Registro das operações de tratamento de dados (ROPA)",
    exigencia:
      "A norma exige registro escrito das operações de tratamento de dados pessoais: quais dados a serventia coleta, para que os usa, onde ficam guardados e com quem são compartilhados (Anexo IV, item 1.4, e art. 7º, §1º).",
    consequencia: `A Etapa 1 não pode ser declarada como concluída no Justiça Aberta enquanto este ponto não for atendido. ${ART_24}`,
    roteiro:
      "1. Mapear os fluxos de dados por atribuição (atos praticados, sistemas, centrais, convênios).\n2. Preencher o template de ROPA da Átrios (dados, finalidade, base legal, compartilhamentos, retenção).\n3. Validar com o titular e o encarregado.\n4. Arquivar no dossiê técnico e definir gatilho de atualização.",
    artefato: "ROPA da serventia preenchido e aprovado",
    natureza: "documento",
    esforcoTemplateHoras: 12,
    esforcoServentiaHoras: 4,
  },
  {
    titulo: "Procedimento de comunicação de incidentes",
    exigencia:
      "A norma exige procedimento formalizado para comunicar incidentes críticos de segurança à Corregedoria em até 72 horas, com responsável, canal e conteúdo definidos, além da comunicação à ANPD quando houver dados pessoais envolvidos (Anexo IV, item 1.5).",
    consequencia:
      "O prazo de 72 horas conta do incidente, exista ou não procedimento pronto. A Etapa 1 não pode ser declarada como concluída no Justiça Aberta enquanto este ponto não for atendido.",
    roteiro:
      "1. Adaptar o procedimento padrão de resposta a incidentes (classificação, responsável, canais, modelo de comunicação).\n2. Definir com o titular quem aciona a Corregedoria e o encarregado que aciona a ANPD.\n3. Simular o fluxo uma vez com a equipe (tabletop rápido).\n4. Arquivar o procedimento e o registro da simulação no dossiê.",
    artefato: "Procedimento de comunicação de incidentes aprovado",
    natureza: "documento",
    esforcoTemplateHoras: 6,
    esforcoServentiaHoras: 1,
  },
  {
    titulo: "Inventário de ativos, contratos e certificados",
    exigencia:
      "A norma exige inventário completo e atualizado dos ativos tecnológicos da serventia: equipamentos, sistemas, integrações, bancos de dados, certificados digitais e contratos com fornecedores de tecnologia (Anexo IV, item 1.7).",
    consequencia: TRAVA_E1,
    roteiro:
      "1. Levantar in loco os equipamentos, sistemas e certificados em uso.\n2. Reunir os contratos de tecnologia vigentes com o administrativo.\n3. Preencher o template de inventário da Átrios e validar com o responsável técnico.\n4. Arquivar no dossiê e definir gatilho de atualização.",
    artefato: "Inventário de ativos tecnológicos preenchido e validado",
    natureza: "documento",
    esforcoTemplateHoras: 6,
    esforcoServentiaHoras: 3,
  },
  {
    titulo: "Licenciamento de software e cláusulas contratuais",
    exigencia:
      "A norma exige que os softwares em uso sejam licenciados e que os contratos com fornecedores contenham cláusulas de confidencialidade, reversibilidade, portabilidade dos dados em formato aberto e adequação à LGPD (Anexo IV, item 1.8).",
    consequencia: TRAVA_E1,
    roteiro:
      "1. Conferir o licenciamento de cada software do inventário.\n2. Analisar os contratos vigentes contra o checklist de cláusulas do item 1.8.\n3. Redigir aditivos contratuais para as cláusulas ausentes e negociar com os fornecedores.\n4. Arquivar contratos, aditivos e licenças no dossiê.",
    artefato: "Contratos com cláusulas do item 1.8 e licenças comprovadas",
    natureza: "documento",
    esforcoTemplateHoras: 4,
    esforcoServentiaHoras: 2,
  },
  {
    titulo: "Declaração da Etapa 1 no Justiça Aberta",
    exigencia:
      "A norma exige que a conclusão da Etapa 1 seja declarada pelo titular no sistema Justiça Aberta do CNJ (Anexo IV, item 1.9).",
    consequencia: DECLARACAO,
    roteiro:
      "1. Conferir que os itens 1.1 a 1.8 estão atendidos, com evidências no dossiê.\n2. Orientar o titular no acesso ao Justiça Aberta e na declaração.\n3. Arquivar o comprovante da declaração no dossiê.",
    artefato: "Etapa 1 declarada no Justiça Aberta, com comprovante arquivado",
    natureza: "ato_titular",
    esforcoTemplateHoras: 0,
    esforcoServentiaHoras: 0.5,
  },
  {
    titulo: "Energia protegida e aterramento com laudo",
    exigencia:
      "A norma exige no-break com autonomia aproximada de 30 minutos para os equipamentos críticos e aterramento elétrico aferido tecnicamente, com laudo (Anexo IV, item 2.1, e art. 12, §8º).",
    consequencia: TRAVA_E2,
    roteiro:
      "1. Dimensionar a carga dos equipamentos críticos e especificar o no-break (compra do cartório).\n2. Contratar eletricista habilitado para aferição do aterramento e emissão do laudo.\n3. Acompanhar a instalação e testar a autonomia.\n4. Arquivar laudo e notas fiscais no dossiê.",
    artefato: "No-break instalado e laudo de aterramento arquivado",
    natureza: "terceiro",
    esforcoTemplateHoras: 2,
    esforcoServentiaHoras: 2,
    capex:
      "No-break (UPS) com autonomia aproximada de 30 minutos para os equipamentos críticos",
  },
  {
    titulo: "Plano de contingência para falta de energia",
    exigencia:
      "A norma exige plano de contingência energética compatível com a classe da serventia: o que fazer numa interrupção prolongada para proteger os equipamentos e retomar o atendimento (Anexo IV, item 2.2).",
    consequencia: TRAVA_E2,
    roteiro:
      "1. Adaptar o template de plano de contingência energética (desligamento seguro, prioridades, retomada).\n2. Validar com o titular e o responsável técnico.\n3. Divulgar à equipe e arquivar no dossiê.",
    artefato: "Plano de contingência energética aprovado",
    natureza: "documento",
    esforcoTemplateHoras: 4,
    esforcoServentiaHoras: 1,
  },
  {
    titulo: "Proteção física do ambiente dos equipamentos",
    exigencia:
      "A norma exige que os equipamentos críticos fiquem em ambiente de acesso restrito, protegido contra incêndio, inundação e variações térmicas (Anexo IV, item 2.3).",
    consequencia: TRAVA_E2,
    roteiro:
      "1. Vistoriar o local atual dos equipamentos críticos (acesso, incêndio, água, calor).\n2. Especificar as adequações necessárias (compra do cartório) e acompanhar a execução.\n3. Registrar o resultado com fotos e arquivar no dossiê.",
    artefato: "Ambiente físico adequado, com registro no dossiê",
    natureza: "capex",
    esforcoTemplateHoras: 1,
    esforcoServentiaHoras: 2,
    capex:
      "Adequações físicas do ambiente dos equipamentos (controle de acesso, proteção contra incêndio e calor)",
  },
  {
    titulo: "Conectividade compatível com a classe",
    exigencia:
      "A norma exige conectividade compatível com a classe da serventia, ou demonstração de que a cópia de segurança cumpre o limite de perda de dados definido para a classe (Anexo IV, item 2.4).",
    consequencia: TRAVA_E2,
    roteiro:
      "1. Medir a velocidade e a estabilidade do link atual.\n2. Se abaixo da referência da classe, especificar o upgrade (contratação do cartório).\n3. Alternativamente, demonstrar por evidência que o backup cumpre o RPO da classe.\n4. Arquivar medições e contrato no dossiê.",
    artefato: "Link compatível com a classe (ou evidência de RPO atendido)",
    natureza: "capex",
    esforcoTemplateHoras: 1,
    esforcoServentiaHoras: 1,
    capex:
      "Contratação ou upgrade do link de internet até a referência da classe",
  },
  {
    titulo: "Plano de continuidade e de recuperação de desastres",
    exigencia:
      "A norma exige plano de continuidade de negócios e plano de recuperação de desastres formalizados, com análise de riscos, tempos máximos de parada e de perda de dados definidos e medidas de 30 e 90 dias (Anexo IV, item 2.5).",
    consequencia: `É o documento central da Etapa 2: sem ele a etapa não pode ser declarada como concluída no Justiça Aberta. ${ART_24}`,
    roteiro:
      "1. Levantar riscos e processos críticos da serventia.\n2. Adaptar os templates de PCN e PRD da Átrios (cenários, RTO/RPO da classe, medidas de 30/90 dias).\n3. Validar com o titular e colher assinatura.\n4. Divulgar aos envolvidos e arquivar no dossiê.",
    artefato: "PCN e PRD aprovados e assinados pelo titular",
    natureza: "documento",
    esforcoTemplateHoras: 16,
    esforcoServentiaHoras: 4,
  },
  {
    titulo: "Equipamentos adequados e suporte técnico contínuo",
    exigencia:
      "A norma exige equipamentos adequados ao serviço e suporte técnico contínuo, próprio ou contratado (Anexo IV, item 2.6).",
    consequencia: TRAVA_E2,
    roteiro:
      "1. Avaliar o parque de equipamentos contra a necessidade do serviço.\n2. Indicar reposições necessárias (compra do cartório).\n3. Formalizar contrato de suporte contínuo (Átrios ou terceiro definido pelo titular).\n4. Arquivar contrato e levantamento no dossiê.",
    artefato: "Contrato de suporte vigente e parque de equipamentos adequado",
    natureza: "recorrente",
    esforcoTemplateHoras: 1,
    esforcoServentiaHoras: 1,
    capex: "Reposição de equipamentos defasados, conforme levantamento",
  },
  {
    titulo: "Proteção contra vírus em todas as máquinas",
    exigencia:
      "A norma exige proteção contra programas maliciosos instalada e atualizada em todas as estações de trabalho e servidores (Anexo IV, item 2.7).",
    consequencia: TRAVA_E2,
    roteiro:
      "1. Levantar as máquinas sem proteção ou com proteção vencida.\n2. Especificar as licenças (compra do cartório) e implantar em todas as máquinas.\n3. Ativar atualização automática e registrar evidências no dossiê.",
    artefato: "Antivírus ativo e atualizado em todas as máquinas",
    natureza: "configuracao",
    esforcoTemplateHoras: 0.5,
    esforcoServentiaHoras: 1.5,
    capex: "Licenças de antivírus para todas as estações e servidores",
  },
  {
    titulo: "Documento técnico da arquitetura de rede",
    exigencia:
      "A norma exige documento técnico descrevendo a arquitetura da rede: equipamentos, ambientes, fluxos dos dados críticos e localização das cópias de segurança (Anexo IV, item 2.8).",
    consequencia: TRAVA_E2,
    roteiro:
      "1. Mapear a topologia real da rede in loco (equipamentos, segmentos, wi-fi, backup).\n2. Preencher o template de documento de arquitetura da Átrios (diagrama + descritivo).\n3. Validar com o responsável técnico e arquivar no dossiê.",
    artefato: "Documento de arquitetura de rede validado",
    natureza: "documento",
    esforcoTemplateHoras: 4,
    esforcoServentiaHoras: 2,
  },
  {
    titulo: "Sistemas dentro do suporte do fabricante",
    exigencia:
      "A norma veda o uso de sistemas operacionais, bancos de dados e aplicações críticas sem suporte do fabricante e exige evidência documental de que as versões em uso seguem suportadas (art. 4º, §3º).",
    consequencia: TRAVA_E2,
    roteiro:
      "1. Levantar as versões de sistema operacional, banco e aplicações críticas (a partir do inventário).\n2. Identificar o que está fora de suporte e especificar licenças ou migrações (compra do cartório).\n3. Executar as atualizações com o fornecedor do sistema.\n4. Arquivar evidência documental de suporte vigente no dossiê.",
    artefato: "Parque de software dentro do suporte, com evidência arquivada",
    natureza: "configuracao",
    esforcoTemplateHoras: 1,
    esforcoServentiaHoras: 3,
    capex:
      "Licenças de sistemas operacionais e softwares fora de suporte, conforme inventário",
  },
  {
    titulo: "Declaração da Etapa 2 no Justiça Aberta",
    exigencia:
      "A norma exige que a conclusão da Etapa 2 seja declarada pelo titular no sistema Justiça Aberta do CNJ (Anexo IV, item 2.9).",
    consequencia: DECLARACAO,
    roteiro:
      "1. Conferir que os itens 2.1 a 2.8 estão atendidos, com evidências no dossiê.\n2. Orientar o titular no acesso ao Justiça Aberta e na declaração.\n3. Arquivar o comprovante da declaração no dossiê.",
    artefato: "Etapa 2 declarada no Justiça Aberta, com comprovante arquivado",
    natureza: "ato_titular",
    esforcoTemplateHoras: 0,
    esforcoServentiaHoras: 0.5,
  },
  {
    titulo: "Criptografia dos dados guardados e transmitidos",
    exigencia:
      "A norma exige criptografia dos dados nas transmissões (padrão TLS 1.2 ou superior) e no armazenamento (padrão AES-256), inclusive nas cópias de segurança (Anexo IV, item 3.1).",
    consequencia: TRAVA_E3,
    roteiro:
      "1. Verificar com o fornecedor do sistema a criptografia em trânsito e em repouso.\n2. Ativar a criptografia dos backups e dos discos onde couber.\n3. Coletar declaração técnica do fornecedor e evidências.\n4. Arquivar no dossiê.",
    artefato: "Criptografia ativa com evidências arquivadas",
    natureza: "configuracao",
    esforcoTemplateHoras: 2,
    esforcoServentiaHoras: 4,
  },
  {
    titulo: "Gestão das chaves de criptografia",
    exigencia:
      "A norma exige gestão formal das chaves criptográficas e certificados: inventário, guarda segregada, troca periódica e registro (Anexo IV, item 3.1).",
    consequencia: TRAVA_E3,
    roteiro:
      "1. Inventariar chaves, senhas de criptografia e certificados em uso.\n2. Adaptar a política de gestão de chaves da Átrios (custódia, rotação, registro).\n3. Implantar a guarda segregada definida e arquivar no dossiê.",
    artefato: "Política de gestão de chaves implantada",
    natureza: "documento",
    esforcoTemplateHoras: 4,
    esforcoServentiaHoras: 1,
  },
  {
    titulo: "Cópia de segurança completa na frequência da classe",
    exigencia:
      "A norma exige cópia de segurança completa executada na frequência definida para a classe da serventia, com cópias incrementais dentro do limite de perda de dados da classe (Anexo IV, item 3.2).",
    consequencia: `A Etapa 3 não pode ser declarada como concluída no Justiça Aberta enquanto este ponto não for atendido. ${ART_24}`,
    roteiro:
      "1. Dimensionar o volume do acervo e especificar o destino do backup (compra/contratação do cartório).\n2. Implantar a rotina automática (completa na frequência da classe + incrementais no RPO).\n3. Executar a primeira carga completa e conferir a integridade.\n4. Documentar a rotina e arquivar no dossiê.",
    artefato: "Rotina de backup automática ativa e documentada",
    natureza: "configuracao",
    esforcoTemplateHoras: 2,
    esforcoServentiaHoras: 4,
    capex:
      "Armazenamento para as cópias de segurança (local e nuvem), conforme volume do acervo",
  },
  {
    titulo: "Cópias de segurança em dois ambientes, uma delas inapagável",
    exigencia:
      "A norma exige que as cópias de segurança sejam mantidas em pelo menos dois ambientes independentes, e que ao menos um deles impeça alteração ou exclusão dos dados, inclusive por invasor (Anexo IV, item 3.2, III, d).",
    consequencia: TRAVA_E3,
    roteiro:
      "1. Definir os dois ambientes independentes (ex.: storage local + nuvem).\n2. Ativar trava de retenção (imutabilidade) em um dos ambientes.\n3. Testar que a cópia imutável resiste a exclusão administrativa.\n4. Documentar e arquivar no dossiê.",
    artefato: "Backup em dois ambientes, um com imutabilidade ativa",
    natureza: "configuracao",
    esforcoTemplateHoras: 2,
    esforcoServentiaHoras: 3,
    capex:
      "Serviço ou equipamento de armazenamento com trava de retenção (imutabilidade)",
  },
  {
    titulo: "Aviso automático quando a cópia de segurança falha",
    exigencia:
      "A norma exige monitoramento das rotinas de cópia de segurança, com alerta automático de falha no mesmo dia e registro formal das ocorrências (Anexo IV, item 3.3).",
    consequencia: TRAVA_E3,
    roteiro:
      "1. Ativar as notificações de falha da ferramenta de backup (e-mail/painel).\n2. Definir o destinatário responsável e o registro formal de ocorrências.\n3. Provocar uma falha controlada para validar o alerta.\n4. Arquivar evidências no dossiê.",
    artefato: "Alerta de falha de backup ativo e testado",
    natureza: "configuracao",
    esforcoTemplateHoras: 1,
    esforcoServentiaHoras: 1.5,
  },
  {
    titulo: "Barreira de rede e separação entre redes internas",
    exigencia:
      "A norma exige equipamento de proteção de rede com inspeção de tráfego e detecção de intrusão, além da separação lógica entre a rede de trabalho e as demais redes, como o wi-fi de visitantes (Anexo IV, item 3.4).",
    consequencia: TRAVA_E3,
    roteiro:
      "1. Especificar o firewall com IPS/IDS adequado ao porte (compra do cartório).\n2. Implantar e segmentar a rede (VLAN: trabalho, visitantes, equipamentos).\n3. Registrar a topologia final no documento de arquitetura.\n4. Arquivar evidências no dossiê.",
    artefato: "Firewall ativo e rede segmentada, com topologia documentada",
    natureza: "configuracao",
    esforcoTemplateHoras: 1,
    esforcoServentiaHoras: 4,
    capex: "Firewall com inspeção de tráfego (IPS/IDS)",
  },
  {
    titulo: "Proteção básica da rede contra acessos externos",
    exigencia:
      "A norma exige, para a Classe 1, proteção simplificada de perímetro: filtragem das conexões vindas da internet, registro de eventos e configuração documentada, com o wi-fi de visitantes separado da rede de trabalho (art. 8º, §5º).",
    consequencia: TRAVA_E3,
    roteiro:
      "1. Especificar roteador/firewall básico com filtragem de conexões (compra do cartório).\n2. Implantar a filtragem, separar o wi-fi de visitantes e ativar o registro de eventos.\n3. Documentar a configuração aplicada.\n4. Arquivar no dossiê.",
    artefato: "Perímetro básico ativo, com configuração documentada",
    natureza: "configuracao",
    esforcoTemplateHoras: 1,
    esforcoServentiaHoras: 2,
    capex: "Roteador ou firewall básico com filtragem de conexões",
  },
  {
    titulo: "Proteção avançada com monitoramento de comportamento",
    exigencia:
      "A norma exige, para a Classe 3, proteção de estações e servidores com monitoramento ativo e detecção de comportamento anômalo, além do antivírus comum (Anexo IV, item 3.5).",
    consequencia: TRAVA_E3,
    roteiro:
      "1. Especificar a solução de EDR adequada ao parque (licenças: compra do cartório).\n2. Implantar em todas as estações e servidores.\n3. Definir quem recebe e trata os alertas.\n4. Arquivar evidências no dossiê.",
    artefato: "EDR ativo em todo o parque, com responsável pelos alertas",
    natureza: "configuracao",
    esforcoTemplateHoras: 1,
    esforcoServentiaHoras: 2,
    capex: "Licenças de proteção avançada de endpoint (EDR)",
  },
  {
    titulo: "Banco de dados com integridade garantida",
    exigencia:
      "A norma exige que o sistema use banco de dados com integridade transacional e registros de atividade ativos, de forma a não perder nem corromper informações em caso de falha (Anexo IV, item 3.6).",
    consequencia: TRAVA_E3,
    roteiro:
      "1. Identificar o SGBD do sistema com o fornecedor.\n2. Confirmar integridade transacional e logs ativos (declaração técnica do fornecedor).\n3. Arquivar a evidência no dossiê.",
    artefato: "Declaração técnica do SGBD arquivada",
    natureza: "configuracao",
    esforcoTemplateHoras: 0.5,
    esforcoServentiaHoras: 1,
  },
  {
    titulo: "Continuidade em caso de falha de equipamento",
    exigencia:
      "A norma exige tolerância a falhas ou alta disponibilidade compatível com a classe: se um equipamento importante parar, o serviço precisa de um caminho para continuar (Anexo IV, item 3.7).",
    consequencia: TRAVA_E3,
    roteiro:
      "1. Identificar os pontos únicos de falha (servidor, storage, link).\n2. Especificar redundância ou equipamento reserva (compra do cartório).\n3. Registrar o arranjo no PCN/PRD.\n4. Arquivar no dossiê.",
    artefato: "Redundância implantada e registrada no PCN/PRD",
    natureza: "capex",
    esforcoTemplateHoras: 1,
    esforcoServentiaHoras: 2,
    capex: "Equipamento reserva ou redundância para os componentes críticos",
  },
  {
    titulo: "Histórico inapagável de quem fez o quê no sistema",
    exigencia:
      "A norma exige trilhas de auditoria imutáveis: registro automático de cada ação, com identificação inequívoca do usuário e relógio sincronizado, sem possibilidade de alteração ou exclusão (Anexo IV, item 3.8).",
    consequencia: `A Etapa 3 não pode ser declarada como concluída no Justiça Aberta enquanto este ponto não for atendido. ${ART_24}`,
    roteiro:
      "1. Verificar com o fornecedor as trilhas de auditoria do sistema (cobertura e imutabilidade).\n2. Ativar a sincronização de relógio (NTP) nos servidores e estações.\n3. Coletar declaração técnica e evidências.\n4. Arquivar no dossiê.",
    artefato: "Trilhas imutáveis ativas com NTP, evidências arquivadas",
    natureza: "configuracao",
    esforcoTemplateHoras: 1,
    esforcoServentiaHoras: 3,
  },
  {
    titulo: "Declaração da Etapa 3 no Justiça Aberta",
    exigencia:
      "A norma exige que a conclusão da Etapa 3 seja declarada pelo titular no sistema Justiça Aberta do CNJ (Anexo IV, item 3.9).",
    consequencia: DECLARACAO,
    roteiro:
      "1. Conferir que os itens 3.1 a 3.8 estão atendidos, com evidências no dossiê.\n2. Orientar o titular no acesso ao Justiça Aberta e na declaração.\n3. Arquivar o comprovante da declaração no dossiê.",
    artefato: "Etapa 3 declarada no Justiça Aberta, com comprovante arquivado",
    natureza: "ato_titular",
    esforcoTemplateHoras: 0,
    esforcoServentiaHoras: 0.5,
  },
  {
    titulo: "Relatório de conformidade das trilhas de auditoria",
    exigencia:
      "A norma exige relatório formal atestando que as trilhas de auditoria funcionam, são imutáveis, têm relógio sincronizado e retenção mínima de cinco anos (Anexo IV, item 4.1).",
    consequencia: TRAVA_E4,
    roteiro:
      "1. Executar o checklist de verificação das trilhas (imutabilidade, NTP, retenção).\n2. Preencher o template de relatório de conformidade da Átrios.\n3. Colher assinatura do responsável técnico.\n4. Arquivar no dossiê.",
    artefato: "Relatório de conformidade das trilhas emitido",
    natureza: "documento",
    esforcoTemplateHoras: 4,
    esforcoServentiaHoras: 2,
  },
  {
    titulo: "Rotina formal de atualização dos sistemas",
    exigencia:
      "A norma exige rotina documentada de atualização periódica de sistemas e aplicações, com periodicidade definida e registro (Anexo IV, item 4.2).",
    consequencia: TRAVA_E4,
    roteiro:
      "1. Adaptar o template de rotina de atualização (o quê, quem, quando, registro).\n2. Acordar a periodicidade com o fornecedor do sistema.\n3. Executar o primeiro ciclo e registrar.\n4. Arquivar no dossiê.",
    artefato: "Rotina de atualização documentada e em execução",
    natureza: "recorrente",
    esforcoTemplateHoras: 2,
    esforcoServentiaHoras: 1,
  },
  {
    titulo: "Correção de falhas de segurança com prazo",
    exigencia:
      "A norma exige gestão formal de vulnerabilidades: falhas críticas corrigidas em até 30 dias, ou em até 72 horas quando houver exploração ativa, com registro no dossiê técnico (Anexo IV, item 4.3).",
    consequencia: `A Etapa 4 não pode ser declarada como concluída no Justiça Aberta enquanto este ponto não for atendido. ${ART_24}`,
    roteiro:
      "1. Adaptar o procedimento de gestão de vulnerabilidades (fontes de aviso, prazos, responsável).\n2. Definir o fluxo de correção com o fornecedor do sistema e o suporte.\n3. Registrar o primeiro ciclo de verificação.\n4. Arquivar no dossiê.",
    artefato: "Procedimento de gestão de vulnerabilidades em execução",
    natureza: "recorrente",
    esforcoTemplateHoras: 2,
    esforcoServentiaHoras: 2,
  },
  {
    titulo: "Simulação anual de desastre",
    exigencia:
      "A norma exige simulação anual de desastre para validar, na prática, o plano de continuidade e o plano de recuperação (Anexo IV, item 4.4).",
    consequencia: TRAVA_E4,
    roteiro:
      "1. Planejar o cenário da simulação a partir do PCN/PRD.\n2. Conduzir o exercício com a equipe da serventia.\n3. Registrar resultados, tempos e lições em ata.\n4. Arquivar a ata no dossiê e agendar o próximo ciclo.",
    artefato: "Ata da simulação anual de desastre arquivada",
    natureza: "recorrente",
    esforcoTemplateHoras: 4,
    esforcoServentiaHoras: 3,
  },
  {
    titulo: "Teste real de recuperação das cópias de segurança",
    exigencia:
      "A norma exige teste documentado de restauração das cópias de segurança na periodicidade definida para a classe, registrado em ata conforme o Anexo V (Anexo IV, item 4.5).",
    consequencia: `Sem o teste, a serventia não tem como demonstrar que as cópias funcionam. ${TRAVA_E4}`,
    roteiro:
      "1. Definir o escopo do teste (amostra representativa do acervo).\n2. Executar a restauração em ambiente separado e conferir a integridade.\n3. Lavrar a ata no modelo do Anexo V.\n4. Arquivar no dossiê e agendar o próximo ciclo.",
    artefato: "Ata de teste de restauração (Anexo V) arquivada",
    natureza: "recorrente",
    esforcoTemplateHoras: 2,
    esforcoServentiaHoras: 3,
  },
  {
    titulo: "Avaliações periódicas de segurança",
    exigencia:
      "A norma exige avaliações técnicas periódicas de segurança, com registro dos resultados e dos encaminhamentos (Anexo IV, item 4.6).",
    consequencia: TRAVA_E4,
    roteiro:
      "1. Adaptar o checklist de avaliação periódica da Átrios.\n2. Executar a primeira avaliação e registrar achados e encaminhamentos.\n3. Arquivar o relatório no dossiê e agendar o próximo ciclo.",
    artefato: "Relatório de avaliação periódica arquivado",
    natureza: "recorrente",
    esforcoTemplateHoras: 2,
    esforcoServentiaHoras: 3,
  },
  {
    titulo: "Teste de invasão a cada dois anos",
    exigencia:
      "A norma exige, para a Classe 3, teste de invasão a cada dois anos, admitido o relatório técnico coletivo do fornecedor do sistema acompanhado de declaração do titular (Anexo IV, item 4.7, e Anexo II, item 6).",
    consequencia: TRAVA_E4,
    roteiro:
      "1. Verificar se o fornecedor do sistema possui relatório técnico coletivo válido (Anexo II, 6.3).\n2. Se houver: validar o relatório e preparar a declaração do titular.\n3. Se não houver: contratar o pentest com parceiro especializado e acompanhar a execução.\n4. Arquivar relatório e declaração no dossiê.",
    artefato:
      "Relatório de teste de invasão (ou relatório coletivo do fornecedor com declaração do titular)",
    natureza: "terceiro",
    esforcoTemplateHoras: 1,
    esforcoServentiaHoras: 2,
  },
  {
    titulo: "Investigação formal dos incidentes",
    exigencia:
      "A norma exige que todo incidente de segurança tenha análise de causa e lições aprendidas documentadas (Anexo IV, item 4.8).",
    consequencia: TRAVA_E4,
    roteiro:
      "1. Adaptar o modelo de análise de causa raiz da Átrios.\n2. Aplicar aos incidentes ocorridos desde a implantação do procedimento do item 1.5.\n3. Arquivar as análises no dossiê.",
    artefato: "Modelo de análise de causa raiz implantado",
    natureza: "documento",
    esforcoTemplateHoras: 2,
    esforcoServentiaHoras: 1,
  },
  {
    titulo: "Declaração da Etapa 4 no Justiça Aberta",
    exigencia:
      "A norma exige que a conclusão da Etapa 4 seja declarada pelo titular no sistema Justiça Aberta do CNJ (Anexo IV, item 4.9).",
    consequencia: DECLARACAO,
    roteiro:
      "1. Conferir que os itens 4.1 a 4.8 estão atendidos, com evidências no dossiê.\n2. Orientar o titular no acesso ao Justiça Aberta e na declaração.\n3. Arquivar o comprovante da declaração no dossiê.",
    artefato: "Etapa 4 declarada no Justiça Aberta, com comprovante arquivado",
    natureza: "ato_titular",
    esforcoTemplateHoras: 0,
    esforcoServentiaHoras: 0.5,
  },
  {
    titulo: "Integração com as plataformas do Judiciário",
    exigencia:
      "A norma exige que o sistema da serventia seja interoperável com as plataformas eletrônicas de fiscalização do Poder Judiciário (art. 19).",
    consequencia: TRAVA_E5,
    roteiro:
      "1. Verificar com o fornecedor a integração com as plataformas do CNJ aplicáveis à atribuição.\n2. Ativar as integrações pendentes junto ao fornecedor.\n3. Coletar evidência de funcionamento e arquivar no dossiê.",
    artefato: "Integrações ativas com evidência arquivada",
    natureza: "configuracao",
    esforcoTemplateHoras: 1,
    esforcoServentiaHoras: 2,
  },
  {
    titulo: "Documentos e dados em formatos abertos",
    exigencia:
      "A norma exige a adoção de formatos abertos (como PDF/A e XML) e neutralidade tecnológica, de modo que o acervo não fique preso ao fornecedor atual (Anexo IV, item 5.2).",
    consequencia: TRAVA_E5,
    roteiro:
      "1. Verificar com o fornecedor os formatos de armazenamento e exportação do sistema.\n2. Ativar a geração em PDF/A e a exportação em formato aberto onde couber.\n3. Registrar a evidência no dossiê.",
    artefato: "Formatos abertos em uso, com evidência arquivada",
    natureza: "configuracao",
    esforcoTemplateHoras: 1,
    esforcoServentiaHoras: 2,
  },
  {
    titulo: "Treinamento periódico da equipe",
    exigencia:
      "A norma exige capacitação periódica dos colaboradores em segurança da informação, com registro formal de presença (Anexo IV, item 5.3).",
    consequencia: TRAVA_E5,
    roteiro:
      "1. Adaptar a trilha de capacitação da Átrios (senhas, golpes, dados pessoais, incidentes).\n2. Conduzir o primeiro treinamento com lista de presença.\n3. Arquivar registros no dossiê e agendar o ciclo seguinte.",
    artefato: "Capacitação realizada, com registros de presença arquivados",
    natureza: "recorrente",
    esforcoTemplateHoras: 6,
    esforcoServentiaHoras: 2,
  },
  {
    titulo: "Revisão da política a cada mudança relevante",
    exigencia:
      "A norma exige revisão formal da Política de Segurança da Informação e dos padrões criptográficos a cada alteração normativa ou tecnológica relevante (Anexo IV, item 5.4).",
    consequencia: TRAVA_E5,
    roteiro:
      "1. Definir o gatilho de revisão (mudança de norma, sistema ou infraestrutura).\n2. Registrar o ciclo de revisão na própria PSI.\n3. Executar a primeira revisão anotada e arquivar no dossiê.",
    artefato: "Ciclo de revisão da PSI definido e registrado",
    natureza: "recorrente",
    esforcoTemplateHoras: 1,
    esforcoServentiaHoras: 1,
  },
  {
    titulo: "Guarda organizada das evidências por cinco anos",
    exigencia:
      "A norma exige que as evidências do dossiê técnico (atas, relatórios, comprovantes) sejam retidas de forma organizada por no mínimo cinco anos (Anexo IV, item 5.5).",
    consequencia: TRAVA_E5,
    roteiro:
      "1. Implantar a estrutura de dossiê técnico da Átrios (índice, pastas, nomenclatura).\n2. Migrar as evidências existentes para a estrutura.\n3. Definir a regra de retenção de cinco anos e o responsável pela guarda.",
    artefato: "Dossiê técnico organizado, com índice e regra de retenção",
    natureza: "documento",
    esforcoTemplateHoras: 2,
    esforcoServentiaHoras: 1,
  },
  {
    titulo: "Teste de exportação integral do acervo",
    exigencia:
      "A norma exige simulação documentada de extração integral do acervo em formato não proprietário, demonstrando que a serventia consegue migrar de fornecedor se precisar (Anexo IV, item 5.6).",
    consequencia: `A Etapa 5 não pode ser declarada como concluída no Justiça Aberta enquanto este ponto não for atendido. ${ART_24}`,
    roteiro:
      "1. Solicitar ao fornecedor a exportação integral em formato aberto (cláusula do item 1.8).\n2. Conferir a completude e a legibilidade do material exportado.\n3. Documentar a simulação com datas, volumes e resultado.\n4. Arquivar no dossiê.",
    artefato: "Simulação de exportação integral documentada",
    natureza: "recorrente",
    esforcoTemplateHoras: 2,
    esforcoServentiaHoras: 3,
  },
  {
    titulo: "Declaração da Etapa 5 no Justiça Aberta",
    exigencia:
      "A norma exige que a conclusão da Etapa 5 seja declarada pelo titular no sistema Justiça Aberta do CNJ (Anexo IV, item 5.7).",
    consequencia:
      "É a declaração que encerra o ciclo de adequação perante o CNJ, dentro do prazo global do art. 23. A declaração é ato pessoal do titular da delegação, que responde pelo seu conteúdo (art. 24).",
    roteiro:
      "1. Conferir que os itens 5.1 a 5.6 estão atendidos, com evidências no dossiê.\n2. Orientar o titular no acesso ao Justiça Aberta e na declaração.\n3. Arquivar o comprovante da declaração no dossiê.",
    artefato: "Etapa 5 declarada no Justiça Aberta, com comprovante arquivado",
    natureza: "ato_titular",
    esforcoTemplateHoras: 0,
    esforcoServentiaHoras: 0.5,
  },
];

/* ---- Condições e parâmetros ---------------------------------------------- */

// Nota do protótipo exibida no relatório para C3 em SaaS/compartilhada
// (dispensa condicionada do pentest — Anexo II, 6.3), ancorada no req 4.7.
export const CONDICOES_PENTEST: RequisitoCondicoes = {
  notaModelos: ["saas", "compartilhada"],
  nota: "Operando em ambiente SaaS/centralizado, o pentest individual pode ser dispensado mediante relatório técnico coletivo do fornecedor e declaração do titular (Anexo II, 6.3).",
};

export type SeedParametro = {
  chave: string;
  valor: string;
  uf?: string;
  descricao?: string;
};

export const PARAMETROS: SeedParametro[] = [
  {
    chave: "vigencia",
    // Entra em vigor na PUBLICAÇÃO (não há vacatio legis, art. 26): DJe/CNJ
    // n. 40/2026, de 23/02/2026, p. 8-27. 20/02/2026 é só a data de assinatura.
    valor: "2026-02-23",
    descricao:
      "Entrada em vigor do Provimento CNJ n. 213 (assinado em 20/02/2026, publicado no DJe/CNJ n. 40/2026 de 23/02/2026) — base de contagem dos prazos.",
  },
  // art. 16 — tetos de arrecadação semestral que separam as classes 1/2/3.
  // Base do enquadramento estimado das serventias (motor.classePorArrecadacao).
  {
    chave: "teto_classe_1",
    valor: "100000",
    descricao:
      "Teto de arrecadação semestral da Classe 1 (art. 16, I) — até este valor a serventia é estimada como Classe 1.",
  },
  {
    chave: "teto_classe_2",
    valor: "500000",
    descricao:
      "Teto de arrecadação semestral da Classe 2 (art. 16, II) — acima dele a serventia é estimada como Classe 3.",
  },
  // art. 20 — Etapas 1+2 obrigatórias, em dias a partir da vigência
  { chave: "prazo_art20_dias_classe_1", valor: "210" },
  { chave: "prazo_art20_dias_classe_2", valor: "150" },
  { chave: "prazo_art20_dias_classe_3", valor: "90" },
  // art. 23 — todas as 5 etapas, em meses a partir da vigência
  { chave: "prazo_art23_meses_classe_1", valor: "36" },
  { chave: "prazo_art23_meses_classe_2", valor: "30" },
  { chave: "prazo_art23_meses_classe_3", valor: "24" },
  // prorrogações estaduais do art. 21 (uma única, "por até 90 dias" — teto legal)
  {
    chave: "prorrogacao_art20_dias",
    valor: "90",
    uf: "RN",
    descricao:
      "Decisão CGJ-RN de 02/07/2026, PP 0000897-12.2026.2.00.0820, a pedido da Anoreg/RN, que deferiu prorrogação de 90 dias — única admitida pelo art. 21, condicionada a medidas mitigatórias e acompanhamento pela Seção de Correição.",
  },
  // A `descricao` acima é prosa de proveniência, para quem lê o banco. O site
  // institucional cita a decisão na própria copy, então data e processo entram
  // também como valor estruturado: assim a página não hardcoda data nenhuma nem
  // depende de fatiar texto livre.
  { chave: "prorrogacao_data", valor: "02/07/2026", uf: "RN" },
  {
    chave: "prorrogacao_processo",
    valor: "PP 0000897-12.2026.2.00.0820",
    uf: "RN",
  },
  // parâmetros técnicos mínimos por classe (linha de cabeçalho do relatório)
  {
    chave: "parametros_tecnicos_classe_1",
    valor:
      '{"rpo":"24h","rto":"24h","bkp":"72h","net":"2 Mbps","rest":"anual"}',
  },
  {
    chave: "parametros_tecnicos_classe_2",
    valor:
      '{"rpo":"12h","rto":"24h","bkp":"48h","net":"10 Mbps","rest":"anual"}',
  },
  {
    chave: "parametros_tecnicos_classe_3",
    valor:
      '{"rpo":"4h","rto":"8h","bkp":"24h","net":"50 Mbps","rest":"semestral"}',
  },
];

/* ---- Linhas completas de seed -------------------------------------------- */

export interface RequisitoSeedRow {
  id: string;
  etapa: number;
  refNormativa: string;
  perguntaSimples: string;
  perguntaTecnica: string;
  peso: number;
  classes: number[];
  condicoes: RequisitoCondicoes | null;
  ordem: number;
  ativo: boolean;
  apontamentoTitulo: string;
  apontamentoExigencia: string;
  apontamentoConsequencia: string;
  roteiroExecucao: string;
  artefato: string;
  natureza: RequisitoNatureza;
  /** string: coluna numeric do Postgres (driver entrega/recebe string) */
  esforcoTemplateHoras: string;
  esforcoServentiaHoras: string;
  exigeCapex: boolean;
  capexDescricao: string | null;
  revisado: boolean;
}

/** Zipa REQS + EXECUCAO nas linhas que o seed grava e os testes validam. */
export function montarRequisitosSeed(): RequisitoSeedRow[] {
  if (REQS.length !== EXECUCAO.length) {
    throw new Error(
      `REQS (${REQS.length}) e EXECUCAO (${EXECUCAO.length}) divergem — cada requisito precisa do seu apontamento/roteiro.`,
    );
  }
  return REQS.map(([etapa, ref, simples, tecnica, peso, classes], i) => {
    const e = EXECUCAO[i];
    return {
      id: `req-${String(i + 1).padStart(2, "0")}`,
      etapa,
      refNormativa: ref,
      perguntaSimples: simples,
      perguntaTecnica: tecnica,
      peso,
      classes,
      condicoes: ref === "4.7" ? CONDICOES_PENTEST : null,
      ordem: i + 1,
      ativo: true,
      apontamentoTitulo: e.titulo,
      apontamentoExigencia: e.exigencia,
      apontamentoConsequencia: e.consequencia,
      roteiroExecucao: e.roteiro,
      artefato: e.artefato,
      natureza: e.natureza,
      esforcoTemplateHoras: String(e.esforcoTemplateHoras),
      esforcoServentiaHoras: String(e.esforcoServentiaHoras),
      exigeCapex: e.capex != null,
      capexDescricao: e.capex ?? null,
      // Esqueleto derivado do requisito: pendente de revisão humana até a
      // equipe passar por cada texto (o PDF interno marca o que falta).
      revisado: false,
    };
  });
}
