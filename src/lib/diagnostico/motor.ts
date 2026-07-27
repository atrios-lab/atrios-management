// Motor do diagnóstico — funções puras (sem banco), espelhando a lógica do
// protótipo validado (docs/diagnostico-provimento-213.html, listener de submit).
// Requisitos e prazos chegam como dados (tabelas requisito/parametro_norma).

import type {
  DiagnosticoEscopo,
  RequisitoCondicoes,
  RespostaValor,
} from "@/db/schema";

export const VALOR_PONTOS: Record<RespostaValor, number> = {
  sim: 1,
  parcial: 0.5,
  nao: 0,
  nao_sei: 0,
};

export type StatusEtapa = "adequado" | "atencao" | "critico";

/** ≥80% adequado · 40–79% atenção · <40% crítico. */
export function statusPorScore(score: number): StatusEtapa {
  if (score >= 80) return "adequado";
  if (score >= 40) return "atencao";
  return "critico";
}

export function etapasDoEscopo(escopo: DiagnosticoEscopo): number[] {
  return escopo === "inicial" ? [1, 2] : [1, 2, 3, 4, 5];
}

/**
 * Requisito dispensado para a classe (ex.: DPO na Classe 1 — Prov. 214,
 * art. 88, §4º): continua na entrevista, mas sai do score e dos gaps.
 */
export function dispensadoParaClasse(
  condicoes: RequisitoCondicoes | null | undefined,
  classe: number,
): boolean {
  return condicoes?.dispensaClasses?.includes(classe) ?? false;
}

export interface RequisitoPontuavel {
  id: string;
  etapa: number;
  peso: number;
}

export interface Scores {
  porEtapa: Record<number, number>;
  geral: number;
}

/**
 * Score ponderado por peso, por etapa e geral (média simples das etapas),
 * ambos arredondados como no protótipo. Requisito aplicável sem resposta
 * pontua como "não".
 */
export function calcularScores(
  requisitos: RequisitoPontuavel[],
  respostas: ReadonlyMap<string, RespostaValor>,
  etapas: number[],
): Scores {
  const porEtapa: Record<number, number> = {};
  for (const etapa of etapas) {
    const rs = requisitos.filter((r) => r.etapa === etapa);
    const total = rs.reduce((s, r) => s + r.peso, 0);
    const obtido = rs.reduce(
      (s, r) => s + r.peso * VALOR_PONTOS[respostas.get(r.id) ?? "nao"],
      0,
    );
    porEtapa[etapa] = total > 0 ? Math.round((100 * obtido) / total) : 0;
  }
  const geral = Math.round(
    etapas.reduce((s, e) => s + porEtapa[e], 0) / etapas.length,
  );
  return { porEtapa, geral };
}

/** Gaps (tudo que não é "sim" pleno), do maior peso para o menor. */
export function ordenarGaps<T extends RequisitoPontuavel & { ordem: number }>(
  requisitos: T[],
  respostas: ReadonlyMap<string, RespostaValor>,
): T[] {
  return requisitos
    .filter((r) => VALOR_PONTOS[respostas.get(r.id) ?? "nao"] < 1)
    .sort((a, b) => b.peso - a.peso || a.etapa - b.etapa || a.ordem - b.ordem);
}

/* ---- Prazos (art. 20 e art. 23) ----------------------------------------- */

/**
 * Teto legal da prorrogação estadual do art. 21, §3º (redação do Prov. 243):
 * o somatório das prorrogações "não poderá ultrapassar 180 (cento e oitenta) dias".
 */
export const PRORROGACAO_MAX_DIAS = 180;

export interface ParametrosPrazo {
  vigencia: Date;
  /** art. 20: Etapas 1+2 obrigatórias, em dias */
  prazoArt20Dias: number;
  /** art. 23: todas as etapas, em meses */
  prazoArt23Meses: number;
  /** prorrogação estadual do art. 21 (0 quando a UF não tem) */
  prorrogacaoDias: number;
}

export interface Prazos {
  limiteInicial: Date;
  limiteTotal: Date;
  /** negativos = vencidos há N dias */
  diasRestantesInicial: number;
  diasRestantesTotal: number;
}

export function calcularPrazos(p: ParametrosPrazo, hoje: Date): Prazos {
  const limiteInicial = new Date(p.vigencia);
  limiteInicial.setDate(
    limiteInicial.getDate() + p.prazoArt20Dias + p.prorrogacaoDias,
  );
  const limiteTotal = new Date(p.vigencia);
  limiteTotal.setMonth(limiteTotal.getMonth() + p.prazoArt23Meses);
  const dias = (d: Date) => Math.ceil((d.getTime() - hoje.getTime()) / 864e5);
  return {
    limiteInicial,
    limiteTotal,
    diasRestantesInicial: dias(limiteInicial),
    diasRestantesTotal: dias(limiteTotal),
  };
}

/* ---- Leitura dos parâmetros da norma ------------------------------------ */

export interface ParametroRow {
  chave: string;
  valor: string;
  uf: string | null;
  descricao: string | null;
}

export interface ParametrosTecnicos {
  rpo: string;
  rto: string;
  bkp: string;
  net: string;
  rest: string;
}

export interface ParametrosNorma extends ParametrosPrazo {
  prorrogacaoDescricao: string | null;
  /** dd/mm/aaaa da decisão que concedeu a prorrogação estadual. */
  prorrogacaoData: string | null;
  /** Número do processo administrativo da decisão (ex.: "PP 0000897-..."). */
  prorrogacaoProcesso: string | null;
  tecnicos: ParametrosTecnicos | null;
}

/**
 * Monta os parâmetros do motor para uma classe/UF a partir das linhas de
 * parametro_norma. Parâmetro de UF (ex.: prorrogação do RN) só se aplica ao
 * diagnóstico daquela UF.
 */
export function parametrosParaClasse(
  rows: ParametroRow[],
  classe: number,
  uf: string,
): ParametrosNorma {
  const nacional = (chave: string) =>
    rows.find((r) => r.chave === chave && r.uf === null)?.valor;
  const vigenciaStr = nacional("vigencia");
  const art20 = nacional(`prazo_art20_dias_classe_${classe}`);
  const art23 = nacional(`prazo_art23_meses_classe_${classe}`);
  if (!vigenciaStr || !art20 || !art23) {
    throw new Error(
      `Parâmetros da norma ausentes para a classe ${classe} — rode npm run db:seed:provimento.`,
    );
  }
  const daUf = (chave: string) =>
    rows.find((r) => r.chave === chave && r.uf === uf.toUpperCase());
  const prorrogacao = daUf("prorrogacao_art20_dias");
  const prorrogacaoDias = prorrogacao ? Number(prorrogacao.valor) : 0;
  // Teto legal do art. 21, §3º (somatório de até 180 dias): um valor acima é
  // juridicamente impossível — falha alto em vez de publicar uma afirmação falsa.
  if (prorrogacaoDias > PRORROGACAO_MAX_DIAS) {
    throw new Error(
      `Prorrogação estadual (${uf}) de ${prorrogacaoDias} dias excede o limite legal do art. 21 (${PRORROGACAO_MAX_DIAS} dias).`,
    );
  }
  const tecnicosStr = nacional(`parametros_tecnicos_classe_${classe}`);
  return {
    // meio-dia local evita voltar um dia em fusos negativos
    vigencia: new Date(`${vigenciaStr}T12:00:00`),
    prazoArt20Dias: Number(art20),
    prazoArt23Meses: Number(art23),
    prorrogacaoDias,
    prorrogacaoDescricao: prorrogacao?.descricao ?? null,
    // Estruturados (e não extraídos da `descricao`, que é prosa livre) porque a
    // home cita a decisão na copy: data e processo precisam sair do banco, como
    // qualquer outro dado da norma.
    prorrogacaoData: daUf("prorrogacao_data")?.valor ?? null,
    prorrogacaoProcesso: daUf("prorrogacao_processo")?.valor ?? null,
    tecnicos: tecnicosStr
      ? (JSON.parse(tecnicosStr) as ParametrosTecnicos)
      : null,
  };
}

/* ---- Classe por receita bruta semestral (art. 16, red. Prov. 243) -------- */

/** Base de enquadramento: se o último semestre veio zerado, usa o anterior. */
export function baseArrecadacao(atual: number, anterior: number): number {
  return atual > 0 ? atual : anterior;
}

/**
 * Classe estimada (tetos vindos de parametro_norma). O enquadramento legal é
 * pela RECEITA BRUTA SEMESTRAL (art. 2º, XXIV, red. Prov. 243); a arrecadação
 * declarada entra como proxy. É uma ESTIMATIVA para priorização comercial — o
 * enquadramento oficial é o declarado pela própria serventia (art. 16 §1º).
 */
export function classePorArrecadacao(
  base: number,
  tetoClasse1: number,
  tetoClasse2: number,
): number {
  if (base <= tetoClasse1) return 1;
  if (base <= tetoClasse2) return 2;
  return 3;
}

/**
 * Subclasse estimada do art. 16 (red. Prov. 243): Classes 1 e 2 em terços do
 * teto da própria classe (A-C e D-F); Classe 3 em múltiplos do teto da
 * Classe 2 (G até 3x, H até 6x, I até 12x, J acima).
 */
export function subclassePorReceita(
  base: number,
  tetoClasse1: number,
  tetoClasse2: number,
): string {
  if (base <= tetoClasse1) {
    if (base <= tetoClasse1 / 3) return "A";
    return base <= (2 * tetoClasse1) / 3 ? "B" : "C";
  }
  if (base <= tetoClasse2) {
    if (base <= tetoClasse2 / 3) return "D";
    return base <= (2 * tetoClasse2) / 3 ? "E" : "F";
  }
  if (base <= 3 * tetoClasse2) return "G";
  if (base <= 6 * tetoClasse2) return "H";
  return base <= 12 * tetoClasse2 ? "I" : "J";
}

export interface TetosNorma {
  tetoClasse1: number;
  tetoClasse2: number;
}

/** Tetos de classe (nacionais) a partir das linhas de parametro_norma. */
export function tetosDaNorma(rows: ParametroRow[]): TetosNorma {
  const nacional = (chave: string) =>
    rows.find((r) => r.chave === chave && r.uf === null)?.valor;
  const t1 = nacional("teto_classe_1");
  const t2 = nacional("teto_classe_2");
  if (!t1 || !t2)
    throw new Error(
      "Tetos de classe ausentes em parametro_norma — rode npm run db:seed:provimento.",
    );
  return { tetoClasse1: Number(t1), tetoClasse2: Number(t2) };
}
