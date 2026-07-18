// Conteúdo dos dois relatórios do diagnóstico — funções puras (sem banco,
// sem pdfkit). Tudo o que aparece nos PDFs nasce aqui, e SÓ aqui: os
// renderizadores (pdf.ts) desenham exclusivamente estas strings, o que
// permite testar a regra editorial inteira (relatorio-doc.test.ts) sem
// parsear PDF.
//
// A regra que protege o produto: o documento do CLIENTE diz o que falta e o
// que isso trava; o COMO fazer (roteiro, esforço, natureza, CAPEX) existe
// apenas no documento interno.

import type {
  DiagnosticoEscopo,
  DiagnosticoModelo,
  IdentidadeItem,
  RequisitoCondicoes,
  RequisitoNatureza,
  RespostaValor,
} from "@/db/schema";
import { CONTATO_EMAIL, WHATSAPP_EXIBICAO } from "@/lib/landing/config";
import {
  ETAPAS_DOC,
  IDENTIDADE_PITCH,
  MODELO_LABEL,
  NATUREZA_LABEL,
  PESO_LABEL,
  RESSALVA_CLASSE,
  SITUACAO_APONTAMENTO,
  SITUACAO_IDENTIDADE,
  STATUS_ETAPA_LABEL,
} from "./constants";
import type { ParametrosNorma, Prazos } from "./motor";
import { statusPorScore } from "./motor";

/* ---- Entrada (estrutural, satisfeita pelo Relatorio de queries.ts) ------- */

export interface GapDoc {
  id: string;
  etapa: number;
  refNormativa: string;
  peso: number;
  ordem: number;
  valor: RespostaValor;
  apontamentoTitulo: string | null;
  apontamentoExigencia: string | null;
  apontamentoConsequencia: string | null;
  roteiroExecucao: string | null;
  artefato: string | null;
  natureza: RequisitoNatureza | null;
  esforcoTemplateHoras: string | null;
  esforcoServentiaHoras: string | null;
  exigeCapex: boolean;
  capexDescricao: string | null;
  revisado: boolean;
  condicoes: RequisitoCondicoes | null;
}

export interface DadosRelatorio {
  diagnostico: {
    serventia: string;
    municipio: string | null;
    uf: string;
    cns: string | null;
    classe: number | null;
    subclasse: string | null;
    modeloSolucao: DiagnosticoModelo;
    escopo: DiagnosticoEscopo;
    contatoNome: string;
    contatoEmail: string | null;
    contatoWhatsapp: string | null;
    criadoPor: { name: string } | null;
  };
  etapas: number[];
  porEtapa: Record<number, number>;
  geral: number;
  gaps: GapDoc[];
  prazos: Prazos;
  parametros: ParametrosNorma;
  identidadeOps: { item: IdentidadeItem; valor: RespostaValor }[];
}

/* ---- Estruturas dos documentos ------------------------------------------- */

export interface ApontamentoCliente {
  peso: number;
  pesoLabel: string;
  titulo: string;
  exigencia: string;
  situacao: string;
  consequencia: string;
  nota: string | null;
}

export interface EtapaVeredito {
  numero: number;
  titulo: string;
  score: number;
  status: string;
  statusKey: ReturnType<typeof statusPorScore>;
}

export interface DocCliente {
  arquivo: string;
  capa: {
    titulo: string;
    subtitulo: string;
    serventia: string;
    local: string;
    classe: string;
    ressalva: string;
    emitidoEm: string;
  };
  prazo: { titulo: string; linhas: string[]; vencido: boolean };
  veredito: {
    titulo: string;
    scoreGeral: number;
    statusGeral: string;
    statusGeralKey: ReturnType<typeof statusPorScore>;
    escopo: string;
    legenda: string;
    etapas: EtapaVeredito[];
  };
  oQueFalta: {
    titulo: string;
    introducao: string;
    vazio: string | null;
    etapas: {
      numero: number;
      titulo: string;
      apontamentos: ApontamentoCliente[];
    }[];
  };
  emJogo: { titulo: string; paragrafos: string[] };
  proximoPasso: { titulo: string; texto: string };
  rodape: string;
}

export interface ApontamentoInterno extends ApontamentoCliente {
  requisitoId: string;
  meta: string;
  roteiroTitulo: string;
  roteiro: string;
  natureza: string;
  artefato: string;
  esforco: string;
  modeloTrabalho: string;
  capex: string | null;
  revisado: boolean;
  pendencia: string | null;
}

export interface DocInterno {
  arquivo: string;
  /** Estampada em TODAS as páginas do PDF interno. */
  marcaDagua: string;
  aviso: string;
  capa: {
    titulo: string;
    subtitulo: string;
    serventia: string;
    identificacao: string[];
    classe: string;
    subclasse: string;
    ressalva: string;
    parametrosTecnicos: string | null;
    emitidoEm: string;
  };
  prazo: { titulo: string; linhas: string[]; vencido: boolean };
  veredito: DocCliente["veredito"];
  execucao: {
    titulo: string;
    introducao: string;
    vazio: string | null;
    etapas: {
      numero: number;
      titulo: string;
      totais: string;
      apontamentos: ApontamentoInterno[];
    }[];
  };
  ordemExecucao: { titulo: string; nota: string; passos: string[] };
  capexLista: {
    titulo: string;
    nota: string;
    itens: string[];
    vazio: string | null;
  };
  totais: { titulo: string; linhas: string[] };
  identidade: {
    titulo: string;
    nota: string;
    itens: {
      titulo: string;
      descricao: string;
      argumento: string;
      situacao: string;
    }[];
  } | null;
  rodape: string;
}

/* ---- Helpers -------------------------------------------------------------- */

const fmtData = (d: Date) => d.toLocaleDateString("pt-BR");

/** Travessão/meia-risca são proibidos no texto visível dos dois PDFs. */
const semTravessao = (s: string) => s.replace(/\s*[—–]\s*/g, ", ");

const fmtHoras = (n: number) => `${String(n).replace(".", ",")} h`;

export function slugServentia(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function nomeArquivoCliente(serventia: string): string {
  return `diagnostico-provimento-213-${slugServentia(serventia) || "serventia"}.pdf`;
}

/** Nome distinto e explícito: impossível confundir com o PDF do cliente. */
export function nomeArquivoInterno(serventia: string): string {
  return `INTERNO-roteiro-execucao-${slugServentia(serventia) || "serventia"}.pdf`;
}

export const MARCA_DAGUA_INTERNO = "USO INTERNO ÁTRIOS. NÃO ENVIAR AO CLIENTE.";

function situacaoDe(valor: RespostaValor): string {
  return valor === "sim" ? "atendido" : SITUACAO_APONTAMENTO[valor];
}

/** Nota condicionada ao modelo de solução (ex.: dispensa de pentest em SaaS). */
function notaDoGap(gap: GapDoc, modelo: DiagnosticoModelo): string | null {
  const c = gap.condicoes;
  if (c?.nota && c.notaModelos?.includes(modelo)) return semTravessao(c.nota);
  return null;
}

function apontamentoCliente(
  gap: GapDoc,
  modelo: DiagnosticoModelo,
): ApontamentoCliente {
  return {
    peso: gap.peso,
    pesoLabel: PESO_LABEL[gap.peso],
    // Fallback sem apontamento: cita só o dispositivo. NUNCA a pergunta da
    // entrevista (a pergunta é método interno).
    titulo: semTravessao(
      gap.apontamentoTitulo ??
        `Requisito ${gap.refNormativa} do Provimento n. 213/2026`,
    ),
    exigencia: semTravessao(
      gap.apontamentoExigencia ??
        `A exigência consta do Provimento n. 213/2026 (${gap.refNormativa}) e será detalhada no levantamento técnico.`,
    ),
    situacao: `Situação: ${situacaoDe(gap.valor)}.`,
    consequencia: semTravessao(
      gap.apontamentoConsequencia ??
        "A etapa correspondente não pode ser declarada como concluída no Justiça Aberta enquanto este ponto não for atendido.",
    ),
    nota: notaDoGap(gap, modelo),
  };
}

/** Gaps de uma etapa, na ordem editorial do cliente: peso maior primeiro. */
function gapsDaEtapa(gaps: GapDoc[], etapa: number): GapDoc[] {
  return gaps
    .filter((g) => g.etapa === etapa)
    .sort((a, b) => b.peso - a.peso || a.ordem - b.ordem);
}

function linhasPrazo(dados: DadosRelatorio): string[] {
  const { diagnostico: d, prazos, parametros } = dados;
  const dias = prazos.diasRestantesInicial;
  const linhas: string[] = [];
  linhas.push(
    `Data limite das Etapas 1 e 2 para a Classe ${d.classe} (art. 20): ${fmtData(prazos.limiteInicial)}.`,
  );
  if (dias >= 0) {
    linhas.push(dias === 1 ? "Falta 1 dia." : `Faltam ${dias} dias.`);
  } else {
    linhas.push(
      `O prazo venceu em ${fmtData(prazos.limiteInicial)}, há ${-dias === 1 ? "1 dia" : `${-dias} dias`}.`,
    );
  }
  if (parametros.prorrogacaoDias > 0) {
    const decisao = [
      parametros.prorrogacaoData
        ? `decisão de ${parametros.prorrogacaoData}`
        : null,
      parametros.prorrogacaoProcesso,
    ]
      .filter(Boolean)
      .join(", ");
    const ref = decisao ? ` (${decisao})` : "";
    linhas.push(
      dias >= 0
        ? `A data já considera a prorrogação de ${parametros.prorrogacaoDias} dias concedida pela CGJ-${d.uf.toUpperCase()}${ref}, única admitida pelo art. 21 e válida para todas as serventias do estado. As medidas de adequação continuam exigidas durante o período.`
        : `A data já considerava a prorrogação de ${parametros.prorrogacaoDias} dias concedida pela CGJ-${d.uf.toUpperCase()}${ref}. O art. 21 admite uma única prorrogação: não há nova prorrogação possível.`,
    );
  }
  linhas.push(
    `Prazo global de adequação, todas as etapas (art. 23): ${fmtData(prazos.limiteTotal)}.`,
  );
  linhas.push(RESSALVA_CLASSE);
  return linhas;
}

function veredito(dados: DadosRelatorio): DocCliente["veredito"] {
  const statusGeralKey = statusPorScore(dados.geral);
  return {
    titulo: "Veredito",
    scoreGeral: dados.geral,
    statusGeral: STATUS_ETAPA_LABEL[statusGeralKey],
    statusGeralKey,
    escopo:
      dados.etapas.length === 2
        ? "Etapas avaliadas: 1 e 2, implementação inicial obrigatória (art. 20)."
        : "Etapas avaliadas: 1 a 5 (adequação completa).",
    legenda:
      "Adequado: 80% ou mais. Atenção: 40 a 79%. Crítico: abaixo de 40%.",
    etapas: dados.etapas.map((e) => {
      const score = dados.porEtapa[e] ?? 0;
      const statusKey = statusPorScore(score);
      return {
        numero: e,
        titulo: ETAPAS_DOC[e],
        score,
        status: STATUS_ETAPA_LABEL[statusKey],
        statusKey,
      };
    }),
  };
}

/* ---- Relatório do CLIENTE ------------------------------------------------- */

export function montarDocCliente(
  dados: DadosRelatorio,
  geradoEm: Date,
): DocCliente {
  const d = dados.diagnostico;
  if (d.classe == null)
    throw new Error("Diagnóstico sem classe não gera relatório.");
  const emitidoEm = fmtData(geradoEm);

  const etapasComGaps = dados.etapas
    .map((e) => ({
      numero: e,
      titulo: ETAPAS_DOC[e],
      apontamentos: gapsDaEtapa(dados.gaps, e).map((g) =>
        apontamentoCliente(g, d.modeloSolucao),
      ),
    }))
    .filter((e) => e.apontamentos.length > 0);

  return {
    arquivo: nomeArquivoCliente(d.serventia),
    capa: {
      titulo: "Diagnóstico de Adequação",
      subtitulo: "Provimento CNJ n. 213/2026 e LGPD",
      serventia: d.serventia,
      local: d.municipio ? `${d.municipio}/${d.uf}` : d.uf,
      classe: `Classe ${d.classe}${d.subclasse ?? ""} (estimada)`,
      ressalva: RESSALVA_CLASSE,
      emitidoEm: `Emitido em ${emitidoEm}`,
    },
    prazo: {
      titulo: "Prazo",
      linhas: linhasPrazo(dados),
      vencido: dados.prazos.diasRestantesInicial < 0,
    },
    veredito: veredito(dados),
    oQueFalta: {
      titulo: "O que falta",
      introducao:
        'Cada ponto traz o que a norma exige, o dispositivo correspondente, a situação declarada pela serventia e a consequência prevista na norma. Os itens respondidos como "não sei" entram como pendência a confirmar, nunca como conformidade.',
      vazio:
        etapasComGaps.length === 0
          ? "Nenhuma pendência identificada nos requisitos avaliados. O resultado reflete as informações declaradas e será confirmado em levantamento técnico."
          : null,
      etapas: etapasComGaps,
    },
    emJogo: {
      titulo: "O que está em jogo",
      paragrafos: [
        "O art. 24 do Provimento prevê a instauração de procedimento administrativo disciplinar em caso de descumprimento injustificado das obrigações, com negligência, imprudência ou omissão relevante do titular da delegação, sem prejuízo das responsabilidades civis e penais.",
        "O art. 25 estabelece que o acompanhamento do cumprimento é orientado por risco, com priorização das serventias com maior probabilidade de descumprimento ou maior potencial de impacto.",
      ],
    },
    proximoPasso: {
      titulo: "Próximo passo",
      texto: `Para tratar destes pontos, fale com a Átrios: ${CONTATO_EMAIL} ou WhatsApp ${WHATSAPP_EXIBICAO}.`,
    },
    rodape: `Átrios. Documento elaborado a partir das informações declaradas pela serventia; a confirmação técnica ocorre em levantamento presencial. Emitido em ${emitidoEm}.`,
  };
}

/* ---- Relatório INTERNO ---------------------------------------------------- */

function apontamentoInterno(
  gap: GapDoc,
  modelo: DiagnosticoModelo,
): ApontamentoInterno {
  const base = apontamentoCliente(gap, modelo);
  const template = Number(gap.esforcoTemplateHoras ?? 0);
  const porServentia = Number(gap.esforcoServentiaHoras ?? 0);
  return {
    ...base,
    requisitoId: gap.id,
    meta: `Etapa ${gap.etapa} · Anexo IV, ${gap.refNormativa} · ${PESO_LABEL[gap.peso]}`,
    roteiroTitulo: "Roteiro de execução",
    roteiro: semTravessao(
      gap.roteiroExecucao ??
        "Roteiro ainda não cadastrado para este requisito.",
    ),
    natureza: gap.natureza
      ? NATUREZA_LABEL[gap.natureza]
      : "Natureza não classificada",
    artefato: semTravessao(gap.artefato ?? "Artefato não cadastrado."),
    esforco: `Esforço: ${fmtHoras(template)} de template (uma vez) + ${fmtHoras(porServentia)} por serventia.`,
    modeloTrabalho:
      template > 0
        ? "Trabalho de template: criar uma vez, adaptar por serventia."
        : "Execução direta nesta serventia (sem template).",
    capex: gap.exigeCapex
      ? `CAPEX do cartório (repasse): ${semTravessao(gap.capexDescricao ?? "a especificar")}.`
      : null,
    revisado: gap.revisado,
    pendencia: gap.revisado
      ? null
      : "TEXTO PENDENTE DE REVISÃO: esqueleto gerado do requisito, ainda não revisado pela equipe.",
  };
}

export function montarDocInterno(
  dados: DadosRelatorio,
  geradoEm: Date,
  geradoPor?: string | null,
): DocInterno {
  const d = dados.diagnostico;
  if (d.classe == null)
    throw new Error("Diagnóstico sem classe não gera relatório.");
  const emitidoEm = fmtData(geradoEm);

  const etapas = dados.etapas
    .map((e) => {
      const gaps = gapsDaEtapa(dados.gaps, e);
      const totalTemplate = gaps.reduce(
        (s, g) => s + Number(g.esforcoTemplateHoras ?? 0),
        0,
      );
      const totalServentia = gaps.reduce(
        (s, g) => s + Number(g.esforcoServentiaHoras ?? 0),
        0,
      );
      return {
        numero: e,
        titulo: ETAPAS_DOC[e],
        totais: `Total da etapa: ${fmtHoras(totalTemplate)} de template + ${fmtHoras(totalServentia)} por serventia.`,
        apontamentos: gaps.map((g) => apontamentoInterno(g, d.modeloSolucao)),
        totalTemplate,
        totalServentia,
      };
    })
    .filter((e) => e.apontamentos.length > 0);

  // Ordem de execução: sequência obrigatória do Anexo IV (etapa, depois a
  // ordem dos itens no próprio anexo).
  const emOrdem = [...dados.gaps].sort(
    (a, b) => a.etapa - b.etapa || a.ordem - b.ordem,
  );
  const passos = emOrdem.map((g, i) => {
    const titulo = g.apontamentoTitulo ?? g.refNormativa;
    const natureza = g.natureza ? NATUREZA_LABEL[g.natureza] : "sem natureza";
    return `${i + 1}. [Etapa ${g.etapa}] ${semTravessao(titulo)} (${natureza})`;
  });

  const capexItens = [
    ...new Set(
      dados.gaps
        .filter((g) => g.exigeCapex)
        .map((g) => semTravessao(g.capexDescricao ?? "Item a especificar")),
    ),
  ];

  const totalTemplate = etapas.reduce((s, e) => s + e.totalTemplate, 0);
  const totalServentia = etapas.reduce((s, e) => s + e.totalServentia, 0);

  const p = dados.parametros.tecnicos;

  return {
    arquivo: nomeArquivoInterno(d.serventia),
    marcaDagua: MARCA_DAGUA_INTERNO,
    aviso: MARCA_DAGUA_INTERNO,
    capa: {
      titulo: "Relatório Interno: Roteiro de Execução",
      subtitulo:
        "Provimento CNJ n. 213/2026 e LGPD · dimensionamento comercial e execução",
      serventia: d.serventia,
      identificacao: [
        [
          d.municipio ? `${d.municipio}/${d.uf}` : d.uf,
          d.cns ? `CNS ${d.cns}` : null,
          MODELO_LABEL[d.modeloSolucao],
        ]
          .filter(Boolean)
          .join("  ·  "),
        `Contato: ${[d.contatoNome, d.contatoEmail, d.contatoWhatsapp].filter(Boolean).join("  ·  ")}`,
      ],
      classe: `Classe ${d.classe}${d.subclasse ?? ""} (estimada)`,
      subclasse: d.subclasse
        ? `Subclasse estimada: ${d.subclasse} (art. 16, A a J). É a régua de dimensionamento e preço da proposta.`
        : "Subclasse não estimada. A subclasse (art. 16, A a J) é a régua de dimensionamento e preço da proposta.",
      ressalva: RESSALVA_CLASSE,
      parametrosTecnicos: p
        ? `Parâmetros mínimos da classe: backup completo a cada ${p.bkp} · RPO ${p.rpo} · RTO ${p.rto} · teste de restauração ${p.rest} · internet de referência ${p.net}`
        : null,
      emitidoEm: `Emitido em ${emitidoEm}`,
    },
    prazo: {
      titulo: "Prazo",
      linhas: linhasPrazo(dados),
      vencido: dados.prazos.diasRestantesInicial < 0,
    },
    veredito: veredito(dados),
    execucao: {
      titulo: "Execução por etapa",
      introducao:
        "Cada gap traz o apontamento entregue ao cliente e, abaixo, o que foi omitido de lá: roteiro de execução, natureza do trabalho, artefato final e esforço estimado.",
      vazio:
        etapas.length === 0
          ? "Nenhum gap identificado: não há execução a dimensionar."
          : null,
      etapas,
    },
    ordemExecucao: {
      titulo: "Ordem de execução",
      nota: "A sequência respeita as etapas do Anexo IV, declaradas em ordem no Justiça Aberta.",
      passos,
    },
    capexLista: {
      titulo: "CAPEX do cartório (repasse)",
      nota: "Compras do cartório, orçadas à parte. Não entram no preço do serviço: são repasse.",
      itens: capexItens,
      vazio: capexItens.length === 0 ? "Nenhuma aquisição identificada." : null,
    },
    totais: {
      titulo: "Totais de esforço",
      linhas: [
        ...etapas.map(
          (e) =>
            `Etapa ${e.numero}: ${fmtHoras(e.totalTemplate)} de template + ${fmtHoras(e.totalServentia)} por serventia.`,
        ),
        `Total: ${fmtHoras(totalTemplate)} de template (uma vez) + ${fmtHoras(totalServentia)} por serventia. CAPEX à parte, como repasse.`,
      ],
    },
    identidade:
      dados.identidadeOps.length > 0
        ? {
            titulo: "Oportunidades comerciais: identidade digital",
            nota: "Itens não pontuados no Provimento, porém vinculados aos deveres de rastreabilidade, controle de dados e atendimento aos titulares.",
            itens: dados.identidadeOps.map((op) => {
              const pitch = IDENTIDADE_PITCH[op.item];
              return {
                titulo: `OFERTA · ${pitch.titulo}`,
                descricao: semTravessao(pitch.descricao),
                argumento: semTravessao(pitch.argumento),
                situacao: `Situação declarada: ${SITUACAO_IDENTIDADE[op.valor]}.`,
              };
            }),
          }
        : null,
    rodape: `Átrios · Documento de uso interno, com roteiro de execução e dimensionamento. Não enviar ao cliente.${d.criadoPor?.name ? ` Diagnóstico conduzido por ${d.criadoPor.name}.` : ""}${geradoPor ? ` PDF gerado por ${geradoPor} em ${emitidoEm} (geração registrada em log).` : ` Emitido em ${emitidoEm}.`}`,
  };
}

/* ---- Coleta de strings (para os testes de regra editorial) ---------------- */

/** Toda string visível do documento, recursivamente. */
export function todasAsStrings(doc: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object")
      Object.values(v as Record<string, unknown>).forEach(walk);
  };
  walk(doc);
  return out;
}
