"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import type {
  DiagnosticoEscopo,
  DiagnosticoModelo,
  DiagnosticoStatusFunil,
  IdentidadeItem,
  RespostaValor,
} from "@/db/schema";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { expiracaoPadrao, gerarToken } from "@/lib/diagnostico/autoavaliacao";
import {
  IDENTIDADE_QUESTOES,
  SUBCLASSES,
  UFS,
} from "@/lib/diagnostico/constants";
import {
  calcularScores,
  dispensadoParaClasse,
  etapasDoEscopo,
} from "@/lib/diagnostico/motor";
import { upsertRespostas } from "@/lib/diagnostico/respostas";
import { publish } from "@/lib/realtime/publish";
import { channels } from "@/lib/realtime/types";

type Result = { error?: string };

const VALORES: RespostaValor[] = ["sim", "parcial", "nao", "nao_sei"];
const MODELOS: DiagnosticoModelo[] = [
  "propria",
  "contratada",
  "saas",
  "compartilhada",
  "nao_sei",
];
const ESCOPOS: DiagnosticoEscopo[] = ["inicial", "completo"];
const STATUS_FUNIL: DiagnosticoStatusFunil[] = [
  "novo",
  "em_andamento",
  "concluido",
  "proposta",
  "ganho",
  "perdido",
];
const ITENS_IDENTIDADE: IdentidadeItem[] = ["site", "email", "fone"];

/** Toda mutation exige sessão — qualquer membro conduz diagnósticos. */
async function requireSession() {
  return auth.api.getSession({ headers: await headers() });
}

async function notifyDiagnosticos(actorId?: string, id?: string) {
  await publish({
    channel: channels.diagnosticos,
    type: "changed",
    actorId,
    id,
  });
}

/* ---- Cadastro ------------------------------------------------------------ */

export async function createDiagnostico(input: {
  serventia: string;
  cns?: string;
  municipio?: string;
  uf: string;
  classe: number;
  subclasse?: string;
  modeloSolucao: DiagnosticoModelo;
  contatoNome: string;
  contatoEmail?: string;
  contatoWhatsapp?: string;
  escopo: DiagnosticoEscopo;
}): Promise<Result & { id?: string }> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };

  const serventia = input.serventia.trim();
  const contatoNome = input.contatoNome.trim();
  const uf = input.uf.trim().toUpperCase();
  if (!serventia) return { error: "Informe o nome da serventia." };
  if (!contatoNome) return { error: "Informe o responsável de contato." };
  if (!(UFS as readonly string[]).includes(uf))
    return { error: "UF inválida." };
  if (![1, 2, 3].includes(input.classe))
    return { error: "Selecione a faixa de receita bruta (classe)." };
  const subclasse = input.subclasse?.trim().toUpperCase() || null;
  if (subclasse && !SUBCLASSES[input.classe].includes(subclasse))
    return { error: "Subclasse inválida para a classe selecionada." };
  if (!MODELOS.includes(input.modeloSolucao))
    return { error: "Modelo de solução inválido." };
  if (!ESCOPOS.includes(input.escopo)) return { error: "Escopo inválido." };
  const contatoEmail = input.contatoEmail?.trim() || null;
  const contatoWhatsapp = input.contatoWhatsapp?.trim() || null;
  if (!contatoEmail && !contatoWhatsapp)
    return { error: "Informe e-mail ou WhatsApp de contato." };

  const [row] = await db
    .insert(schema.diagnostico)
    .values({
      serventia,
      cns: input.cns?.trim() || null,
      municipio: input.municipio?.trim() || null,
      uf,
      classe: input.classe,
      subclasse,
      modeloSolucao: input.modeloSolucao,
      contatoNome,
      contatoEmail,
      contatoWhatsapp,
      escopo: input.escopo,
      criadoPorId: session.user.id,
    })
    .returning();
  revalidatePath("/diagnosticos");
  await notifyDiagnosticos(session.user.id, row.id);
  return { id: row.id };
}

/* ---- Entrevista (salvar parcial / concluir) ------------------------------ */

export async function salvarRespostas(
  diagnosticoId: string,
  respostas: { requisitoId: string; valor: RespostaValor }[],
  identidade: { item: IdentidadeItem; valor: RespostaValor }[],
): Promise<Result> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };

  const diag = await db.query.diagnostico.findFirst({
    where: eq(schema.diagnostico.id, diagnosticoId),
    columns: { id: true, statusFunil: true },
  });
  if (!diag) return { error: "Diagnóstico não encontrado." };
  if (diag.statusFunil !== "em_andamento")
    return { error: "Diagnóstico já concluído — reabra para editar." };

  const respostasOk = respostas.filter((r) => VALORES.includes(r.valor));
  const identidadeOk = identidade.filter(
    (r) => VALORES.includes(r.valor) && ITENS_IDENTIDADE.includes(r.item),
  );

  await db.transaction((tx) =>
    upsertRespostas(tx, diagnosticoId, respostasOk, identidadeOk),
  );
  revalidatePath(`/diagnosticos/${diagnosticoId}`);
  revalidatePath("/diagnosticos");
  await notifyDiagnosticos(session.user.id, diagnosticoId);
  return {};
}

export async function concluirDiagnostico(
  diagnosticoId: string,
): Promise<Result> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };

  const diag = await db.query.diagnostico.findFirst({
    where: eq(schema.diagnostico.id, diagnosticoId),
    with: {
      respostas: { columns: { requisitoId: true, valor: true } },
      respostasIdentidade: { columns: { item: true, valor: true } },
    },
  });
  if (!diag) return { error: "Diagnóstico não encontrado." };
  if (diag.statusFunil !== "em_andamento")
    return { error: "Diagnóstico já concluído." };
  if (diag.classe == null)
    return { error: "Defina a classe do diagnóstico antes de concluir." };
  const classe = diag.classe;

  const etapas = etapasDoEscopo(diag.escopo);
  const requisitos = await db.query.requisito.findMany({
    where: eq(schema.requisito.ativo, true),
    columns: {
      id: true,
      etapa: true,
      peso: true,
      classes: true,
      condicoes: true,
    },
  });
  // Dispensados para a classe (ex.: DPO na Classe 1) não pontuam nem contam
  // como pergunta pendente — mesma regra do relatório (getRelatorio).
  const aplicaveis = requisitos.filter(
    (r) =>
      etapas.includes(r.etapa) &&
      r.classes.includes(classe) &&
      !dispensadoParaClasse(r.condicoes, classe),
  );

  const respondidos = new Set(diag.respostas.map((r) => r.requisitoId));
  const pendentes = aplicaveis.filter((r) => !respondidos.has(r.id)).length;
  if (pendentes > 0)
    return {
      error: `Ainda ${pendentes === 1 ? "falta 1 pergunta" : `faltam ${pendentes} perguntas`} do provimento. Se o entrevistado não souber, marque "Não sei".`,
    };
  const identidadeFaltando = IDENTIDADE_QUESTOES.filter(
    (q) => !diag.respostasIdentidade.some((r) => r.item === q.item),
  ).length;
  if (identidadeFaltando > 0)
    return {
      error: `Responda também as ${identidadeFaltando === 1 ? "pergunta" : "perguntas"} de identidade digital.`,
    };

  const { geral } = calcularScores(
    aplicaveis,
    new Map(diag.respostas.map((r) => [r.requisitoId, r.valor])),
    etapas,
  );
  await db
    .update(schema.diagnostico)
    .set({ scoreGeral: geral, statusFunil: "concluido" })
    .where(eq(schema.diagnostico.id, diagnosticoId));
  revalidatePath(`/diagnosticos/${diagnosticoId}`);
  revalidatePath("/diagnosticos");
  await notifyDiagnosticos(session.user.id, diagnosticoId);
  return {};
}

export async function reabrirDiagnostico(
  diagnosticoId: string,
): Promise<Result> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };
  const [updated] = await db
    .update(schema.diagnostico)
    .set({ statusFunil: "em_andamento", scoreGeral: null })
    .where(eq(schema.diagnostico.id, diagnosticoId))
    .returning();
  if (!updated) return { error: "Diagnóstico não encontrado." };
  revalidatePath(`/diagnosticos/${diagnosticoId}`);
  revalidatePath("/diagnosticos");
  await notifyDiagnosticos(session.user.id, diagnosticoId);
  return {};
}

/* ---- Funil comercial ------------------------------------------------------ */

export async function setStatusFunil(
  diagnosticoId: string,
  status: DiagnosticoStatusFunil,
): Promise<Result> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };
  if (
    !STATUS_FUNIL.includes(status) ||
    status === "em_andamento" ||
    status === "novo"
  )
    return { error: "Status inválido — use “Reabrir” para voltar a editar." };
  const diag = await db.query.diagnostico.findFirst({
    where: eq(schema.diagnostico.id, diagnosticoId),
    columns: { statusFunil: true },
  });
  if (!diag) return { error: "Diagnóstico não encontrado." };
  if (diag.statusFunil === "novo")
    return { error: "Complete o cadastro do lead antes de movê-lo no funil." };
  if (diag.statusFunil === "em_andamento")
    return { error: "Conclua o diagnóstico antes de mover no funil." };
  await db
    .update(schema.diagnostico)
    .set({ statusFunil: status })
    .where(eq(schema.diagnostico.id, diagnosticoId));
  revalidatePath(`/diagnosticos/${diagnosticoId}`);
  revalidatePath("/diagnosticos");
  await notifyDiagnosticos(session.user.id, diagnosticoId);
  return {};
}

/* ---- Link de autoavaliação (a serventia responde sozinha) ---------------- */

// Gera (ou regenera) o link público do diagnóstico. Regenerar troca só o
// segredo e a validade — respondente e respostas já gravadas ficam. É a
// equipe que amarra o link ao diagnóstico: é isso que identifica QUAL
// cartório respondeu (ver lib/diagnostico/autoavaliacao).
export async function gerarLinkAutoavaliacao(
  diagnosticoId: string,
): Promise<Result & { token?: string }> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };
  const diag = await db.query.diagnostico.findFirst({
    where: eq(schema.diagnostico.id, diagnosticoId),
    columns: { id: true, statusFunil: true },
  });
  if (!diag) return { error: "Diagnóstico não encontrado." };
  if (diag.statusFunil !== "novo" && diag.statusFunil !== "em_andamento")
    return { error: "Reabra o diagnóstico para gerar o link." };

  const agora = new Date();
  const token = gerarToken();
  const values = {
    token,
    expiraEm: expiracaoPadrao(agora),
    revogadoEm: null,
    criadoPorId: session.user.id,
  };
  await db
    .insert(schema.autoavaliacao)
    .values({ diagnosticoId, ...values })
    .onConflictDoUpdate({
      target: schema.autoavaliacao.diagnosticoId,
      set: values,
    });
  revalidatePath(`/diagnosticos/${diagnosticoId}`);
  await notifyDiagnosticos(session.user.id, diagnosticoId);
  return { token };
}

export async function revogarLinkAutoavaliacao(
  diagnosticoId: string,
): Promise<Result> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };
  const [updated] = await db
    .update(schema.autoavaliacao)
    .set({ revogadoEm: new Date() })
    .where(eq(schema.autoavaliacao.diagnosticoId, diagnosticoId))
    .returning({ id: schema.autoavaliacao.id });
  if (!updated) return { error: "Este diagnóstico não tem link gerado." };
  revalidatePath(`/diagnosticos/${diagnosticoId}`);
  await notifyDiagnosticos(session.user.id, diagnosticoId);
  return {};
}

/* ---- Vínculo com a base de serventias ------------------------------------ */

// Vincula um lead/diagnóstico a uma serventia da base de prospecção (grava o
// CNS). Vinculação MANUAL pelo dropdown do município — sem fuzzy matching.
/** `cns: null` desvincula — o lead volta a não apontar pra serventia nenhuma. */
export async function vincularServentia(
  diagnosticoId: string,
  cns: string | null,
): Promise<Result> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };
  if (cns !== null) {
    const serventia = await db.query.serventia.findFirst({
      where: eq(schema.serventia.cns, cns),
      columns: { cns: true },
    });
    if (!serventia) return { error: "Serventia não encontrada." };
  }
  const [updated] = await db
    .update(schema.diagnostico)
    .set({ cns })
    .where(eq(schema.diagnostico.id, diagnosticoId))
    .returning();
  if (!updated) return { error: "Lead não encontrado." };
  revalidatePath("/diagnosticos/leads");
  revalidatePath("/serventias");
  await notifyDiagnosticos(session.user.id, diagnosticoId);
  return {};
}

export async function deleteDiagnostico(
  diagnosticoId: string,
): Promise<Result> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };
  const [deleted] = await db
    .delete(schema.diagnostico)
    .where(eq(schema.diagnostico.id, diagnosticoId))
    .returning();
  if (!deleted) return { error: "Diagnóstico não encontrado." };
  revalidatePath("/diagnosticos");
  // Leads são diagnósticos com status "novo" e vivem na sua própria rota: sem
  // isto a linha excluída fica na tela até o próximo refresh.
  revalidatePath("/diagnosticos/leads");
  await notifyDiagnosticos(session.user.id, diagnosticoId);
  return {};
}
