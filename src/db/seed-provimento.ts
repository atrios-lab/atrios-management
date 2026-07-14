// Seed dos dados normativos do Provimento CNJ 213/2026 — requisitos do
// Anexo IV e parâmetros de prazo. Fonte: docs/diagnostico-provimento-213.html
// (protótipo validado, array REQS).
//
// Rode com: npm run db:seed:provimento
// Idempotente: upsert por id determinístico — NÃO apaga requisitos nem
// respostas existentes; atualiza textos/pesos/classes in place.

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.ts";

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), {
  schema,
});

// [etapa, ref no Anexo IV, pergunta simples ("como perguntar"),
//  pergunta técnica, peso 1-3, classes aplicáveis]
type ReqRow = [number, string, string, string, number, number[]];

const REQS: ReqRow[] = [
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

// Nota do protótipo exibida no relatório para C3 em SaaS/compartilhada
// (dispensa condicionada do pentest — Anexo II, 6.3), ancorada no req 4.7.
const CONDICOES_PENTEST: schema.RequisitoCondicoes = {
  notaModelos: ["saas", "compartilhada"],
  nota: "Operando em ambiente SaaS/centralizado, o pentest individual pode ser dispensado mediante relatório técnico coletivo do fornecedor e declaração do titular (Anexo II, 6.3).",
};

type SeedParametro = {
  chave: string;
  valor: string;
  uf?: string;
  descricao?: string;
};

const PARAMETROS: SeedParametro[] = [
  {
    chave: "vigencia",
    valor: "2026-02-20",
    descricao:
      "Entrada em vigor do Provimento CNJ n. 213, de 20/02/2026 (base de contagem dos prazos).",
  },
  // art. 20 — Etapas 1+2 obrigatórias, em dias a partir da vigência
  { chave: "prazo_art20_dias_classe_1", valor: "210" },
  { chave: "prazo_art20_dias_classe_2", valor: "150" },
  { chave: "prazo_art20_dias_classe_3", valor: "90" },
  // art. 23 — todas as 5 etapas, em meses a partir da vigência
  { chave: "prazo_art23_meses_classe_1", valor: "36" },
  { chave: "prazo_art23_meses_classe_2", valor: "30" },
  { chave: "prazo_art23_meses_classe_3", valor: "24" },
  // prorrogações estaduais do art. 21 (uma única, até 90 dias)
  {
    chave: "prorrogacao_art20_dias",
    valor: "93",
    uf: "RN",
    descricao:
      "Decisão CGJ-RN de 02/07/2026, PP 0000897-12.2026.2.00.0820, a pedido da Anoreg/RN — única prorrogação admitida pelo art. 21, condicionada a medidas mitigatórias e acompanhamento pela Seção de Correição.",
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

async function main() {
  for (const [
    i,
    [etapa, ref, simples, tecnica, peso, classes],
  ] of REQS.entries()) {
    const values: typeof schema.requisito.$inferInsert = {
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
    };
    await db
      .insert(schema.requisito)
      .values(values)
      .onConflictDoUpdate({ target: schema.requisito.id, set: values });
  }

  for (const p of PARAMETROS) {
    const values: typeof schema.parametroNorma.$inferInsert = {
      id: `${p.chave}:${p.uf ?? "*"}`,
      chave: p.chave,
      valor: p.valor,
      uf: p.uf ?? null,
      descricao: p.descricao ?? null,
    };
    await db
      .insert(schema.parametroNorma)
      .values(values)
      .onConflictDoUpdate({ target: schema.parametroNorma.id, set: values });
  }

  console.log(
    `Seed provimento: ${REQS.length} requisitos, ${PARAMETROS.length} parâmetros.`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
