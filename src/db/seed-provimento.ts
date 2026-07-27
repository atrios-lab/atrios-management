// Seed dos dados normativos do Provimento CNJ 213/2026 — requisitos do
// Anexo IV (pergunta + apontamento do cliente + roteiro interno) e parâmetros
// de prazo. Conteúdo em src/db/provimento-data.ts (módulo puro, testado por
// src/lib/diagnostico/relatorio-doc.test.ts).
//
// Rode com: npm run db:seed:provimento
// Idempotente: upsert por id determinístico — NÃO apaga requisitos nem
// respostas existentes; atualiza textos/pesos/classes in place.
//
// A revisão editorial vive no CÓDIGO: `revisado` vem de provimento-data.ts
// (hoje true para todos) e o upsert sobrescreve o que estiver no banco — não
// marque revisão direto no banco, marque lá.

import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  montarRequisitosSeed,
  PARAMETROS,
  PARAMETROS_OBSOLETOS,
} from "./provimento-data.ts";
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

  // Parâmetros que a norma superou (ex.: prorrogação CGJ-RN pré-Prov. 243):
  // o upsert não remove linha nenhuma, então a limpeza é explícita.
  await db
    .delete(schema.parametroNorma)
    .where(inArray(schema.parametroNorma.id, PARAMETROS_OBSOLETOS));

  console.log(
    `Seed provimento: ${requisitos.length} requisitos, ${PARAMETROS.length} parâmetros (${PARAMETROS_OBSOLETOS.length} obsoletos removidos).`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
