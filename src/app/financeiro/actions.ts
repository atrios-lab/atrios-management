"use server";

// Escrita do Financeiro. Toda ação revalida o admin no servidor: esconder o
// item da sidebar é UX, o portão é aqui.

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import type { CategoriaId, LancamentoTipo } from "@/db/schema";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { isCategoriaId } from "@/lib/financeiro-constants";

type Result = { error?: string };

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface LancamentoInput {
  tipo: LancamentoTipo;
  descricao: string;
  valorCentavos: number;
  /** Data civil "YYYY-MM-DD". */
  data: string;
  categoriaId: CategoriaId;
  produtoId?: string | null;
}

/** Retorna o id do admin, ou a mensagem de erro que a UI deve mostrar. */
async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Sessão expirada." };
  if ((session.user as { role?: string }).role !== "admin")
    return { error: "O Financeiro é restrito a admins." };
  return { userId: session.user.id };
}

function validate(input: LancamentoInput): string | null {
  if (input.tipo !== "receita" && input.tipo !== "despesa")
    return "Tipo inválido.";
  if (!input.descricao.trim()) return "Informe a descrição.";
  if (!Number.isSafeInteger(input.valorCentavos) || input.valorCentavos <= 0)
    return "Informe um valor maior que zero.";
  if (!DATA_RE.test(input.data) || Number.isNaN(Date.parse(input.data)))
    return "Data inválida.";
  if (!isCategoriaId(input.categoriaId)) return "Selecione a categoria.";
  return null;
}

/** Produto é opcional; se veio, tem que existir (FK com onDelete: set null). */
async function resolveProdutoId(id: string | null | undefined) {
  if (!id) return null;
  const p = await db.query.product.findFirst({
    where: eq(schema.product.id, id),
    columns: { id: true },
  });
  return p?.id ?? null;
}

export async function criarLancamento(input: LancamentoInput): Promise<Result> {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;
  const invalid = validate(input);
  if (invalid) return { error: invalid };

  await db.insert(schema.lancamento).values({
    tipo: input.tipo,
    descricao: input.descricao.trim(),
    valorCentavos: input.valorCentavos,
    data: input.data,
    categoriaId: input.categoriaId,
    produtoId: await resolveProdutoId(input.produtoId),
    criadoPorId: gate.userId,
    atualizadoPorId: gate.userId,
  });
  revalidatePath("/financeiro");
  return {};
}

export async function atualizarLancamento(
  id: string,
  input: LancamentoInput,
): Promise<Result> {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;
  const invalid = validate(input);
  if (invalid) return { error: invalid };

  const [updated] = await db
    .update(schema.lancamento)
    .set({
      tipo: input.tipo,
      descricao: input.descricao.trim(),
      valorCentavos: input.valorCentavos,
      data: input.data,
      categoriaId: input.categoriaId,
      produtoId: await resolveProdutoId(input.produtoId),
      atualizadoPorId: gate.userId,
    })
    .where(eq(schema.lancamento.id, id))
    .returning({ id: schema.lancamento.id });
  if (!updated) return { error: "Lançamento não encontrado." };

  revalidatePath("/financeiro");
  return {};
}

export async function excluirLancamento(id: string): Promise<Result> {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;

  const [removed] = await db
    .delete(schema.lancamento)
    .where(eq(schema.lancamento.id, id))
    .returning({ id: schema.lancamento.id });
  if (!removed) return { error: "Lançamento não encontrado." };

  revalidatePath("/financeiro");
  return {};
}
