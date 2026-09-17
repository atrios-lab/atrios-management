"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CopyIcon } from "@/components/icons";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  ESTADO_LINK_LABEL,
  type EstadoLink,
  estadoLink,
  mensagemWhatsappLink,
} from "@/lib/diagnostico/autoavaliacao";
import { gerarLinkAutoavaliacao, revogarLinkAutoavaliacao } from "../actions";

// Bloco "Link para a serventia": a equipe gera o link público de
// autoavaliação, copia/envia por WhatsApp, acompanha o estado e regenera ou
// revoga. O estado é derivado (lib/diagnostico/autoavaliacao) — o servidor
// passa a linha crua e a hora é a do cliente, o que basta para exibição.

export interface LinkAutoavaliacaoRow {
  token: string;
  expiraEm: Date;
  revogadoEm: Date | null;
  iniciadoEm: Date | null;
  enviadoEm: Date | null;
  respondenteNome: string | null;
  respondenteCargo: string | null;
  respondenteEmail: string | null;
  respondenteWhatsapp: string | null;
}

const ESTADO_COR: Record<EstadoLink, string> = {
  nao_gerado: "#8a8f98",
  nao_iniciado: "#8b93ec",
  aberto: "#f2c94c",
  enviado: "#4cb782",
  expirado: "#eb5757",
  revogado: "#8a8f98",
};

const fmtData = (d: Date) =>
  d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function LinkAutoavaliacao({
  diagnosticoId,
  serventia,
  contatoWhatsapp,
  link,
  siteUrl,
  respondidas,
  total,
}: {
  diagnosticoId: string;
  serventia: string;
  contatoWhatsapp: string | null;
  link: LinkAutoavaliacaoRow | null;
  /** origem pública (siteUrl()), calculada no servidor */
  siteUrl: string;
  respondidas: number;
  total: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pending, startTransition] = useTransition();

  const estado = estadoLink(link, new Date());
  const url = link ? `${siteUrl}/autoavaliacao/${link.token}` : null;
  const compartilhavel =
    url && (estado === "nao_iniciado" || estado === "aberto");

  const gerar = () => {
    if (
      link &&
      !window.confirm(
        "Gerar um novo link? O link anterior deixa de funcionar. As respostas já dadas pela serventia são mantidas.",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const r = await gerarLinkAutoavaliacao(diagnosticoId);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  };

  const revogar = () => {
    if (!window.confirm("Revogar o link? A serventia perde o acesso.")) return;
    setError(null);
    startTransition(async () => {
      const r = await revogarLinkAutoavaliacao(diagnosticoId);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  };

  const copiar = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      setError("Não foi possível copiar — selecione o link e copie.");
    }
  };

  const waHref =
    url && contatoWhatsapp
      ? `https://wa.me/55${contatoWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(mensagemWhatsappLink(serventia, url))}`
      : null;

  return (
    <section className="rounded-panel border border-line bg-surface-card p-[18px]">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[13.5px] font-semibold text-fg-1">
          Link para a serventia responder
        </h2>
        <span
          className="inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[11px] font-medium"
          style={{
            color: ESTADO_COR[estado],
            borderColor: `${ESTADO_COR[estado]}40`,
            background: `${ESTADO_COR[estado]}14`,
          }}
        >
          {ESTADO_LINK_LABEL[estado]}
        </span>
        {link && estado !== "enviado" && estado !== "revogado" && (
          <span className="text-[11px] text-fg-8">
            válido até {link.expiraEm.toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-[11.5px] text-fg-8">
        A serventia responde sozinha, em linguagem simples, pelo celular. As
        respostas caem neste roteiro para você revisar e concluir.
      </p>

      {link && (link.iniciadoEm || link.enviadoEm) && (
        <div className="mt-3 grid grid-cols-1 gap-2 text-[12px] text-fg-5 sm:grid-cols-2">
          <span>
            <span className="text-fg-8">Respondente: </span>
            {link.respondenteNome ?? "—"}
            {link.respondenteCargo ? ` (${link.respondenteCargo})` : ""}
          </span>
          <span>
            <span className="text-fg-8">Contato: </span>
            {link.respondenteWhatsapp ?? link.respondenteEmail ?? "—"}
          </span>
          {link.iniciadoEm && (
            <span>
              <span className="text-fg-8">Iniciado: </span>
              {fmtData(link.iniciadoEm)}
            </span>
          )}
          {link.enviadoEm ? (
            <span>
              <span className="text-fg-8">Enviado: </span>
              {fmtData(link.enviadoEm)}
            </span>
          ) : total > 0 ? (
            <span>
              <span className="text-fg-8">Progresso: </span>
              {respondidas}/{total} respondidas
            </span>
          ) : null}
        </div>
      )}

      {compartilhavel && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Link de autoavaliação"
              className="h-[30px] min-w-0 flex-1 rounded-field border border-line-field bg-surface-1 px-2.5 font-mono text-[11.5px] text-fg-4 outline-none"
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<CopyIcon />}
              onClick={copiar}
              className={cn(copiado && "text-[#4cb782]")}
            >
              {copiado ? "Copiado" : "Copiar"}
            </Button>
          </div>
          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 w-fit items-center rounded-btn border border-[rgba(76,183,130,0.45)] px-3.5 text-[13px] font-medium text-[#58c48f] transition-colors hover:bg-[rgba(76,183,130,0.08)]"
            >
              Abrir WhatsApp do contato com o link
            </a>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-[9px]">
        {error && <span className="text-[11.5px] text-danger">{error}</span>}
        <div className="ml-auto flex gap-[9px]">
          {link && estado !== "revogado" && estado !== "enviado" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={revogar}
              disabled={pending}
            >
              Revogar
            </Button>
          )}
          {estado !== "enviado" && (
            <Button
              variant={link ? "secondary" : "primary"}
              size="sm"
              onClick={gerar}
              disabled={pending}
            >
              {pending ? "Gerando…" : link ? "Gerar novo link" : "Gerar link"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
