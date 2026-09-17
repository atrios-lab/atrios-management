"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import type { IdentidadeItem, RespostaValor } from "@/db/schema";
import * as schema from "@/db/schema";
import {
  type EnquadramentoInput,
  type ErrosRespondente,
  estadoLink,
  faltantesParaEnvio,
  linkEditavel,
  type RespondenteInput,
  validarEnquadramento,
  validarRespondente,
} from "@/lib/diagnostico/autoavaliacao";
import { IDENTIDADE_QUESTOES } from "@/lib/diagnostico/constants";
import { dispensadoParaClasse, etapasDoEscopo } from "@/lib/diagnostico/motor";
import { truncarIp } from "@/lib/diagnostico/pre-cadastro";
import {
  itemIdentidadeValido,
  upsertRespostas,
  valorValido,
} from "@/lib/diagnostico/respostas";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/landing/config";
import { publish } from "@/lib/realtime/publish";
import { channels } from "@/lib/realtime/types";

// Actions do formulário público. Toda action recebe o TOKEN e resolve o
// diagnóstico por ele — nunca por id vindo do cliente. Sem sessão por
// definição: o token (256 bits, com validade e revogação) é a autorização.
// A regra vive em lib/diagnostico/autoavaliacao; aqui só ligamos ao banco.

const NOTIFY_EMAIL = process.env.LEAD_NOTIFY_EMAIL || "contato@atrioss.com";
const LINK_INVALIDO =
  "Este link não é mais válido. Peça um novo link à Átrios.";
const IDENTIFIQUE_SE = "Preencha seus dados antes de responder.";

type Ok = { ok: true };
type Falha = { ok: false; error: string };

/** Token sem cara de token nem vai ao banco. */
function tokenPlausivel(token: string): boolean {
  return typeof token === "string" && /^[A-Za-z0-9_-]{20,64}$/.test(token);
}

async function carregarLink(token: string) {
  if (!tokenPlausivel(token)) return null;
  const link = await db.query.autoavaliacao.findFirst({
    where: eq(schema.autoavaliacao.token, token),
    with: {
      diagnostico: {
        columns: {
          id: true,
          serventia: true,
          statusFunil: true,
          classe: true,
          escopo: true,
        },
        with: {
          respostas: { columns: { requisitoId: true } },
          respostasIdentidade: { columns: { item: true } },
        },
      },
    },
  });
  if (!link) return null;
  const estado = estadoLink(link, new Date());
  const d = link.diagnostico;
  const diagAberto =
    d.statusFunil === "novo" || d.statusFunil === "em_andamento";
  if (!linkEditavel(estado) || !diagAberto) return null;
  return link;
}

/** IP do visitante já truncado (LGPD), como no pré-cadastro. */
async function ipTruncado(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const bruto = fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  return truncarIp(bruto);
}

/** Ids dos requisitos que a serventia vê: escopo + classe, sem dispensados. */
async function idsAplicaveis(
  classe: number | null,
  escopo: schema.DiagnosticoEscopo,
): Promise<string[]> {
  if (classe == null) return [];
  const etapas = etapasDoEscopo(escopo);
  const todos = await db.query.requisito.findMany({
    where: eq(schema.requisito.ativo, true),
    columns: { id: true, etapa: true, classes: true, condicoes: true },
  });
  return todos
    .filter(
      (r) =>
        etapas.includes(r.etapa) &&
        r.classes.includes(classe) &&
        !dispensadoParaClasse(r.condicoes, classe),
    )
    .map((r) => r.id);
}

async function notificar(diagnosticoId: string) {
  revalidatePath(`/diagnosticos/${diagnosticoId}`);
  revalidatePath("/diagnosticos");
  revalidatePath("/diagnosticos/leads");
  await publish({
    channel: channels.diagnosticos,
    type: "changed",
    id: diagnosticoId,
  });
}

/* ---- 1. Identificação de quem responde ----------------------------------- */

export async function iniciarAutoavaliacao(
  token: string,
  input: RespondenteInput,
): Promise<Ok | { ok: false; errors: ErrosRespondente; error?: string }> {
  const link = await carregarLink(token);
  if (!link) return { ok: false, errors: {}, error: LINK_INVALIDO };
  const { data, errors } = validarRespondente(input);
  if (!data) return { ok: false, errors };

  const agora = new Date();
  await db
    .update(schema.autoavaliacao)
    .set({
      respondenteNome: data.nome,
      respondenteCargo: data.cargo,
      respondenteEmail: data.email,
      respondenteWhatsapp: data.whatsapp,
      consentimentoEm: agora,
      consentimentoPolitica: data.politicaVersao,
      ip: await ipTruncado(),
      // primeira identificação marca o início; reidentificar não reseta
      iniciadoEm: link.iniciadoEm ?? agora,
    })
    .where(eq(schema.autoavaliacao.id, link.id));
  await notificar(link.diagnosticoId);
  return { ok: true };
}

/* ---- 2. Enquadramento declarado pela serventia --------------------------- */

export async function declararEnquadramento(
  token: string,
  input: EnquadramentoInput,
): Promise<Ok | Falha> {
  const link = await carregarLink(token);
  if (!link) return { ok: false, error: LINK_INVALIDO };
  if (!link.iniciadoEm) return { ok: false, error: IDENTIFIQUE_SE };
  const { data, error } = validarEnquadramento(input);
  if (!data) return { ok: false, error: error ?? "Dados inválidos." };

  // Lead do pré-cadastro ganha classe → sai de "Novo" e entra na lista
  // principal, com roteiro aplicável (spec autoavaliacao-equipe).
  const virouAndamento = link.diagnostico.statusFunil === "novo";
  await db
    .update(schema.diagnostico)
    .set({
      classe: data.classe,
      subclasse: data.subclasse,
      modeloSolucao: data.modelo,
      enquadramentoDeclaradoEm: new Date(),
      ...(virouAndamento ? { statusFunil: "em_andamento" as const } : {}),
    })
    .where(eq(schema.diagnostico.id, link.diagnosticoId));
  await notificar(link.diagnosticoId);
  return { ok: true };
}

/* ---- 3. Uma resposta por vez (autosave) ---------------------------------- */

export type RespostaPublica =
  | { requisitoId: string; valor: RespostaValor }
  | { item: IdentidadeItem; valor: RespostaValor };

export async function responderAutoavaliacao(
  token: string,
  resposta: RespostaPublica,
): Promise<Ok | Falha> {
  const link = await carregarLink(token);
  if (!link) return { ok: false, error: LINK_INVALIDO };
  if (!link.iniciadoEm) return { ok: false, error: IDENTIFIQUE_SE };
  if (!valorValido(resposta.valor))
    return { ok: false, error: "Resposta inválida." };

  if ("item" in resposta) {
    if (!itemIdentidadeValido(resposta.item))
      return { ok: false, error: "Pergunta inválida." };
    await upsertRespostas(
      db,
      link.diagnosticoId,
      [],
      [{ item: resposta.item, valor: resposta.valor }],
    );
  } else {
    const aplicaveis = await idsAplicaveis(
      link.diagnostico.classe,
      link.diagnostico.escopo,
    );
    if (!aplicaveis.includes(resposta.requisitoId))
      return { ok: false, error: "Esta pergunta não se aplica ao cartório." };
    await upsertRespostas(
      db,
      link.diagnosticoId,
      [{ requisitoId: resposta.requisitoId, valor: resposta.valor }],
      [],
    );
  }
  // sem revalidatePath aqui: a página pública já tem o estado local, e a
  // interna atualiza pelo realtime — 40 revalidações por preenchimento é ruído
  await publish({
    channel: channels.diagnosticos,
    type: "changed",
    id: link.diagnosticoId,
  });
  return { ok: true };
}

/* ---- 4. Envio final ------------------------------------------------------ */

export async function enviarAutoavaliacao(
  token: string,
): Promise<Ok | (Falha & { faltantes?: number })> {
  const link = await carregarLink(token);
  if (!link) return { ok: false, error: LINK_INVALIDO };
  if (!link.iniciadoEm) return { ok: false, error: IDENTIFIQUE_SE };
  const d = link.diagnostico;
  if (d.classe == null)
    return {
      ok: false,
      error: "Informe a faixa de receita do cartório antes de enviar.",
    };

  // Recalcula no servidor — o cliente pode ter contado errado (ou mentido).
  const aplicaveis = await idsAplicaveis(d.classe, d.escopo);
  const faltantes = faltantesParaEnvio(
    aplicaveis,
    new Set(d.respostas.map((r) => r.requisitoId)),
    IDENTIDADE_QUESTOES.map((q) => q.item),
    new Set(d.respostasIdentidade.map((r) => r.item)),
  );
  if (faltantes.total > 0)
    return {
      ok: false,
      error: "Ainda há perguntas sem resposta.",
      faltantes: faltantes.total,
    };

  const agora = new Date();
  await db
    .update(schema.autoavaliacao)
    .set({ enviadoEm: agora })
    .where(eq(schema.autoavaliacao.id, link.id));

  const respondente = `${link.respondenteNome ?? "—"}${link.respondenteCargo ? ` (${link.respondenteCargo})` : ""}`;
  await sendEmail({
    to: NOTIFY_EMAIL,
    subject: `Autoavaliação recebida — ${d.serventia}`,
    text: [
      `Serventia: ${d.serventia}`,
      `Respondente: ${respondente}`,
      `Contato: ${link.respondenteWhatsapp ?? link.respondenteEmail ?? "—"}`,
      `Enviado em: ${agora.toLocaleString("pt-BR")}`,
      `Respostas: ${aplicaveis.length} do provimento + ${IDENTIDADE_QUESTOES.length} de identidade digital`,
      "",
      `Revisar e concluir: ${siteUrl()}/diagnosticos/${d.id}`,
    ].join("\n"),
  });
  await notificar(link.diagnosticoId);
  return { ok: true };
}
