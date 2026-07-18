// Textos e catálogos de exibição do módulo de diagnóstico. Os textos de
// pergunta/peso/prazo vivem no banco (requisito/parametro_norma); aqui ficam
// apenas rótulos de UI e os textos fixos do relatório, copiados do protótipo
// validado (docs/diagnostico-provimento-213.html).

import type {
  DiagnosticoEscopo,
  DiagnosticoModelo,
  DiagnosticoStatusFunil,
  IdentidadeItem,
  RequisitoNatureza,
  RespostaValor,
} from "@/db/schema";
import type { StatusEtapa } from "./motor";

export const ETAPAS: Record<number, string> = {
  1: "Etapa 1 — Organização e proteção de dados (LGPD)",
  2: "Etapa 2 — Estrutura e funcionamento",
  3: "Etapa 3 — Proteção dos dados e cópias de segurança",
  4: "Etapa 4 — Testes e acompanhamento",
  5: "Etapa 5 — Integração e manutenção contínua",
};

export const ETAPAS_ESCOPO: Record<number, string> = {
  1: "Responsáveis nomeados, regras escritas e adequação à Lei de Proteção de Dados.",
  2: "Energia, equipamentos, internet e plano para emergências.",
  3: "Como os dados são protegidos e como são feitas as cópias de segurança.",
  4: "Testes que provam que a proteção funciona de verdade.",
  5: "Integração com o CNJ, treinamentos e manutenção ao longo do tempo.",
};

export const VALORES: { value: RespostaValor; label: string }[] = [
  { value: "sim", label: "Sim" },
  { value: "parcial", label: "Parcial" },
  { value: "nao", label: "Não" },
  { value: "nao_sei", label: "Não sei" },
];

// Títulos de etapa para os PDFs: mesmos nomes, sem travessão (a regra dos
// dois relatórios proíbe travessão/meia-risca em texto visível).
export const ETAPAS_DOC: Record<number, string> = {
  1: "Etapa 1: Organização e proteção de dados (LGPD)",
  2: "Etapa 2: Estrutura e funcionamento",
  3: "Etapa 3: Proteção dos dados e cópias de segurança",
  4: "Etapa 4: Testes e acompanhamento",
  5: "Etapa 5: Integração e manutenção contínua",
};

/**
 * Parte 3 do apontamento do cliente. "Não sei" NUNCA vira conformidade:
 * entra como pendência a confirmar.
 */
export const SITUACAO_APONTAMENTO: Record<
  Exclude<RespostaValor, "sim">,
  string
> = {
  parcial: "existe parcialmente",
  nao: "não existe",
  nao_sei: "não soube informar, a confirmar",
};

/** Ressalva do art. 16 §1º — acompanha TODA menção a classe, nos dois PDFs. */
export const RESSALVA_CLASSE =
  "Classe e subclasse indicadas são estimativas: o enquadramento oficial é o declarado pela própria serventia, nos termos do art. 16, §1º.";

/** Natureza do trabalho (relatório interno): quem faz e como custa. */
export const NATUREZA_LABEL: Record<RequisitoNatureza, string> = {
  documento: "Documento (Átrios produz)",
  configuracao: "Configuração (Átrios executa)",
  capex: "Aquisição do cartório (repasse)",
  recorrente: "Recorrente (vira anuidade)",
  terceiro: "Terceiro subcontratado",
  ato_titular: "Ato do titular (custo zero)",
};

/** Rótulo de situação do gap no relatório (texto do protótipo). */
export const SITUACAO_GAP: Record<RespostaValor, string> = {
  sim: "ok",
  parcial: "parcialmente atendido",
  nao: "não atendido",
  nao_sei: "não identificado — requer levantamento técnico",
};

export const PESO_LABEL: Record<number, string> = {
  3: "CRÍTICO",
  2: "IMPORTANTE",
  1: "COMPLEMENTAR",
};

export const STATUS_ETAPA_LABEL: Record<StatusEtapa, string> = {
  adequado: "Adequado",
  atencao: "Atenção",
  critico: "Crítico",
};

export const ESCOPO_LABEL: Record<DiagnosticoEscopo, string> = {
  inicial:
    "Inicial — Etapas 1 e 2 (obrigatórias, art. 20) + identidade digital",
  completo: "Completo — todas as 5 etapas",
};

export const MODELO_LABEL: Record<DiagnosticoModelo, string> = {
  propria: "Servidor/computador dentro do próprio cartório",
  contratada: "Sistema de uma empresa, instalado no cartório",
  saas: "Totalmente na internet/nuvem (SaaS)",
  compartilhada: "Sistema compartilhado com outros cartórios",
  nao_sei: "Não sei informar",
};

export const CLASSE_LABEL: Record<number, string> = {
  1: "Classe 1 — até R$ 100 mil/semestre",
  2: "Classe 2 — entre R$ 100 mil e R$ 500 mil/semestre",
  3: "Classe 3 — acima de R$ 500 mil/semestre",
};

/** Subclasses do art. 16 por classe (opcional no cadastro). */
export const SUBCLASSES: Record<number, string[]> = {
  1: ["A", "B", "C"],
  2: ["D", "E", "F"],
  3: ["G", "H", "I", "J"],
};

export const STATUS_FUNIL: {
  value: DiagnosticoStatusFunil;
  label: string;
  color: string;
}[] = [
  { value: "novo", label: "Novo", color: "#8b93ec" },
  { value: "em_andamento", label: "Em andamento", color: "#8a8f98" },
  { value: "concluido", label: "Concluído", color: "#4ea7fc" },
  { value: "proposta", label: "Proposta enviada", color: "#f2c94c" },
  { value: "ganho", label: "Ganho", color: "#4cb782" },
  { value: "perdido", label: "Perdido", color: "#eb5757" },
];

export const STATUS_FUNIL_LABEL = Object.fromEntries(
  STATUS_FUNIL.map((s) => [s.value, s.label]),
) as Record<DiagnosticoStatusFunil, string>;

export const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

/* ---- Identidade digital (não pontua — oportunidades comerciais) ---------- */

export interface IdentidadeQuestao {
  item: IdentidadeItem;
  perguntaTecnica: string;
  perguntaSimples: string;
}

export const IDENTIDADE_QUESTOES: IdentidadeQuestao[] = [
  {
    item: "site",
    perguntaTecnica:
      "A serventia possui site institucional com domínio próprio?",
    perguntaSimples:
      "O cartório tem um site oficial próprio, tipo cartorioX.com.br, onde o cidadão encontra os serviços e contatos?",
  },
  {
    item: "email",
    perguntaTecnica:
      "Os colaboradores usam e-mail corporativo individual no domínio da serventia (não contas pessoais Gmail/Hotmail)?",
    perguntaSimples:
      "Os e-mails do cartório são profissionais, tipo maria@cartorioX.com.br, ou cada um usa o Gmail/Hotmail pessoal?",
  },
  {
    item: "fone",
    perguntaTecnica:
      "O atendimento telefônico/WhatsApp usa número corporativo da serventia (não celular pessoal de colaborador)?",
    perguntaSimples:
      "O WhatsApp e o telefone que atendem o público são do cartório, ou é o celular pessoal de algum funcionário?",
  },
];

export interface IdentidadePitch {
  titulo: string;
  descricao: string;
  argumento: string;
}

export const IDENTIDADE_PITCH: Record<IdentidadeItem, IdentidadePitch> = {
  site: {
    titulo: "Site institucional com domínio próprio",
    descricao:
      "Canal oficial para a política de privacidade e para o atendimento aos direitos dos titulares — procedimento que a Política de Segurança da Informação deve prever (Anexo III, 4.8-IV, e art. 18 da LGPD). Sem canal próprio, o cartório não demonstra como o cidadão exerce esses direitos. O domínio próprio é também pré-requisito do e-mail corporativo.",
    argumento:
      'Argumento na call: "A PSI que vamos elaborar precisa indicar COMO o cidadão solicita os dados dele. Hoje, qual seria esse canal oficial?"',
  },
  email: {
    titulo: "E-mail corporativo individual no domínio da serventia",
    descricao:
      "O art. 5º exige identificação do usuário, rastreabilidade das ações e responsabilização individual, vedando credenciais compartilhadas — e-mail pessoal ou caixa única (cartorio@gmail.com) tratando dados de titulares contraria esse princípio e deixa dados do cartório em conta que o titular da delegação não controla (art. 46 da LGPD). É também o canal formal de comunicação de incidentes à Corregedoria (Anexo IV, 1.5).",
    argumento:
      'Argumento na call: "Se um funcionário sair amanhã, o cartório mantém o histórico e bloqueia o acesso dele em 1 clique? Com Gmail pessoal, não."',
  },
  fone: {
    titulo: "Número/WhatsApp corporativo da serventia",
    descricao:
      "Atendimento pelo celular pessoal de colaborador significa dados pessoais de cidadãos (documentos, certidões, CPF) armazenados em dispositivo fora da governança da serventia — descumprindo o dever de medidas técnicas adequadas (art. 7º do Provimento c/c art. 46 da LGPD) e sem trilha de auditoria. Se o colaborador sai, o histórico de atendimento sai junto.",
    argumento:
      'Argumento na call: "Hoje, se pedirem o histórico de uma conversa com um cidadão de 6 meses atrás, o cartório consegue apresentar? Em qual celular ele está?"',
  },
};

/** Situação declarada exibida no card de oportunidade (texto do protótipo). */
export const SITUACAO_IDENTIDADE: Record<RespostaValor, string> = {
  sim: "possui",
  parcial: "parcial",
  nao: "não possui",
  nao_sei: "não identificado",
};
