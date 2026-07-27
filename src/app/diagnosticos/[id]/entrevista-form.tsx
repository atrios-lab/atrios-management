"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import type { IdentidadeItem, RespostaValor } from "@/db/schema";
import { cn } from "@/lib/cn";
import type { IdentidadeQuestao } from "@/lib/diagnostico/constants";
import { VALORES } from "@/lib/diagnostico/constants";
import { concluirDiagnostico, salvarRespostas } from "../actions";

interface RequisitoView {
  id: string;
  etapa: number;
  refNormativa: string;
  perguntaTecnica: string;
  perguntaSimples: string;
  peso: number;
  /** nota de dispensa para a classe (ex.: DPO na Classe 1) — não pontua */
  dispensa: string | null;
}

interface EtapaView {
  numero: number;
  titulo: string;
  escopo: string;
}

function Opcoes({
  name,
  valor,
  onChange,
}: {
  name: string;
  valor?: RespostaValor;
  onChange: (v: RespostaValor) => void;
}) {
  return (
    <div className="flex gap-2">
      {VALORES.map((o) => (
        <label
          key={o.value}
          className={cn(
            "flex h-[30px] min-w-[84px] flex-1 cursor-pointer items-center justify-center rounded-btn border text-[12.5px] font-medium transition-colors duration-150",
            valor === o.value
              ? "border-primary/60 bg-primary/15 text-fg-1"
              : "border-line-field bg-surface-1 text-fg-5 hover:border-line-strong hover:text-fg-2",
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={valor === o.value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

export function EntrevistaForm({
  diagnosticoId,
  etapas,
  requisitos,
  identidade,
  respostasIniciais,
  identidadeIniciais,
}: {
  diagnosticoId: string;
  etapas: EtapaView[];
  requisitos: RequisitoView[];
  identidade: IdentidadeQuestao[];
  respostasIniciais: Record<string, RespostaValor>;
  identidadeIniciais: Record<string, RespostaValor>;
}) {
  const router = useRouter();
  const [respostas, setRespostas] =
    useState<Record<string, RespostaValor>>(respostasIniciais);
  const [respostasIdent, setRespostasIdent] =
    useState<Record<string, RespostaValor>>(identidadeIniciais);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = requisitos.length + identidade.length;
  const respondidas =
    Object.keys(respostas).length + Object.keys(respostasIdent).length;

  const payload = useMemo(
    () => ({
      respostas: Object.entries(respostas).map(([requisitoId, valor]) => ({
        requisitoId,
        valor,
      })),
      identidade: Object.entries(respostasIdent).map(([item, valor]) => ({
        item: item as IdentidadeItem,
        valor,
      })),
    }),
    [respostas, respostasIdent],
  );

  const salvar = (depoisConcluir: boolean) => {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await salvarRespostas(
        diagnosticoId,
        payload.respostas,
        payload.identidade,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      if (!depoisConcluir) {
        setSavedAt(new Date().toLocaleTimeString("pt-BR"));
        return;
      }
      const fim = await concluirDiagnostico(diagnosticoId);
      if (fim.error) {
        setError(fim.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex-1 overflow-auto p-5">
        <div className="mx-auto flex max-w-[720px] flex-col gap-4">
          <p className="text-[12.5px] leading-relaxed text-fg-7">
            Roteiro de entrevista (call com a serventia). A pergunta técnica é
            para você; o texto “como perguntar” é a versão em linguagem simples.
            Se o entrevistado não souber responder, marque “Não sei”.
          </p>

          {/* Identidade digital */}
          <section className="rounded-panel border border-line bg-surface-card p-[18px]">
            <h2 className="text-[13.5px] font-semibold text-fg-1">
              Identidade digital da serventia
            </h2>
            <p className="mt-0.5 text-[11.5px] text-fg-8">
              Não pontua no provimento — mapeia oportunidades de site, e-mail e
              número corporativo.
            </p>
            <div className="mt-3 flex flex-col divide-y divide-line-subtle">
              {identidade.map((q) => (
                <div key={q.item} className="flex flex-col gap-2 py-3.5">
                  <p className="text-[13px] font-medium leading-snug text-fg-2">
                    {q.perguntaTecnica}
                  </p>
                  <p className="border-l-2 border-line pl-2.5 text-[12px] italic leading-snug text-fg-7">
                    Como perguntar: “{q.perguntaSimples}”
                  </p>
                  <Opcoes
                    name={q.perguntaTecnica}
                    valor={respostasIdent[q.item]}
                    onChange={(v) =>
                      setRespostasIdent((prev) => ({ ...prev, [q.item]: v }))
                    }
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Etapas do provimento */}
          {etapas.map((etapa) => (
            <section
              key={etapa.numero}
              className="rounded-panel border border-line bg-surface-card p-[18px]"
            >
              <h2 className="text-[13.5px] font-semibold text-fg-1">
                {etapa.titulo}
              </h2>
              <p className="mt-0.5 text-[11.5px] text-fg-8">{etapa.escopo}</p>
              <div className="mt-3 flex flex-col divide-y divide-line-subtle">
                {requisitos
                  .filter((r) => r.etapa === etapa.numero)
                  .map((r) => (
                    <div key={r.id} className="flex flex-col gap-2 py-3.5">
                      <p className="text-[13px] font-medium leading-snug text-fg-2">
                        {r.perguntaTecnica}{" "}
                        <span className="whitespace-nowrap text-[11px] font-normal text-fg-8">
                          (Anexo IV, {r.refNormativa} · peso {r.peso})
                        </span>
                      </p>
                      <p className="border-l-2 border-line pl-2.5 text-[12px] italic leading-snug text-fg-7">
                        Como perguntar: “{r.perguntaSimples}”
                      </p>
                      {r.dispensa && (
                        <p className="rounded-field border border-[rgba(76,183,130,0.3)] bg-[rgba(76,183,130,0.08)] px-2.5 py-1.5 text-[11.5px] leading-snug text-[#7cc9a2]">
                          <b>Dispensado</b> · {r.dispensa} A resposta é opcional
                          e não pontua.
                        </p>
                      )}
                      <Opcoes
                        name={r.perguntaTecnica}
                        valor={respostas[r.id]}
                        onChange={(v) =>
                          setRespostas((prev) => ({ ...prev, [r.id]: v }))
                        }
                      />
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Barra de ações: fora da área de scroll, sempre visível */}
      <div className="shrink-0 border-t border-line bg-surface-raised px-5 py-3">
        <div className="mx-auto flex max-w-[720px] items-center gap-3">
          <span className="text-[12px] text-fg-6">
            {respondidas}/{total} respondidas
          </span>
          {savedAt && !error && (
            <span className="text-[11.5px] text-fg-8">
              Salvo às {savedAt} — pode retomar depois se a call cair.
            </span>
          )}
          {error && (
            <span className="text-[11.5px] leading-tight text-danger">
              {error}
            </span>
          )}
          <div className="ml-auto flex shrink-0 gap-[9px]">
            <Button
              variant="secondary"
              onClick={() => salvar(false)}
              disabled={pending}
            >
              {pending ? "Salvando…" : "Salvar parcial"}
            </Button>
            <Button onClick={() => salvar(true)} disabled={pending}>
              Concluir diagnóstico
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
