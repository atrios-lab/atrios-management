import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@/components/icons";
import {
  ETAPAS,
  ETAPAS_ESCOPO,
  IDENTIDADE_QUESTOES,
} from "@/lib/diagnostico/constants";
import { dispensadoParaClasse, etapasDoEscopo } from "@/lib/diagnostico/motor";
import { EntrevistaForm } from "./entrevista-form";
import { LeadNovoView } from "./lead-novo";
import {
  getDiagnostico,
  getRelatorio,
  getRequisitosAplicaveis,
} from "./queries";
import { RelatorioView } from "./relatorio";

export default async function DiagnosticoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const diag = await getDiagnostico(id);
  if (!diag) notFound();

  // Lead do pré-cadastro público: sem classe ainda, então não há relatório.
  if (diag.statusFunil === "novo") return <LeadNovoView diag={diag} />;

  if (diag.statusFunil !== "em_andamento") {
    const relatorio = await getRelatorio(diag);
    return <RelatorioView relatorio={relatorio} />;
  }

  const etapas = etapasDoEscopo(diag.escopo);
  const requisitos = await getRequisitosAplicaveis(diag.classe, etapas);

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
        <span className="shrink-0 text-xs text-fg-8">
          Classe {diag.classe}
          {diag.subclasse ?? ""} · {diag.uf}
        </span>
      </header>
      <div className="flex-1 overflow-auto p-5">
        <div className="mx-auto max-w-[720px]">
          <p className="mb-4 text-[12.5px] leading-relaxed text-fg-7">
            Roteiro de entrevista (call com a serventia). A pergunta técnica é
            para você; o texto “como perguntar” é a versão em linguagem simples.
            Se o entrevistado não souber responder, marque “Não sei”.
          </p>
          <EntrevistaForm
            diagnosticoId={diag.id}
            etapas={etapas.map((e) => ({
              numero: e,
              titulo: ETAPAS[e],
              escopo: ETAPAS_ESCOPO[e],
            }))}
            requisitos={requisitos.map((r) => ({
              id: r.id,
              etapa: r.etapa,
              refNormativa: r.refNormativa,
              perguntaTecnica: r.perguntaTecnica,
              perguntaSimples: r.perguntaSimples,
              peso: r.peso,
              dispensa:
                diag.classe != null &&
                dispensadoParaClasse(r.condicoes, diag.classe)
                  ? (r.condicoes?.dispensaNota ?? "Dispensado para a classe.")
                  : null,
            }))}
            identidade={IDENTIDADE_QUESTOES}
            respostasIniciais={Object.fromEntries(
              diag.respostas.map((r) => [r.requisitoId, r.valor]),
            )}
            identidadeIniciais={Object.fromEntries(
              diag.respostasIdentidade.map((r) => [r.item, r.valor]),
            )}
          />
        </div>
      </div>
    </>
  );
}
