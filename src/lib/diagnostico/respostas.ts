// Gravação de respostas do diagnóstico — compartilhada entre o roteiro interno
// (salvarRespostas) e o formulário público de autoavaliação. Uma única rotina
// para as duas portas de entrada: nunca duas gravações divergentes.

import { eq } from "drizzle-orm";
import type { db } from "@/db";
import type { IdentidadeItem, RespostaValor } from "@/db/schema";
import * as schema from "@/db/schema";

export const VALORES_RESPOSTA: RespostaValor[] = [
  "sim",
  "parcial",
  "nao",
  "nao_sei",
];
export const ITENS_IDENTIDADE: IdentidadeItem[] = ["site", "email", "fone"];

export function valorValido(v: unknown): v is RespostaValor {
  return VALORES_RESPOSTA.includes(v as RespostaValor);
}

export function itemIdentidadeValido(v: unknown): v is IdentidadeItem {
  return ITENS_IDENTIDADE.includes(v as IdentidadeItem);
}

/** Conexão ou transação Drizzle (o `tx` de `db.transaction` também serve). */
type Executor = Pick<typeof db, "insert" | "update">;

/**
 * Upsert das respostas (requisitos e identidade digital) e "toque" no
 * `updated_at` do diagnóstico (alimenta o "há X" e a ordenação da listagem).
 * Não valida valores/itens — os chamadores filtram antes.
 */
export async function upsertRespostas(
  tx: Executor,
  diagnosticoId: string,
  respostas: { requisitoId: string; valor: RespostaValor }[],
  identidade: { item: IdentidadeItem; valor: RespostaValor }[],
): Promise<void> {
  for (const r of respostas) {
    await tx
      .insert(schema.resposta)
      .values({ diagnosticoId, requisitoId: r.requisitoId, valor: r.valor })
      .onConflictDoUpdate({
        target: [schema.resposta.diagnosticoId, schema.resposta.requisitoId],
        set: { valor: r.valor, updatedAt: new Date() },
      });
  }
  for (const r of identidade) {
    await tx
      .insert(schema.respostaIdentidade)
      .values({ diagnosticoId, item: r.item, valor: r.valor })
      .onConflictDoUpdate({
        target: [
          schema.respostaIdentidade.diagnosticoId,
          schema.respostaIdentidade.item,
        ],
        set: { valor: r.valor, updatedAt: new Date() },
      });
  }
  await tx
    .update(schema.diagnostico)
    .set({ updatedAt: new Date() })
    .where(eq(schema.diagnostico.id, diagnosticoId));
}
