import Link from "next/link";
import { Filtros } from "./filtros";
import { getServentias, type ServentiaComputed } from "./queries";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const fmtData = (d: Date) => d.toLocaleDateString("pt-BR");

// Vencido = vermelho; ≤30 dias = âmbar; caso contrário neutro.
function corDias(dias: number): string {
  if (dias < 0) return "#eb5757";
  if (dias <= 30) return "#f2994a";
  return "#8a8f98";
}

function textoDias(dias: number): string {
  if (dias < 0) return `vencido há ${-dias}d`;
  return `${dias} dias`;
}

export default async function ServentiasPage({
  searchParams,
}: {
  searchParams: Promise<{ classe?: string; situacao?: string; diag?: string }>;
}) {
  const { classe, situacao, diag } = await searchParams;
  const todas = await getServentias();

  const total = todas.length;
  const comDiagnostico = todas.filter((s) => s.diagnosticoId !== null).length;

  const filtradas = todas
    .filter((s) => (classe ? s.classe === Number(classe) : true))
    .filter((s) =>
      situacao === "vaga" ? s.vaga : situacao === "provida" ? !s.vaga : true,
    )
    .filter((s) =>
      diag === "com"
        ? s.diagnosticoId !== null
        : diag === "sem"
          ? s.diagnosticoId === null
          : true,
    )
    // padrão: mais urgente primeiro (menos dias restantes nas Etapas 1+2)
    .sort((a, b) => a.diasRestantesInicial - b.diasRestantesInicial);

  const temFiltro = Boolean(classe || situacao || diag);

  return (
    <>
      <header className="flex h-[53px] shrink-0 items-center gap-[9px] border-b border-line px-5">
        <span className="text-sm font-semibold text-fg-1">Serventias</span>
        <span className="text-xs text-fg-8">{filtradas.length}</span>
        <span className="text-xs text-fg-9">
          {comDiagnostico} de {total} com diagnóstico
        </span>
      </header>
      <div className="flex-1 overflow-auto p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Filtros />
        </div>
        <p className="mb-4 text-[11.5px] leading-relaxed text-fg-8">
          Classe e subclasse são <span className="text-fg-6">estimativas</span>{" "}
          pela arrecadação declarada (proxy da receita bruta semestral do art.
          2º, XXIV), para priorização comercial — o enquadramento oficial é o
          declarado pela própria serventia (art. 16 §1º).
        </p>
        {filtradas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="text-sm text-fg-5">
              {temFiltro
                ? "Nenhuma serventia com esses filtros."
                : "Base de serventias vazia."}
            </span>
            <span className="text-xs text-fg-8">
              {temFiltro
                ? "Ajuste os filtros acima."
                : "Rode o seed: npm run db:seed:serventias."}
            </span>
          </div>
        ) : (
          <div className="overflow-hidden rounded-panel border border-line">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.05em] text-fg-8">
                  <th className="px-4 py-2.5 font-medium">Serventia</th>
                  <th className="px-3 py-2.5 font-medium">Município</th>
                  <th className="px-3 py-2.5 font-medium">Situação</th>
                  <th className="px-3 py-2.5 font-medium">Arrecadação</th>
                  <th className="px-3 py-2.5 font-medium">Classe</th>
                  <th className="px-3 py-2.5 font-medium">Prazo E1+2</th>
                  <th className="px-3 py-2.5 font-medium">Dias restantes</th>
                  <th className="px-3 py-2.5 font-medium">Diagnóstico</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((s) => (
                  <Linha key={s.cns} s={s} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Linha({ s }: { s: ServentiaComputed }) {
  return (
    <tr className="border-b border-line-subtle last:border-b-0 hover:bg-white/[0.02]">
      <td className="px-4 py-2.5">
        <Link
          href={`/serventias/${s.cns}`}
          className="text-[13px] font-medium text-fg-2 hover:text-fg-1"
        >
          {s.nome}
        </Link>
        <div className="text-[11px] text-fg-8">CNS {s.cns}</div>
      </td>
      <td className="px-3 py-2.5 text-[12.5px] text-fg-5">{s.cidade}</td>
      <td className="px-3 py-2.5">
        {s.vaga ? (
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-[#f2994a40] bg-[#f2994a14] px-2 py-0.5 text-[11.5px] font-medium text-[#f2994a]">
            {s.situacao || "Vaga"}
          </span>
        ) : (
          <span className="text-[12px] text-fg-7">Provida</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-[12.5px] text-fg-5">
        {brl.format(s.base)}
      </td>
      <td className="px-3 py-2.5 text-[12.5px] text-fg-6">
        {s.classe}
        {s.subclasse}
      </td>
      <td className="px-3 py-2.5 text-[12px] text-fg-7">
        {fmtData(s.limiteInicial)}
      </td>
      <td className="px-3 py-2.5">
        <span
          className="text-[12.5px] font-medium"
          style={{ color: corDias(s.diasRestantesInicial) }}
        >
          {textoDias(s.diasRestantesInicial)}
        </span>
      </td>
      <td className="px-3 py-2.5">
        {s.diagnosticoId ? (
          <Link
            href={`/diagnosticos/${s.diagnosticoId}`}
            className="text-[12px] font-medium text-[#4cb782] hover:underline"
          >
            Sim
          </Link>
        ) : (
          <span className="text-[12px] text-fg-9">Não</span>
        )}
      </td>
    </tr>
  );
}
