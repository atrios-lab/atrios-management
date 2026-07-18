import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";
import { Button } from "@/components/ui";
import {
  ESCOPO_LABEL,
  ETAPAS,
  IDENTIDADE_PITCH,
  MODELO_LABEL,
  PESO_LABEL,
  SITUACAO_GAP,
  SITUACAO_IDENTIDADE,
  STATUS_ETAPA_LABEL,
} from "@/lib/diagnostico/constants";
import { statusPorScore } from "@/lib/diagnostico/motor";
import { FunilSelect } from "../funil-select";
import type { Relatorio } from "./queries";
import { RelatorioAcoes } from "./relatorio-acoes";

const STATUS_COR = {
  adequado: "#4cb782",
  atencao: "#f2994a",
  critico: "#eb5757",
} as const;

const PESO_COR: Record<number, string> = {
  3: "#eb5757",
  2: "#f2994a",
  1: "#8a8f98",
};

export function RelatorioView({ relatorio }: { relatorio: Relatorio }) {
  const {
    diagnostico: d,
    etapas,
    porEtapa,
    geral,
    gaps,
    parametros,
    alerta,
    identidadeOps,
    notaModelo,
  } = relatorio;
  const statusGeral = statusPorScore(geral);
  const t = parametros.tecnicos;

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
          {d.serventia}
        </span>
        <FunilSelect diagnosticoId={d.id} status={d.statusFunil} />
        <div className="ml-auto" />
        <RelatorioAcoes diagnosticoId={d.id} serventia={d.serventia} />
      </header>
      <div className="flex-1 overflow-auto p-5">
        <div className="mx-auto flex max-w-[720px] flex-col gap-4 pb-10">
          {/* Capa */}
          <section className="rounded-panel border border-line bg-surface-card p-[18px]">
            <h2 className="text-[15px] font-semibold text-fg-1">
              Resultado do diagnóstico — {d.serventia}
            </h2>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[12.5px] text-fg-6">
              <span>
                Classe{" "}
                <b className="text-fg-3">
                  {d.classe}
                  {d.subclasse ?? ""}
                </b>{" "}
                · {d.uf}
                {d.municipio ? ` · ${d.municipio}` : ""}
                {d.cns ? ` · CNS ${d.cns}` : ""}
              </span>
              <span>
                Modelo:{" "}
                <b className="text-fg-3">{MODELO_LABEL[d.modeloSolucao]}</b>
              </span>
              <span>
                Contato: <b className="text-fg-3">{d.contatoNome}</b>
                {d.contatoEmail ? ` · ${d.contatoEmail}` : ""}
                {d.contatoWhatsapp ? ` · ${d.contatoWhatsapp}` : ""}
              </span>
              <span>{ESCOPO_LABEL[d.escopo]}</span>
            </div>
            {t && (
              <p className="mt-3 border-t border-line-subtle pt-3 text-[12px] leading-relaxed text-fg-7">
                Parâmetros mínimos da classe: backup completo a cada{" "}
                <b className="text-fg-4">{t.bkp}</b>, RPO{" "}
                <b className="text-fg-4">{t.rpo}</b>, RTO{" "}
                <b className="text-fg-4">{t.rto}</b>, teste de restauração{" "}
                <b className="text-fg-4">{t.rest}</b>, internet de referência{" "}
                <b className="text-fg-4">{t.net}</b>.
              </p>
            )}
          </section>

          {/* Alerta de prazo */}
          <section
            className="rounded-panel border p-4 text-[12.5px] leading-relaxed"
            style={{
              borderColor: `${alerta.tipo === "ok" ? "#4cb782" : "#eb5757"}55`,
              background: `${alerta.tipo === "ok" ? "#4cb782" : "#eb5757"}12`,
              borderLeftWidth: 4,
            }}
          >
            <b className="text-fg-1">{alerta.titulo}</b>{" "}
            <span className="text-fg-4">{alerta.corpo}</span>
            {alerta.fonte && (
              <p className="mt-1.5 text-[11px] text-fg-7">{alerta.fonte}</p>
            )}
          </section>

          {/* Score */}
          <section className="rounded-panel border border-line bg-surface-card p-[18px]">
            <div
              className="text-center text-[44px] font-bold leading-none"
              style={{ color: STATUS_COR[statusGeral] }}
            >
              {geral}%
            </div>
            <p className="mt-1.5 text-center text-[12px] text-fg-6">
              conformidade nas etapas avaliadas (
              {etapas.length === 2
                ? "Etapas 1 e 2 — implementação inicial obrigatória"
                : "Etapas 1 a 5"}
              ){" "}
              <span
                className="ml-1 inline-flex rounded-pill border px-2 py-px text-[10.5px] font-semibold"
                style={{
                  color: STATUS_COR[statusGeral],
                  borderColor: `${STATUS_COR[statusGeral]}50`,
                  background: `${STATUS_COR[statusGeral]}18`,
                }}
              >
                {STATUS_ETAPA_LABEL[statusGeral]}
              </span>
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {etapas.map((e) => {
                const score = porEtapa[e];
                const st = statusPorScore(score);
                return (
                  <div key={e}>
                    <div className="mb-1 flex items-baseline justify-between text-[12px]">
                      <span className="text-fg-4">{ETAPAS[e]}</span>
                      <span className="shrink-0 text-fg-5">
                        <span
                          className="mr-1.5 inline-flex rounded-pill px-1.5 py-px text-[10px] font-semibold text-white"
                          style={{ background: STATUS_COR[st] }}
                        >
                          {STATUS_ETAPA_LABEL[st]}
                        </span>
                        {score}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-pill bg-white/[0.06]">
                      <div
                        className="h-full rounded-pill"
                        style={{
                          width: `${score}%`,
                          background: STATUS_COR[st],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {notaModelo && (
              <p className="mt-3.5 text-[11.5px] leading-relaxed text-fg-7">
                ℹ️ {notaModelo}
              </p>
            )}
          </section>

          {/* Gaps */}
          <section className="rounded-panel border border-line bg-surface-card p-[18px]">
            <h2 className="text-[13.5px] font-semibold text-fg-1">
              Pontos de adequação identificados ({gaps.length})
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              {gaps.length === 0 && (
                <p className="text-[12.5px] text-fg-6">
                  Nenhum gap identificado nos requisitos avaliados. Recomenda-se
                  validação técnica das evidências.
                </p>
              )}
              {gaps.map((g) => (
                <div
                  key={g.id}
                  className="rounded-field border border-line p-3 text-[12.5px] leading-snug"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: PESO_COR[g.peso],
                  }}
                >
                  <b style={{ color: PESO_COR[g.peso] }}>
                    {PESO_LABEL[g.peso]}
                  </b>{" "}
                  <span className="text-fg-3">{g.perguntaTecnica}</span>
                  <div className="mt-1 text-[11px] text-fg-7">
                    Etapa {g.etapa} · Anexo IV, {g.refNormativa} · situação:{" "}
                    {SITUACAO_GAP[g.valor]}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Identidade digital */}
          {identidadeOps.length > 0 && (
            <section className="rounded-panel border border-line bg-surface-card p-[18px]">
              <h2 className="text-[13.5px] font-semibold text-fg-1">
                Recomendações de suporte à conformidade — Identidade digital
              </h2>
              <p className="mt-0.5 text-[11.5px] text-fg-8">
                Itens não pontuados no Provimento, porém vinculados aos deveres
                de rastreabilidade, controle de dados e atendimento aos
                titulares.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {identidadeOps.map((op) => {
                  const pitch = IDENTIDADE_PITCH[op.item];
                  return (
                    <div
                      key={op.item}
                      className="rounded-field border border-line p-3 text-[12.5px] leading-relaxed"
                      style={{ borderLeftWidth: 4, borderLeftColor: "#f2994a" }}
                    >
                      <b className="text-fg-2">OFERTA · {pitch.titulo}</b>
                      <p className="mt-1 text-fg-5">{pitch.descricao}</p>
                      <p className="mt-1.5 text-[11.5px] text-fg-6">
                        💬 {pitch.argumento}
                      </p>
                      <p className="mt-1 text-[11px] text-fg-8">
                        situação declarada: {SITUACAO_IDENTIDADE[op.valor]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Relatório interno: card próprio, visual de alerta, longe do botão
              "PDF do cliente" do header — um clique errado aqui entrega o
              produto de graça. */}
          <section
            className="rounded-panel border p-[18px]"
            style={{
              borderColor: "#eb575766",
              background: "#eb575710",
              borderLeftWidth: 4,
            }}
          >
            <h2 className="text-[13.5px] font-semibold text-fg-1">
              Relatório interno: roteiro de execução
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-fg-5">
              Contém o como fazer, esforço estimado e CAPEX.{" "}
              <b style={{ color: "#eb5757" }}>
                Uso interno Átrios. Não enviar ao cliente.
              </b>{" "}
              O arquivo sai com marca d&apos;água e nome iniciado por INTERNO-;
              toda geração fica registrada em log.
            </p>
            <a
              className="mt-3 inline-block"
              href={`/diagnosticos/${d.id}/pdf/interno`}
              download
            >
              <Button variant="secondary">Baixar PDF interno</Button>
            </a>
          </section>

          <p className="text-center text-[11px] leading-relaxed text-fg-8">
            Uso interno · Diagnóstico baseado em informações declaradas na
            entrevista; a validação técnica ocorre na visita/levantamento.
            {d.criadoPor?.name ? ` Conduzido por ${d.criadoPor.name}.` : ""}
          </p>
        </div>
      </div>
    </>
  );
}
