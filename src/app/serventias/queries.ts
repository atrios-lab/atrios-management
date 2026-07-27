// Monta a base de prospecção com os campos DERIVADOS na leitura (base de
// arrecadação, classe estimada, prazos e dias restantes). Nada disso é coluna:
// reusa o motor do diagnóstico + parametro_norma. Uma linha em parametro_norma
// muda → todas as datas mudam junto, sem deploy.

import { desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  baseArrecadacao,
  calcularPrazos,
  classePorArrecadacao,
  type ParametroRow,
  parametrosParaClasse,
  subclassePorReceita,
  type TetosNorma,
  tetosDaNorma,
} from "@/lib/diagnostico/motor";

export interface ServentiaComputed {
  cns: string;
  nome: string;
  cidade: string;
  uf: string;
  situacao: string;
  /** situação != "PROVIDO" (vaga/interina/em diligência) */
  vaga: boolean;
  tipo: string | null;
  natureza: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  responsavel: string | null;
  ingresso: string | null;
  arrecPeriodo: string | null;
  /** base de enquadramento: arrec_atual, ou arrec_anterior se aquele veio zerado */
  base: number;
  /** classe ESTIMADA (art. 16 §1º: oficial é a declarada pela serventia) */
  classe: number;
  /** subclasse ESTIMADA (art. 16, A a J — régua de dimensionamento e preço) */
  subclasse: string;
  limiteInicial: Date;
  limiteTotal: Date;
  diasRestantesInicial: number;
  diasRestantesTotal: number;
  /** diagnóstico mais recente vinculado por CNS (null = ainda não abordada) */
  diagnosticoId: string | null;
}

function computar(
  s: typeof schema.serventia.$inferSelect,
  parametroRows: ParametroRow[],
  tetos: TetosNorma,
  hoje: Date,
  diagnosticoId: string | null,
): ServentiaComputed {
  const base = baseArrecadacao(
    Number(s.arrecAtual ?? 0),
    Number(s.arrecAnterior ?? 0),
  );
  const classe = classePorArrecadacao(
    base,
    tetos.tetoClasse1,
    tetos.tetoClasse2,
  );
  const subclasse = subclassePorReceita(
    base,
    tetos.tetoClasse1,
    tetos.tetoClasse2,
  );
  const parametros = parametrosParaClasse(parametroRows, classe, s.uf);
  const prazos = calcularPrazos(parametros, hoje);
  return {
    cns: s.cns,
    nome: s.nome,
    cidade: s.cidade,
    uf: s.uf,
    situacao: s.situacao,
    vaga: s.situacao !== "PROVIDO",
    tipo: s.tipo,
    natureza: s.natureza,
    telefone: s.telefone,
    email: s.email,
    endereco: s.endereco,
    responsavel: s.responsavel,
    ingresso: s.ingresso,
    arrecPeriodo: s.arrecPeriodo,
    base,
    classe,
    subclasse,
    limiteInicial: prazos.limiteInicial,
    limiteTotal: prazos.limiteTotal,
    diasRestantesInicial: prazos.diasRestantesInicial,
    diasRestantesTotal: prazos.diasRestantesTotal,
    diagnosticoId,
  };
}

/** cns → id do diagnóstico mais recente vinculado. */
async function mapaDiagnosticos(): Promise<Map<string, string>> {
  const diags = await db
    .select({
      cns: schema.diagnostico.cns,
      id: schema.diagnostico.id,
    })
    .from(schema.diagnostico)
    .where(isNotNull(schema.diagnostico.cns))
    .orderBy(desc(schema.diagnostico.updatedAt));
  const mapa = new Map<string, string>();
  for (const d of diags) if (d.cns && !mapa.has(d.cns)) mapa.set(d.cns, d.id);
  return mapa;
}

export async function getServentias(): Promise<ServentiaComputed[]> {
  const [serventias, parametroRows, diagPorCns] = await Promise.all([
    db.query.serventia.findMany(),
    db.query.parametroNorma.findMany(),
    mapaDiagnosticos(),
  ]);
  const tetos = tetosDaNorma(parametroRows);
  const hoje = new Date();
  return serventias.map((s) =>
    computar(s, parametroRows, tetos, hoje, diagPorCns.get(s.cns) ?? null),
  );
}

export async function getServentia(
  cns: string,
): Promise<ServentiaComputed | null> {
  const [s, parametroRows, diagPorCns] = await Promise.all([
    db.query.serventia.findFirst({ where: eq(schema.serventia.cns, cns) }),
    db.query.parametroNorma.findMany(),
    mapaDiagnosticos(),
  ]);
  if (!s) return null;
  const tetos = tetosDaNorma(parametroRows);
  return computar(
    s,
    parametroRows,
    tetos,
    new Date(),
    diagPorCns.get(cns) ?? null,
  );
}
