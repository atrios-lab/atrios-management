import Link from "next/link";
import { getServentia } from "@/app/serventias/queries";
import { ArrowLeftIcon } from "@/components/icons";
import { NovoDiagnosticoForm } from "./novo-diagnostico-form";

// Pré-preenche a partir de uma serventia da base de prospecção (?cns=…) — o
// diagnóstico "nasce completo": nome, município, UF, classe estimada e contatos
// já vêm da serventia, ninguém redigita.
export default async function NovoDiagnosticoPage({
  searchParams,
}: {
  searchParams: Promise<{ cns?: string }>;
}) {
  const { cns } = await searchParams;
  const serventia = cns ? await getServentia(cns) : null;

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
        <span className="text-sm font-semibold text-fg-1">
          Novo diagnóstico
        </span>
      </header>
      <div className="flex-1 overflow-auto p-5">
        <div className="mx-auto max-w-[620px]">
          <p className="mb-4 text-[12.5px] leading-relaxed text-fg-7">
            Identificação da serventia para o roteiro de call (~20 minutos). O
            escopo padrão cobre as Etapas 1 e 2 — as obrigatórias do art. 20 — e
            as perguntas de identidade digital.
          </p>
          {serventia && (
            <p className="mb-4 rounded-field border border-[rgba(94,106,210,0.3)] bg-[rgba(94,106,210,0.08)] px-3 py-2 text-[12px] text-primary-ink">
              Pré-preenchido a partir da serventia{" "}
              <strong className="font-semibold">{serventia.nome}</strong>{" "}
              (classe {serventia.classe}
              {serventia.subclasse} estimada pela arrecadação). Confira a
              receita bruta semestral antes de concluir.
            </p>
          )}
          <NovoDiagnosticoForm
            initial={
              serventia
                ? {
                    serventia: serventia.nome,
                    cns: serventia.cns,
                    municipio: serventia.cidade,
                    uf: serventia.uf,
                    classe: serventia.classe,
                    subclasse: serventia.subclasse,
                    contatoNome: serventia.responsavel ?? "",
                    contatoEmail: serventia.email ?? "",
                    contatoWhatsapp: serventia.telefone ?? "",
                  }
                : undefined
            }
          />
        </div>
      </div>
    </>
  );
}
