import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@/components/icons";
import {
  ETAPAS,
  ETAPAS_ESCOPO,
  IDENTIDADE_QUESTOES,
} from "@/lib/diagnostico/constants";
import { dispensadoParaClasse, etapasDoEscopo } from "@/lib/diagnostico/motor";
import { siteUrl } from "@/lib/landing/config";
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
  if (diag.statusFunil === "novo")
    return <LeadNovoView diag={diag} siteUrl={siteUrl()} />;

  if (diag.statusFunil !== "em_andamento") {
    const relatorio = await getRelatorio(diag);
    return <RelatorioView relatorio={relatorio} />;
  }

  const etapas = etapasDoEscopo(diag.escopo);
  const requisitos = await getRequisitosAplicaveis(diag.classe, etapas);

  // Progresso da autoavaliação pública: só requisitos não dispensados (a
  // serventia não vê os dispensados) + identidade digital.
  const pontuaveis = requisitos.filter(
    (r) =>
      diag.classe == null || !dispensadoParaClasse(r.condicoes, diag.classe),
  );
  const respondidosIds = new Set(diag.respostas.map((r) => r.requisitoId));
  const respondidas =
    pontuaveis.filter((r) => respondidosIds.has(r.id)).length +
    diag.respostasIdentidade.length;
  const total = pontuaveis.length + IDENTIDADE_QUESTOES.length;

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
        {diag.enquadramentoDeclaradoEm && (
          <span
            className="shrink-0 rounded-chip bg-[rgba(94,106,210,0.14)] px-2 py-0.5 text-[10.5px] font-medium text-primary-ink"
            title="Classe e modelo de solução informados pela própria serventia no formulário de autoavaliação (art. 16, §1º)."
          >
            Classe declarada pela serventia
          </span>
        )}
      </header>
      <EntrevistaForm
        diagnosticoId={diag.id}
        autoavaliacao={{
          serventia: diag.serventia,
          contatoWhatsapp: diag.contatoWhatsapp,
          link: diag.autoavaliacao,
          siteUrl: siteUrl(),
          respondidas,
          total,
        }}
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
    </>
  );
}
