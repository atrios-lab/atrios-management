import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import {
  calcularPrazos,
  type ParametrosPrazo,
  parametrosParaClasse,
} from "@/lib/diagnostico/motor";
import { LandingForm } from "./landing-form";

// Landing pública — servida fora da autenticação (ver src/proxy.ts). O envio do
// formulário vira um lead "novo" no funil do módulo de diagnóstico.

const META_TITLE = "Diagnóstico gratuito — Provimento CNJ 213/2026";
const META_DESC =
  "Descubra o que sua serventia já cumpre e o que falta. 20 minutos, com relatório.";

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESC,
  // og:image / twitter:image vêm do arquivo opengraph-image.tsx (convention).
  openGraph: {
    title: META_TITLE,
    description: META_DESC,
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: META_TITLE,
    description: META_DESC,
  },
};

// A landing só renderiza no servidor/na carga — sem revalidação estática, pois
// o contador depende da data atual.
export const dynamic = "force-dynamic";

// Logos de parceria só quando a parceria estiver formalizada (config, não
// hardcode). Default false.
const SHOW_PARTNERS = process.env.LANDING_SHOW_PARTNERS === "true";

export interface PrazoClasse {
  dias: number;
  /** dd/mm/aaaa — sempre derivado do mesmo cálculo que `dias` (nunca hardcode). */
  data: string;
}

export interface PrazoRN {
  porClasse: Record<number, PrazoClasse>;
  /** dias da prorrogação estadual (art. 21) — mesmo texto exibido na landing. */
  prorrogacaoDias: number;
}

const fmtData = (d: Date) => d.toLocaleDateString("pt-BR");

// Rede de segurança só para o caso do seed do módulo ainda não ter rodado —
// espelha os parâmetros de src/db/seed-provimento.ts (vigência + prorrogação
// RN). Se a norma mudar, o ajuste é nos parâmetros, não aqui.
const FALLBACK: ParametrosPrazo = {
  vigencia: new Date("2026-02-20T12:00:00"),
  prazoArt20Dias: 0, // sobrescrito por classe abaixo
  prazoArt23Meses: 0,
  prorrogacaoDias: 93,
};
const FALLBACK_ART20_DIAS: Record<number, number> = { 3: 90, 2: 150, 1: 210 };

async function calcularPrazoRN(): Promise<PrazoRN> {
  const hoje = new Date();
  const piso = (n: number) => Math.max(0, n);

  const rows = await db.query.parametroNorma.findMany().catch(() => []);

  // Se o seed do módulo não rodou (ou o banco falhou), parametrosParaClasse
  // lança — cada classe cai isoladamente no fallback local.
  const paraClasse = (classe: number): ParametrosPrazo => {
    try {
      return parametrosParaClasse(rows, classe, "RN");
    } catch {
      return { ...FALLBACK, prazoArt20Dias: FALLBACK_ART20_DIAS[classe] };
    }
  };

  const porClasse: Record<number, PrazoClasse> = {};
  let prorrogacaoDias = FALLBACK.prorrogacaoDias;
  for (const classe of [3, 2, 1]) {
    const params = paraClasse(classe);
    const prazos = calcularPrazos(params, hoje);
    porClasse[classe] = {
      dias: piso(prazos.diasRestantesInicial),
      data: fmtData(prazos.limiteInicial),
    };
    prorrogacaoDias = params.prorrogacaoDias;
  }
  return { porClasse, prorrogacaoDias };
}

const PASSOS = [
  {
    titulo: "1. Você se cadastra",
    texto: "Leva 1 minuto, só os dados ao lado.",
    icone: (
      <path
        d="M11.3 2.4l2.3 2.3L5.4 12.9l-3 .7.7-3z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    titulo: "2. Call de 20 minutos",
    texto: "Perguntas simples sobre a rotina do cartório, sem jargão técnico.",
    icone: (
      <path
        d="M14.5 11.4v1.8a1.2 1.2 0 0 1-1.3 1.2 12.4 12.4 0 0 1-5.4-1.9 12.2 12.2 0 0 1-3.8-3.8A12.4 12.4 0 0 1 2.1 3.3 1.2 1.2 0 0 1 3.3 2h1.8a1.2 1.2 0 0 1 1.2 1c.1.6.2 1.2.5 1.8a1.2 1.2 0 0 1-.3 1.3l-.8.8a9.7 9.7 0 0 0 3.6 3.6l.8-.8a1.2 1.2 0 0 1 1.3-.3c.6.2 1.2.4 1.8.5a1.2 1.2 0 0 1 1 1.2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    titulo: "3. Relatório por escrito",
    texto: "Sua classe, seus prazos e cada ponto de adequação.",
    icone: (
      <>
        <path
          d="M9.5 1.5H4.3A1.3 1.3 0 0 0 3 2.8v10.4a1.3 1.3 0 0 0 1.3 1.3h7.4a1.3 1.3 0 0 0 1.3-1.3V5z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 1.5V5H13M6 8.5h4M6 11h4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
];

function Topo() {
  return (
    <div className="flex items-start justify-between gap-3">
      {/* logo original é escura; renderizada em branco sobre fundo dark */}
      {/* biome-ignore lint/performance/noImgElement: asset local, filtro invert */}
      <img
        src="/landing/atrios-logo.png"
        alt="Átrios — Tecnologia e Consultoria"
        className="h-[46px] w-auto opacity-95 [filter:invert(1)] md:h-[54px]"
      />
      {SHOW_PARTNERS && (
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-fg-9">
            Realização / apoio
          </span>
          <div className="flex gap-1.5">
            <span className="flex h-[26px] items-center rounded-[6px] bg-[#f4f5f7] px-2">
              {/* biome-ignore lint/performance/noImgElement: asset local */}
              <img
                src="/landing/arpen-rn.png"
                alt="Arpen/RN"
                className="h-4 w-auto"
              />
            </span>
            <span className="flex h-[26px] items-center rounded-[6px] bg-[#f4f5f7] px-2">
              {/* biome-ignore lint/performance/noImgElement: asset local */}
              <img
                src="/landing/anoreg-rn.png"
                alt="Anoreg/RN"
                className="h-[13px] w-auto"
              />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Urgencia({ prazo }: { prazo: PrazoRN }) {
  return (
    <div className="flex max-w-[560px] flex-col gap-3 rounded-[12px] border border-[rgba(224,108,108,0.22)] bg-[rgba(224,108,108,0.06)] p-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#e08a8a]">
          Prazo das Etapas 1 e 2 no RN
        </span>
        <span className="text-xs leading-[1.45] text-fg-5">
          Já com a prorrogação de {prazo.prorrogacaoDias} dias concedida pela
          Corregedoria (CGJ-RN)
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[3, 2, 1].map((classe) => (
          <div key={classe} className="flex flex-col">
            <span className="text-[11.5px] font-medium text-fg-5">
              Classe {classe}
            </span>
            <span className="text-[25px] font-bold leading-[1.15] tracking-[-0.02em] text-danger md:text-[27px]">
              {prazo.porClasse[classe].dias}
              <span className="ml-1 text-xs font-medium text-[#c98686]">
                dias
              </span>
            </span>
            <span className="text-[10.5px] text-[#6b6f7a]">
              até {prazo.porClasse[classe].data}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComoFunciona() {
  return (
    <div className="flex max-w-[560px] flex-col gap-3.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-9">
        Como funciona
      </span>
      {PASSOS.map((p) => (
        <div key={p.titulo} className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-[rgba(94,106,210,0.12)]">
            <svg
              width="17"
              height="17"
              viewBox="0 0 16 16"
              fill="none"
              stroke="#a9b0ec"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              {p.icone}
            </svg>
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[14.5px] font-semibold text-fg-2">
              {p.titulo}
            </span>
            <span className="text-[13px] leading-[1.5] text-fg-6">
              {p.texto}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Rodape() {
  return (
    <div className="flex max-w-[560px] flex-col gap-2.5 border-t border-line pt-4">
      <p className="text-[13px] leading-[1.55] text-fg-4">
        Nossa equipe conhece a prática interna de cartório: profissionais com
        mais de 10 anos de atuação em serventias extrajudiciais.
      </p>
      <span className="text-[12.5px] text-fg-6">
        <a
          href="mailto:contato@atrioss.com"
          className="text-primary-ink no-underline hover:text-primary-fg"
        >
          contato@atrioss.com
        </a>{" "}
        · WhatsApp{" "}
        <a
          href="https://wa.me/558440420438"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-ink no-underline hover:text-primary-fg"
        >
          +55 84 4042-0438
        </a>{" "}
        ·{" "}
        <Link
          href="/privacidade"
          className="text-primary-ink no-underline hover:text-primary-fg"
        >
          Política de privacidade
        </Link>
      </span>
    </div>
  );
}

export default async function DiagnosticoLandingPage() {
  const prazo = await calcularPrazoRN();

  return (
    <main
      className="min-h-dvh w-full px-5 py-10 md:px-10 md:py-14"
      style={{
        background:
          "radial-gradient(120% 90% at 30% -10%, #0d1018 0%, #06070a 55%, #050506 100%)",
      }}
    >
      {/*
        Ordem mobile (DOM): hero+urgência → formulário → como funciona+rodapé.
        No desktop vira duas colunas: grupos A/B empilhados à esquerda (col 1,
        linhas 1 e 2) e o formulário centralizado à direita (col 2, span 2).
        As linhas são dimensionadas pelo conteúdo da coluna 1 — sem esticar.
      */}
      <div className="mx-auto grid w-full max-w-[1200px] gap-8 lg:grid-cols-[1fr_minmax(0,520px)] lg:items-start lg:gap-x-14 lg:gap-y-9">
        <div className="flex flex-col gap-7 lg:col-start-1 lg:row-start-1">
          <Topo />
          <div className="flex flex-col gap-2.5">
            <h1 className="text-pretty text-[27px] font-bold leading-[1.22] tracking-[-0.02em] text-fg-hi md:text-[33px]">
              Diagnóstico gratuito do Provimento CNJ 213/2026
            </h1>
            <p className="text-pretty text-[15px] leading-[1.55] text-fg-4 md:text-base">
              Descubra em uma conversa de 20 minutos o que a sua serventia já
              cumpre e o que ainda falta, com relatório por escrito.
            </p>
          </div>
          <Urgencia prazo={prazo} />
        </div>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          <LandingForm />
        </div>

        <div className="flex flex-col gap-7 lg:col-start-1 lg:row-start-2">
          <ComoFunciona />
          <Rodape />
        </div>
      </div>
    </main>
  );
}
