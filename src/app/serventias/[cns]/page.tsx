import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@/components/icons";
import { Button } from "@/components/ui";
import { getServentia } from "../queries";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const fmtData = (d: Date) => d.toLocaleDateString("pt-BR");

function Linha({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-fg-8">
        {rotulo}
      </span>
      <span className="text-[13.5px] text-fg-2">{valor || "—"}</span>
    </div>
  );
}

export default async function ServentiaPage({
  params,
}: {
  params: Promise<{ cns: string }>;
}) {
  const { cns } = await params;
  const s = await getServentia(cns);
  if (!s) notFound();

  const dias = s.diasRestantesInicial;
  const corDias = dias < 0 ? "#eb5757" : dias <= 30 ? "#f2994a" : "#4cb782";
  const especialidades = s.natureza?.split(" | ").filter(Boolean) ?? [];
  const whats = s.telefone?.replace(/\D/g, "");

  return (
    <>
      <header className="flex h-[53px] shrink-0 items-center gap-[9px] border-b border-line px-5">
        <Link
          href="/serventias"
          className="flex items-center gap-1.5 text-xs text-fg-6 transition-colors duration-200 hover:text-fg-2"
        >
          <ArrowLeftIcon />
          Serventias
        </Link>
        <span className="text-fg-9">/</span>
        <span className="truncate text-sm font-semibold text-fg-1">
          {s.nome}
        </span>
        <span className="shrink-0 text-xs text-fg-8">
          {s.cidade} · {s.uf}
        </span>
      </header>
      <div className="flex-1 overflow-auto p-5">
        <div className="mx-auto max-w-[720px]">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {s.vaga && (
              <span className="rounded-chip bg-[#f2994a1f] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#f2994a]">
                {s.situacao || "Vaga"}
              </span>
            )}
            <span className="rounded-chip bg-[rgba(94,106,210,0.14)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-primary-ink">
              Classe {s.classe}
              {s.subclasse} estimada
            </span>
            <span className="text-xs text-fg-8">CNS {s.cns}</span>
          </div>

          {/* Prazo — o dado que decide a priorização */}
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-panel border border-line bg-surface-card p-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-fg-8">
                Prazo Etapas 1+2 (art. 20 + prorrogação RN)
              </span>
              <span className="text-[15px] font-semibold text-fg-1">
                {fmtData(s.limiteInicial)}
                <span
                  className="ml-2 text-[13px] font-medium"
                  style={{ color: corDias }}
                >
                  {dias < 0 ? `vencido há ${-dias}d` : `${dias} dias`}
                </span>
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-fg-8">
                Prazo global (todas as etapas, art. 23)
              </span>
              <span className="text-[13.5px] text-fg-3">
                {fmtData(s.limiteTotal)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-5 rounded-panel border border-line bg-surface-card p-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Linha rotulo="Responsável" valor={s.responsavel} />
              <Linha rotulo="Tipo" valor={s.tipo} />
              <Linha
                rotulo="Arrecadação (base de enquadramento)"
                valor={brl.format(s.base)}
              />
              <Linha rotulo="Semestre" valor={s.arrecPeriodo} />
              <Linha rotulo="Telefone / WhatsApp" valor={s.telefone} />
              <Linha rotulo="E-mail" valor={s.email} />
              <Linha rotulo="Endereço" valor={s.endereco} />
              <Linha
                rotulo="Ingresso"
                valor={
                  s.ingresso
                    ? fmtData(new Date(`${s.ingresso}T12:00:00`))
                    : null
                }
              />
            </div>

            {especialidades.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t border-line pt-4">
                <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-fg-8">
                  Atribuições
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {especialidades.map((e) => (
                    <span
                      key={e}
                      className="rounded-chip border border-line-field px-2 py-0.5 text-[11.5px] text-fg-5"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 border-t border-line pt-4">
              {s.diagnosticoId ? (
                <Link href={`/diagnosticos/${s.diagnosticoId}`}>
                  <Button>Ver diagnóstico</Button>
                </Link>
              ) : (
                <Link href={`/diagnosticos/novo?cns=${s.cns}`}>
                  <Button>Novo diagnóstico</Button>
                </Link>
              )}
              {whats && (
                <a
                  href={`https://wa.me/55${whats}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center rounded-btn border border-[rgba(76,183,130,0.45)] px-3.5 text-[13px] font-medium text-[#58c48f] transition-colors hover:bg-[rgba(76,183,130,0.08)]"
                >
                  Chamar no WhatsApp
                </a>
              )}
              {s.email && (
                <a
                  href={`mailto:${s.email}`}
                  className="inline-flex h-9 items-center rounded-btn border border-line-field px-3.5 text-[13px] font-medium text-fg-3 transition-colors hover:border-line-hover"
                >
                  Enviar e-mail
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
