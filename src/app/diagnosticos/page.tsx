import { and, desc, eq, gte, isNotNull, lt } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { Button } from "@/components/ui";
import { db } from "@/db";
import type { DiagnosticoStatusFunil } from "@/db/schema";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { ESCOPO_LABEL, STATUS_FUNIL_LABEL } from "@/lib/diagnostico/constants";
import { statusPorScore } from "@/lib/diagnostico/motor";
import { formatRelative } from "@/lib/product-constants";
import { channels } from "@/lib/realtime/types";
import { Filtros } from "./filtros";
import { FunilSelect } from "./funil-select";

const SCORE_COR: Record<string, string> = {
  adequado: "#4cb782",
  atencao: "#f2994a",
  critico: "#eb5757",
};

const STATUS_LABEL: Record<string, string> = {
  adequado: "Adequado",
  atencao: "Atenção",
  critico: "Crítico",
};

export default async function DiagnosticosPage({
  searchParams,
}: {
  searchParams: Promise<{
    uf?: string;
    classe?: string;
    status?: string;
    score?: string;
  }>;
}) {
  const { uf, classe, status, score } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });

  const where = and(
    uf ? eq(schema.diagnostico.uf, uf.toUpperCase()) : undefined,
    classe ? eq(schema.diagnostico.classe, Number(classe)) : undefined,
    status
      ? eq(schema.diagnostico.statusFunil, status as DiagnosticoStatusFunil)
      : undefined,
    score === "adequado" ? gte(schema.diagnostico.scoreGeral, 80) : undefined,
    score === "atencao"
      ? and(
          gte(schema.diagnostico.scoreGeral, 40),
          lt(schema.diagnostico.scoreGeral, 80),
        )
      : undefined,
    score === "critico"
      ? and(
          isNotNull(schema.diagnostico.scoreGeral),
          lt(schema.diagnostico.scoreGeral, 40),
        )
      : undefined,
  );

  const diagnosticos = await db.query.diagnostico.findMany({
    where,
    orderBy: desc(schema.diagnostico.updatedAt),
    with: { criadoPor: { columns: { name: true } } },
  });

  const temFiltro = Boolean(uf || classe || status || score);

  return (
    <>
      <header className="flex h-[53px] shrink-0 items-center gap-[9px] border-b border-line px-5">
        <span className="text-sm font-semibold text-fg-1">Diagnósticos</span>
        <span className="text-xs text-fg-8">{diagnosticos.length}</span>
        <span className="text-xs text-fg-9">Provimento CNJ 213/2026</span>
        <div className="ml-auto" />
        <Link href="/diagnosticos/novo">
          <Button>Novo diagnóstico</Button>
        </Link>
      </header>
      <div className="flex-1 overflow-auto p-5">
        <div className="mb-4">
          <Filtros />
        </div>
        {diagnosticos.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="text-sm text-fg-5">
              {temFiltro
                ? "Nenhum diagnóstico com esses filtros."
                : "Nenhum diagnóstico registrado."}
            </span>
            <span className="text-xs text-fg-8">
              {temFiltro
                ? "Ajuste os filtros acima."
                : "Comece com “Novo diagnóstico” — o roteiro guia a call."}
            </span>
          </div>
        )}
        {diagnosticos.length > 0 && (
          <div className="overflow-hidden rounded-panel border border-line">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.05em] text-fg-8">
                  <th className="px-4 py-2.5 font-medium">Serventia</th>
                  <th className="px-3 py-2.5 font-medium">UF</th>
                  <th className="px-3 py-2.5 font-medium">Classe</th>
                  <th className="px-3 py-2.5 font-medium">Escopo</th>
                  <th className="px-3 py-2.5 font-medium">Score</th>
                  <th className="px-3 py-2.5 font-medium">Funil</th>
                  <th className="px-3 py-2.5 font-medium">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {diagnosticos.map((d) => {
                  const st =
                    d.scoreGeral !== null ? statusPorScore(d.scoreGeral) : null;
                  return (
                    <tr
                      key={d.id}
                      className="border-b border-line-subtle last:border-b-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/diagnosticos/${d.id}`}
                          className="text-[13px] font-medium text-fg-2 hover:text-fg-1"
                        >
                          {d.serventia}
                        </Link>
                        <div className="text-[11px] text-fg-8">
                          {d.contatoNome}
                          {d.criadoPor?.name
                            ? ` · por ${d.criadoPor.name}`
                            : ""}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[12.5px] text-fg-5">
                        {d.uf}
                        {d.municipio ? (
                          <span className="text-fg-8"> · {d.municipio}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-[12.5px] text-fg-5">
                        {d.classe}
                        {d.subclasse ?? ""}
                      </td>
                      <td className="px-3 py-2.5 text-[12.5px] text-fg-7">
                        {ESCOPO_LABEL[d.escopo].split(" — ")[0]}
                      </td>
                      <td className="px-3 py-2.5">
                        {d.scoreGeral !== null && st ? (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[11.5px] font-medium"
                            style={{
                              color: SCORE_COR[st],
                              borderColor: `${SCORE_COR[st]}40`,
                              background: `${SCORE_COR[st]}14`,
                            }}
                          >
                            {d.scoreGeral}% · {STATUS_LABEL[st]}
                          </span>
                        ) : (
                          <span className="text-[12px] text-fg-9">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {d.statusFunil === "em_andamento" ? (
                          <span className="inline-flex items-center gap-1.5 text-[12px] text-fg-6">
                            <span className="size-1.5 rounded-full bg-[#8a8f98]" />
                            {STATUS_FUNIL_LABEL.em_andamento}
                          </span>
                        ) : (
                          <FunilSelect
                            diagnosticoId={d.id}
                            status={d.statusFunil}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-fg-8">
                        {formatRelative(d.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <RealtimeRefresh
        channel={channels.diagnosticos}
        selfId={session?.user.id}
      />
    </>
  );
}
