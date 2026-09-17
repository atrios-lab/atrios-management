import { eq } from "drizzle-orm";
import type { Metadata, Viewport } from "next";
import { getRequisitosAplicaveis } from "@/app/diagnosticos/[id]/queries";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  estadoLink,
  linkAcessivel,
  montarPayloadPublico,
} from "@/lib/diagnostico/autoavaliacao";
import {
  ETAPAS,
  ETAPAS_ESCOPO,
  IDENTIDADE_QUESTOES,
} from "@/lib/diagnostico/constants";
import { etapasDoEscopo } from "@/lib/diagnostico/motor";
import { AutoavaliacaoForm } from "./autoavaliacao-form";
import { CascaPublica, TelaEmAnalise, TelaLinkInvalido } from "./telas";

// Formulário público que a serventia responde pelo link com token (fora da
// autenticação — ver src/proxy.ts). O token identifica o diagnóstico; a página
// entrega ao cliente SÓ o payload mínimo (montarPayloadPublico, testado).

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Autoavaliação — Provimento CNJ 213/2026",
  description:
    "Perguntas simples sobre a rotina do cartório para o diagnóstico de adequação.",
  // link privado: nunca indexar
  robots: { index: false, follow: false },
};

// Tema claro fixo desta rota (ver telas.tsx): a barra do navegador no celular
// acompanha o fundo; sobrescreve só aqui o #06070a do root layout.
export const viewport: Viewport = {
  themeColor: "#f5f6fa",
  colorScheme: "light",
};

export default async function AutoavaliacaoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = /^[A-Za-z0-9_-]{20,64}$/.test(token)
    ? await db.query.autoavaliacao.findFirst({
        where: eq(schema.autoavaliacao.token, token),
        with: {
          diagnostico: {
            with: {
              respostas: { columns: { requisitoId: true, valor: true } },
              respostasIdentidade: { columns: { item: true, valor: true } },
            },
          },
        },
      })
    : null;

  const estado = estadoLink(link, new Date());
  if (!link || !linkAcessivel(estado))
    return <TelaLinkInvalido expirado={estado === "expirado"} />;

  const diag = link.diagnostico;
  if (diag.statusFunil !== "novo" && diag.statusFunil !== "em_andamento")
    return <TelaEmAnalise serventia={diag.serventia} />;

  const etapas = etapasDoEscopo(diag.escopo);
  const requisitos = await getRequisitosAplicaveis(diag.classe, etapas);
  const payload = montarPayloadPublico(diag, requisitos, IDENTIDADE_QUESTOES);

  return (
    <CascaPublica>
      <AutoavaliacaoForm
        token={token}
        payload={payload}
        etapas={etapas.map((e) => ({
          numero: e,
          titulo: ETAPAS[e],
          escopo: ETAPAS_ESCOPO[e],
        }))}
        respondente={
          link.iniciadoEm
            ? {
                nome: link.respondenteNome ?? "",
                cargo: link.respondenteCargo ?? "",
                email: link.respondenteEmail ?? "",
                whatsapp: link.respondenteWhatsapp ?? "",
              }
            : null
        }
        enviadoEm={link.enviadoEm}
        respostasIniciais={Object.fromEntries(
          diag.respostas.map((r) => [r.requisitoId, r.valor]),
        )}
        identidadeIniciais={Object.fromEntries(
          diag.respostasIdentidade.map((r) => [r.item, r.valor]),
        )}
      />
    </CascaPublica>
  );
}
