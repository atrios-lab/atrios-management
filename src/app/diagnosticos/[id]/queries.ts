// Monta os dados do diagnóstico + relatório (página e PDF compartilham).

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import type { RespostaValor } from "@/db/schema";
import * as schema from "@/db/schema";
import {
  calcularPrazos,
  calcularScores,
  dispensadoParaClasse,
  etapasDoEscopo,
  ordenarGaps,
  type ParametrosNorma,
  PRORROGACAO_MAX_DIAS,
  type Prazos,
  parametrosParaClasse,
  statusPorScore,
} from "@/lib/diagnostico/motor";

export type DiagnosticoRow = NonNullable<
  Awaited<ReturnType<typeof getDiagnostico>>
>;

export async function getDiagnostico(id: string) {
  return db.query.diagnostico.findFirst({
    where: eq(schema.diagnostico.id, id),
    with: {
      respostas: { columns: { requisitoId: true, valor: true } },
      respostasIdentidade: { columns: { item: true, valor: true } },
      criadoPor: { columns: { name: true } },
    },
  });
}

export async function getRequisitosAplicaveis(
  classe: number | null,
  etapas: number[],
) {
  // Lead sem classe (pré-cadastro) não tem requisitos aplicáveis ainda.
  if (classe == null) return [];
  const todos = await db.query.requisito.findMany({
    where: eq(schema.requisito.ativo, true),
    orderBy: asc(schema.requisito.ordem),
  });
  return todos.filter(
    (r) => etapas.includes(r.etapa) && r.classes.includes(classe),
  );
}

export type Requisito = Awaited<
  ReturnType<typeof getRequisitosAplicaveis>
>[number];

export interface Alerta {
  tipo: "ok" | "janela" | "vencido";
  titulo: string;
  corpo: string;
  /** referência da prorrogação estadual, quando aplicada */
  fonte: string | null;
}

export interface Gap extends Requisito {
  valor: RespostaValor;
}

/** Requisito dispensado para a classe (ex.: DPO na Classe 1 — Prov. 214). */
export interface Dispensa {
  id: string;
  titulo: string;
  nota: string;
}

export interface Relatorio {
  diagnostico: DiagnosticoRow;
  etapas: number[];
  porEtapa: Record<number, number>;
  geral: number;
  gaps: Gap[];
  /** itens dispensados para a classe: fora do score, exibidos com base legal */
  dispensas: Dispensa[];
  prazos: Prazos;
  parametros: ParametrosNorma;
  alerta: Alerta;
  /** oportunidades de identidade digital (itens sem "sim") */
  identidadeOps: { item: schema.IdentidadeItem; valor: RespostaValor }[];
  /** nota de dispensa de pentest (C3 em SaaS/compartilhada) */
  notaModelo: string | null;
}

const fmt = (d: Date) => d.toLocaleDateString("pt-BR");

function montarAlerta(
  diag: DiagnosticoRow,
  porEtapa: Record<number, number>,
  prazos: Prazos,
  parametros: ParametrosNorma,
): Alerta {
  const { limiteInicial, limiteTotal, diasRestantesInicial: dias } = prazos;
  const globalTxt = `Prazo global de adequação (todas as etapas): ${fmt(limiteTotal)}.`;
  const comProrrogacao = parametros.prorrogacaoDias > 0;
  const fonte = comProrrogacao ? parametros.prorrogacaoDescricao : null;

  if ((porEtapa[1] ?? 0) >= 100 && (porEtapa[2] ?? 0) >= 100) {
    return {
      tipo: "ok",
      titulo: "Etapas 1 e 2 concluídas.",
      corpo: `Prazo global de adequação (todas as etapas): ${fmt(limiteTotal)} (${prazos.diasRestantesTotal} dias).`,
      fonte: null,
    };
  }
  if (dias < 0) {
    return {
      tipo: "vencido",
      titulo: comProrrogacao
        ? "⚠️ Prazo vencido — inclusive a prorrogação."
        : "⚠️ Prazo vencido.",
      corpo: comProrrogacao
        ? `O prazo do art. 20 para as Etapas 1 e 2 (Classe ${diag.classe}), já somada a prorrogação de ${parametros.prorrogacaoDias} dias concedida pela CGJ-${diag.uf}, venceu em ${fmt(limiteInicial)} — há ${-dias} dias. O somatório das prorrogações do art. 21 é limitado a ${PRORROGACAO_MAX_DIAS} dias. A serventia está sujeita a fiscalização e PAD (art. 24). ${globalTxt}`
        : `O prazo do art. 20 para as Etapas 1 e 2 (Classe ${diag.classe}) venceu em ${fmt(limiteInicial)} — há ${-dias} dias. O art. 21 admite prorrogações estaduais que, somadas, não podem passar de ${PRORROGACAO_MAX_DIAS} dias, mediante plano formal de adequação. A serventia está sujeita a fiscalização e PAD (art. 24). ${globalTxt}`,
      fonte,
    };
  }
  return {
    tipo: "janela",
    titulo: comProrrogacao ? "⏳ Última janela." : "⏳ Prazo em curso.",
    corpo: comProrrogacao
      ? `Com a prorrogação de ${parametros.prorrogacaoDias} dias concedida pela CGJ-${diag.uf}, as Etapas 1 e 2 devem estar concluídas até ${fmt(limiteInicial)} (${dias} dias restantes). O somatório das prorrogações do art. 21 é limitado a ${PRORROGACAO_MAX_DIAS} dias — e a decisão exige medidas mitigatórias desde já. ${globalTxt}`
      : `As Etapas 1 e 2 (art. 20, Classe ${diag.classe}) devem estar concluídas até ${fmt(limiteInicial)} (${dias} dias restantes). O art. 21 admite prorrogações estaduais que, somadas, não podem passar de ${PRORROGACAO_MAX_DIAS} dias, mediante plano formal. ${globalTxt}`,
    fonte,
  };
}

export async function getRelatorio(diag: DiagnosticoRow): Promise<Relatorio> {
  // Só diagnósticos com classe definida geram relatório (leads "novo" usam a
  // LeadNovoView e nunca chegam aqui).
  if (diag.classe == null)
    throw new Error("Diagnóstico sem classe não gera relatório.");
  const classe = diag.classe;
  const etapas = etapasDoEscopo(diag.escopo);
  const [requisitos, parametroRows] = await Promise.all([
    getRequisitosAplicaveis(classe, etapas),
    db.query.parametroNorma.findMany(),
  ]);
  const parametros = parametrosParaClasse(parametroRows, classe, diag.uf);
  const respostas = new Map<string, RespostaValor>(
    diag.respostas.map((r) => [r.requisitoId, r.valor]),
  );

  // Dispensados para a classe (ex.: DPO na Classe 1 — Prov. 214, art. 88 §4º):
  // fora do score e dos gaps, exibidos à parte com a base legal.
  const pontuaveis = requisitos.filter(
    (r) => !dispensadoParaClasse(r.condicoes, classe),
  );
  const dispensas: Dispensa[] = requisitos
    .filter((r) => dispensadoParaClasse(r.condicoes, classe))
    .map((r) => ({
      id: r.id,
      // título do apontamento, nunca a pergunta (a pergunta é método interno)
      titulo: r.apontamentoTitulo ?? r.refNormativa,
      nota: r.condicoes?.dispensaNota ?? "Dispensado para esta classe.",
    }));

  const { porEtapa, geral } = calcularScores(pontuaveis, respostas, etapas);
  const gaps = ordenarGaps(pontuaveis, respostas).map((r) => ({
    ...r,
    valor: respostas.get(r.id) ?? ("nao" as RespostaValor),
  }));
  const prazos = calcularPrazos(parametros, new Date());
  const alerta = montarAlerta(diag, porEtapa, prazos, parametros);

  const identidadeOps = diag.respostasIdentidade.filter(
    (r) => r.valor !== "sim",
  );

  // nota condicionada ao modelo (ex.: dispensa de pentest — vive no requisito)
  const reqComNota = requisitos.find(
    (r) =>
      r.condicoes?.nota &&
      r.condicoes.notaModelos?.includes(diag.modeloSolucao),
  );
  const notaModelo = reqComNota?.condicoes?.nota ?? null;

  return {
    diagnostico: diag,
    etapas,
    porEtapa,
    geral,
    gaps,
    dispensas,
    prazos,
    parametros,
    alerta,
    identidadeOps,
    notaModelo,
  };
}

export { statusPorScore };
