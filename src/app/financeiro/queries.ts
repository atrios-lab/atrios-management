// Consultas do Financeiro. O extrato do mês vem inteiro (dezenas de linhas);
// o saldo é agregado no banco porque acumula desde o primeiro lançamento.

import { and, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { lancamento } from "@/db/schema";
import {
  intervaloDoMes,
  type Mes,
  SALDO_INICIAL_CENTAVOS,
} from "@/lib/financeiro-constants";
import { formatRelative, STAGES } from "@/lib/product-constants";
import type { LancamentoRow, ProdutoOption, Resumo } from "./financeiro-view";

export async function lancamentosDoMes(mes: Mes): Promise<LancamentoRow[]> {
  const { inicio, fim } = intervaloDoMes(mes);
  const rows = await db.query.lancamento.findMany({
    where: and(gte(lancamento.data, inicio), lt(lancamento.data, fim)),
    orderBy: (t, { desc }) => [desc(t.data), desc(t.criadoEm)],
    with: {
      produto: { columns: { name: true, stage: true } },
      criadoPor: { columns: { name: true } },
    },
  });
  return rows.map((l) => ({
    id: l.id,
    tipo: l.tipo,
    descricao: l.descricao,
    valorCentavos: l.valorCentavos,
    data: l.data,
    categoriaId: l.categoriaId,
    produtoId: l.produtoId,
    produtoNome: l.produto?.name ?? null,
    produtoCor: l.produto ? (STAGES[l.produto.stage] ?? STAGES[0]).color : null,
    criadoPorNome: l.criadoPor?.name ?? null,
    criadoEmRelativo: formatRelative(l.criadoEm),
  }));
}

/** Entradas/saídas do mês somam as linhas já carregadas; o saldo vem do banco. */
export async function resumoDoMes(
  mes: Mes,
  rows: LancamentoRow[],
): Promise<Resumo> {
  const { fim } = intervaloDoMes(mes);
  const [agg] = await db
    .select({
      // int4 somado vira bigint → o driver devolve string; Number é seguro
      // (9e15 centavos ≫ qualquer caixa real).
      saldo: sql<string>`coalesce(sum(case when ${lancamento.tipo} = 'receita'
        then ${lancamento.valorCentavos} else -${lancamento.valorCentavos} end), 0)`,
    })
    .from(lancamento)
    .where(lt(lancamento.data, fim));

  let entradas = 0;
  let saidas = 0;
  for (const l of rows) {
    if (l.tipo === "receita") entradas += l.valorCentavos;
    else saidas += l.valorCentavos;
  }
  return {
    entradas,
    saidas,
    resultado: entradas - saidas,
    saldo: SALDO_INICIAL_CENTAVOS + Number(agg?.saldo ?? 0),
  };
}

export async function produtoOptions(): Promise<ProdutoOption[]> {
  const produtos = await db.query.product.findMany({
    columns: { id: true, name: true, stage: true },
    orderBy: (p, { asc }) => asc(p.name),
  });
  return produtos.map((p) => ({
    id: p.id,
    nome: p.name,
    cor: (STAGES[p.stage] ?? STAGES[0]).color,
  }));
}
