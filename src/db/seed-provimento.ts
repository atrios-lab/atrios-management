// Seed dos dados normativos do Provimento CNJ 213/2026 — requisitos do
// Anexo IV (pergunta + apontamento do cliente + roteiro interno) e parâmetros
// de prazo. Conteúdo em src/db/provimento-data.ts (módulo puro, testado por
// src/lib/diagnostico/relatorio-doc.test.ts).
//
// Rode com: npm run db:seed:provimento
// Idempotente: upsert por id determinístico — NÃO apaga requisitos nem
// respostas existentes; atualiza textos/pesos/classes in place.
//
// ATENÇÃO: o upsert sobrescreve `revisado` com false. Enquanto a revisão
// editorial dos textos for feita direto no banco, preserve a coluna antes de
// rodar o seed em produção (ou mova a revisão para este arquivo).

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { montarRequisitosSeed, PARAMETROS } from "./provimento-data.ts";
import * as schema from "./schema.ts";

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), {
  schema,
});

async function main() {
  const requisitos = montarRequisitosSeed();
  for (const values of requisitos) {
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
    `Seed provimento: ${requisitos.length} requisitos, ${PARAMETROS.length} parâmetros.`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
