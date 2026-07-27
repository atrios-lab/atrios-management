import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";
import { formatRelative } from "@/lib/product-constants";
import type { DiagnosticoRow } from "./queries";

// Visão de lead recém-chegado do pré-cadastro público (status "novo"). Ainda não
// tem classe/arrecadação, então não há relatório nem entrevista: a equipe usa
// estes dados para o primeiro contato e depois completa o cadastro.

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

export function LeadNovoView({ diag }: { diag: DiagnosticoRow }) {
  return (
    <>
      <header className="flex h-[53px] shrink-0 items-center gap-[9px] border-b border-line px-5">
        <Link
          href="/diagnosticos"
          className="flex items-center gap-1.5 text-xs text-fg-6 transition-colors duration-200 hover:text-fg-2"
        >
          <ArrowLeftIcon />
          Diagnósticos
        </Link>
        <span className="text-fg-9">/</span>
        <span className="truncate text-sm font-semibold text-fg-1">
          {diag.serventia}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-fg-6">
          <span className="size-1.5 rounded-full bg-[#8b93ec]" />
          Novo
        </span>
      </header>
      <div className="flex-1 overflow-auto p-5">
        <div className="mx-auto max-w-[720px]">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-chip bg-[rgba(94,106,210,0.14)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-primary-ink">
              Pré-cadastro
            </span>
            <span className="text-xs text-fg-8">
              recebido {formatRelative(diag.createdAt)}
            </span>
          </div>

          <div className="flex flex-col gap-5 rounded-panel border border-line bg-surface-card p-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Linha rotulo="Serventia" valor={diag.serventia} />
              <Linha rotulo="Atribuição" valor={diag.atribuicao} />
              <Linha
                rotulo="Município / UF"
                valor={
                  diag.municipio ? `${diag.municipio} / ${diag.uf}` : diag.uf
                }
              />
              <Linha
                rotulo="Contato"
                valor={
                  diag.contatoCargo
                    ? `${diag.contatoNome} (${diag.contatoCargo})`
                    : diag.contatoNome
                }
              />
              <Linha rotulo="E-mail" valor={diag.contatoEmail} />
              <Linha rotulo="WhatsApp" valor={diag.contatoWhatsapp} />
            </div>

            <div className="flex flex-wrap gap-3 border-t border-line pt-4">
              {diag.contatoWhatsapp && (
                <a
                  href={`https://wa.me/55${diag.contatoWhatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center rounded-btn border border-[rgba(76,183,130,0.45)] px-3.5 text-[13px] font-medium text-[#58c48f] transition-colors hover:bg-[rgba(76,183,130,0.08)]"
                >
                  Chamar no WhatsApp
                </a>
              )}
              {diag.contatoEmail && (
                <a
                  href={`mailto:${diag.contatoEmail}`}
                  className="inline-flex h-9 items-center rounded-btn border border-line-field px-3.5 text-[13px] font-medium text-fg-3 transition-colors hover:border-line-hover"
                >
                  Enviar e-mail
                </a>
              )}
            </div>

            <p className="text-[12.5px] leading-relaxed text-fg-7">
              Para iniciar a entrevista, complete a classe (receita bruta
              semestral) e demais dados da serventia — o roteiro do provimento
              depende da classe.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
