import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LogoAtriosLockup } from "@/components/landing/logo-atrios-lockup";
import {
  CONTATO_EMAIL,
  showPartners,
  siteUrl,
  WHATSAPP_EXIBICAO,
  WHATSAPP_NUMERO,
  whatsappUrl,
} from "@/lib/landing/config";
import { CLASSES, type Norma } from "@/lib/landing/norma";
import { carregarNorma } from "@/lib/landing/queries";

// Site institucional público — servido fora da autenticação (ver src/proxy.ts).
//
// Implementação do protótipo aprovado (site-institucional-designer-v3). Ele é a
// fonte da verdade: estrutura, copy, paleta e ordem das seções não se
// reinterpretam aqui. Só há duas diferenças deliberadas:
//
// 1. Nenhuma data, prazo ou teto é literal. O protótipo trazia a vigência, a
//    prorrogação, os tetos, as datas-limite e a data da decisão da CGJ-RN
//    escritos à mão; tudo vem de parametro_norma via carregarNorma() — o porquê
//    está em lib/landing/norma. (O teste de fonte única lê este arquivo como
//    texto: nem um comentário pode conter data literal.)
// 2. Os logos de parceria passam por showPartners(), a mesma flag da
//    /diagnostico. No protótipo era prop com default `true`.
//
// Copy: sem travessão em texto visível (regra do handoff). Onde caberia um, use
// ponto, vírgula, dois-pontos ou parênteses. Vale para alt, aria-label e meta.
// Em comentário, como este, tanto faz.
//
// Não capta lead por conta própria: todo CTA aponta para /diagnostico (que grava
// em Leads) ou para o WhatsApp. Um segundo canal quebraria o funil.

// og:title e og:description são os do protótipo, palavra por palavra. O <title>
// é trabalho da implementação e cobre as duas buscas que trazem gente aqui: a
// marca e a vertical quente.
const META_TITLE = "Átrios Tecnologia: constrói e protege sistemas";
const META_DESC =
  "Software sob medida, segurança da informação e LGPD, e a vertical de cartórios (Provimento 213). Uma competência, três frentes.";
const PAGE_TITLE =
  "Átrios Tecnologia e Consultoria: software, LGPD e Provimento 213 no RN";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: META_DESC,
  alternates: { canonical: "/" },
  keywords: [
    "software sob medida",
    "segurança da informação",
    "LGPD",
    "DPO as a Service",
    "Provimento 213 CNJ",
    "cartórios Rio Grande do Norte",
  ],
  // og:image / twitter:image vêm dos arquivos opengraph-image.tsx / twitter-image.tsx.
  openGraph: {
    title: META_TITLE,
    description: META_DESC,
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "Átrios Tecnologia e Consultoria",
  },
  twitter: {
    card: "summary_large_image",
    title: META_TITLE,
    description: META_DESC,
  },
};

// Sem revalidação estática: a contagem de dias depende da data atual.
export const dynamic = "force-dynamic";

const WA_TEXTO =
  "Olá! Vim pelo site e quero falar com a Átrios sobre um projeto.";
const WA_TEXTO_CARTORIO =
  "Olá! Vim pelo site e quero falar sobre a adequação da minha serventia ao Provimento CNJ 213/2026.";

/** "R$ 100 mil" — a faixa da norma é sempre múltipla de mil, e o design pede a forma curta. */
const brlCurto = (v: number) => `R$ ${(v / 1000).toLocaleString("pt-BR")} mil`;

/* ---- Primitivos ---------------------------------------------------------- */

const wrap = "mx-auto w-full max-w-[1180px] px-[18px] sm:px-6 lg:px-10";
const btn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-btn px-5 text-[14px] font-semibold transition-colors";
const btnPrimario = `${btn} bg-primary text-white shadow-brand hover:bg-primary-hover`;
const btnGhost = `${btn} border border-line-field-strong text-fg-3 hover:border-line-hover hover:text-fg-1`;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-ink">
      {children}
    </span>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-pretty text-[23px] font-bold leading-[1.25] tracking-[-0.02em] text-fg-hi md:text-[30px]">
      {children}
    </h2>
  );
}

function Secao({
  id,
  eyebrow,
  titulo,
  intro,
  children,
  className,
}: {
  id?: string;
  eyebrow: string;
  titulo: string;
  intro?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={className}>
      <div className={`${wrap} flex flex-col gap-7 py-14 md:py-24`}>
        <div className="flex max-w-[760px] flex-col gap-2.5">
          <Eyebrow>{eyebrow}</Eyebrow>
          <Titulo>{titulo}</Titulo>
          {intro && (
            <p className="text-pretty text-[14.5px] leading-[1.6] text-fg-5 md:text-[15.5px]">
              {intro}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-field border border-line-strong bg-surface-4 p-5 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-chip border border-line-field bg-white/5 px-2 py-0.5 text-[11px] font-medium text-fg-6">
      {children}
    </span>
  );
}

/* ---- Ícones — 16×16, stroke, no traço do design ------------------------- */

const P_CODE = "M6 5L3 8l3 3M10 5l3 3-3 3";
const P_SHIELD = "M8 1.6l5 2v3.4c0 3-2.1 5-5 5.8-2.9-.8-5-2.8-5-5.8V3.6z";
const P_SCALE =
  "M8 2v11M4 13h8M3 5h10M3 5l-1.6 3.4a2 2 0 0 0 3.2 0zM13 5l-1.6 3.4a2 2 0 0 0 3.2 0z";
const P_TREND = "M2 12l3.5-4 2.5 2.5L13 4";
const P_USER =
  "M8 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM2.5 13.5a5.5 5.5 0 0 1 11 0";
const P_SEARCH = "M7 7a4 4 0 1 0 0-.01M10 10l3.5 3.5";
const P_DOC =
  "M9.5 1.5H4.3A1.3 1.3 0 0 0 3 2.8v10.4a1.3 1.3 0 0 0 1.3 1.3h7.4a1.3 1.3 0 0 0 1.3-1.3V5zM9.5 1.5V5H13M6 8.5h4M6 11h4";

function Icone({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      className={className}
    >
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconeCaixa({ d, urgente }: { d: string; urgente?: boolean }) {
  return (
    <span
      className={`flex size-9 shrink-0 items-center justify-center rounded-btn ${
        urgente ? "bg-danger/12 text-danger" : "bg-primary/12 text-primary-fg"
      }`}
    >
      <Icone d={d} />
    </span>
  );
}

/* ---- Topo --------------------------------------------------------------- */

const NAV = [
  { href: "#servicos", label: "O que fazemos" },
  { href: "#seguranca", label: "Segurança e LGPD" },
  { href: "#cartorios", label: "Cartórios" },
  { href: "#tecnologias", label: "Tecnologias" },
];

function Topo() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface-0/70 backdrop-blur-[14px]">
      <nav className={`${wrap} flex items-center justify-between gap-3 py-3.5`}>
        <Link href="#topo" aria-label="Átrios, início">
          <LogoAtriosLockup className="h-[26px] w-auto text-white" />
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-[13px] text-fg-5 transition-colors hover:text-fg-2"
            >
              {n.label}
            </a>
          ))}
        </div>
        <a
          href={whatsappUrl(WA_TEXTO)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-btn border border-line-field-strong px-3.5 text-[13px] font-medium text-fg-3 transition-colors hover:border-line-hover hover:text-fg-1"
        >
          WhatsApp
        </a>
      </nav>
    </header>
  );
}

/* ---- 1. Hero ------------------------------------------------------------ */

const HERO_FRENTES = [
  {
    d: P_CODE,
    title: "Software sob medida",
    sub: "Sistemas, automações, integrações",
    tag: "sob medida",
  },
  {
    d: P_SHIELD,
    title: "Segurança e LGPD",
    sub: "Compliance e continuidade",
    tag: "contínuo",
  },
  {
    d: P_SCALE,
    title: "Cartórios · Prov. 213",
    sub: "Adequação com prazo correndo",
    tag: "prazo",
    urgente: true,
  },
];

function Hero() {
  return (
    <section
      id="topo"
      style={{
        background:
          "radial-gradient(120% 90% at 30% -10%, #0d1018 0%, #06070a 55%, #050506 100%)",
      }}
    >
      <div className={`${wrap} flex flex-col gap-9 py-14 md:py-24`}>
        <div className="flex max-w-[820px] flex-col gap-4">
          <span className="w-fit rounded-pill border border-line-field bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-6">
            A Technology Group Company
          </span>
          <h1 className="text-pretty text-[32px] font-bold leading-[1.14] tracking-[-0.025em] text-fg-hi md:text-[48px]">
            A Átrios constrói e protege os sistemas de que a sua operação
            depende.
          </h1>
          <p className="text-pretty text-[16px] leading-[1.55] text-fg-4 md:text-[18px]">
            Software sob medida, segurança da informação e LGPD. A mesma
            competência aplicada a três públicos: empresas que precisam de
            sistemas, empresas que precisam se adequar à LGPD e cartórios que
            precisam cumprir o Provimento 213.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href={whatsappUrl(WA_TEXTO)}
            target="_blank"
            rel="noopener noreferrer"
            className={btnPrimario}
          >
            Falar com a Átrios
          </a>
          <Link href="/diagnostico" className={btnGhost}>
            É de cartório? Comece aqui
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          <Eyebrow>Uma competência, três frentes</Eyebrow>
          <div className="grid gap-3 md:grid-cols-3">
            {HERO_FRENTES.map((f) => (
              <div
                key={f.title}
                className={`flex items-center gap-3 rounded-field border p-4 ${
                  f.urgente
                    ? "border-danger/24 bg-danger/6"
                    : "border-line-strong bg-white/[0.02]"
                }`}
              >
                <IconeCaixa d={f.d} urgente={f.urgente} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[14px] font-semibold text-fg-1">
                    {f.title}
                  </span>
                  <span className="text-[12.5px] leading-[1.45] text-fg-6">
                    {f.sub}
                  </span>
                </div>
                <span
                  className={`ml-auto shrink-0 rounded-chip border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.04em] ${
                    f.urgente
                      ? "border-danger/30 bg-danger/12 text-danger"
                      : "border-line-field bg-white/5 text-fg-5"
                  }`}
                >
                  {f.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---- 2. O que fazemos --------------------------------------------------- */

const FRENTES = [
  {
    d: P_CODE,
    title: "Software e transformação digital",
    desc: "Desenvolvimento sob medida, sistemas web, automação de processos, integrações entre sistemas e landing pages. Soluções desenhadas para a sua operação, não pacotes de prateleira.",
  },
  {
    d: P_SHIELD,
    title: "Segurança da informação e LGPD",
    desc: "Adequação à LGPD, avaliação de riscos, políticas e documentação de compliance, DPO as a Service, backup e continuidade. Consultoria estruturada para empresas de qualquer porte.",
  },
  {
    d: P_SCALE,
    title: "Cartórios e o Provimento 213",
    desc: "A vertical mais quente, com prazo correndo. Adequação das serventias extrajudiciais à norma do CNJ, das Etapas 1 e 2 obrigatórias ao acompanhamento contínuo.",
    urgente: true,
    link: { href: "#cartorios", label: "Ver a seção de cartórios" },
  },
];

function OQueFazemos() {
  return (
    <Secao
      id="servicos"
      eyebrow="O que fazemos"
      titulo="Três frentes, uma engenharia só."
      intro="Quem escreve o sistema sabe protegê-lo. É a mesma equipe de tecnologia atendendo três públicos com necessidades diferentes."
      className="border-t border-line bg-surface-1"
    >
      <div className="grid gap-4 md:grid-cols-3">
        {FRENTES.map((f) => (
          <div
            key={f.title}
            className={`flex flex-col gap-3 rounded-field border p-5 transition-colors ${
              f.urgente
                ? "border-danger/28 bg-danger/5 hover:border-danger/42"
                : "border-line-strong bg-surface-4 hover:border-line-field-strong"
            }`}
          >
            <div className="flex items-center gap-3">
              <IconeCaixa d={f.d} urgente={f.urgente} />
              {f.urgente && (
                <span className="ml-auto rounded-chip border border-danger/30 bg-danger/12 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-danger">
                  prazo correndo
                </span>
              )}
            </div>
            <span className="text-[15.5px] font-semibold leading-[1.35] text-fg-1">
              {f.title}
            </span>
            <p className="text-[13.5px] leading-[1.6] text-fg-5">{f.desc}</p>
            {f.link && (
              <a
                href={f.link.href}
                className="mt-auto pt-1 text-[13px] font-medium text-primary-ink transition-colors hover:text-primary-fg"
              >
                {f.link.label} →
              </a>
            )}
          </div>
        ))}
      </div>
    </Secao>
  );
}

/* ---- 3. Por que a Átrios ------------------------------------------------ */

const PORQUES = [
  {
    d: P_SHIELD,
    title: "Soluções sob medida",
    desc: "Nada de pacote genérico. O sistema se adapta à sua operação, não o contrário.",
  },
  {
    d: P_TREND,
    title: "Tecnologia escalável",
    desc: "Arquitetura que cresce com o negócio, sem retrabalho a cada novo passo.",
  },
  {
    d: P_CODE,
    title: "Constrói e protege",
    desc: "Quem escreve o sistema sabe onde ele é frágil. Compliance com quem entende de engenharia.",
  },
  {
    d: P_USER,
    title: "Parceria de verdade",
    desc: "Prática de mais de 10 anos dentro de cartório. Falamos a língua de quem opera.",
  },
];

function PorQue() {
  return (
    <Secao
      id="porque"
      eyebrow="Por que a Átrios"
      titulo="Quem constrói o sistema é quem sabe protegê-lo."
      intro="Consultoria de compliance recomenda e vai embora. Empresa de TI genérica trata todo cliente igual. A Átrios faz as duas coisas e conhece o terreno: mais de 10 anos de prática dentro de serventia extrajudicial, aplicados a sistemas que precisam funcionar e resistir."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PORQUES.map((p) => (
          <Card key={p.title}>
            <IconeCaixa d={p.d} />
            <span className="text-[14.5px] font-semibold text-fg-1">
              {p.title}
            </span>
            <p className="text-[13px] leading-[1.6] text-fg-5">{p.desc}</p>
          </Card>
        ))}
      </div>
    </Secao>
  );
}

/* ---- 4. Segurança e LGPD ------------------------------------------------ */

const SEGURANCA = [
  {
    d: P_SEARCH,
    title: "Diagnóstico e avaliação de riscos",
    desc: "Levantamento estruturado do que a operação trata de dados pessoais, onde estão os riscos e o que a lei exige de cada ponto. Método, não checklist genérico.",
    pills: ["LGPD", "ISO 27001"],
  },
  {
    d: P_DOC,
    title: "Políticas e documentação",
    desc: "Política de Segurança da Informação, registro de operações (ROPA) e plano de continuidade: os documentos que a norma exige existir por escrito, prontos e defensáveis.",
    pills: ["PSI", "ROPA", "PCN"],
  },
  {
    d: P_USER,
    title: "DPO as a Service",
    desc: "Encarregado de dados como serviço contínuo: canal do titular, resposta a requerimentos, acompanhamento e prova de conformidade ao longo do tempo.",
    pills: ["Encarregado", "LGPD"],
  },
];

function Seguranca() {
  return (
    <Secao
      id="seguranca"
      eyebrow="Segurança da informação e LGPD"
      titulo="Compliance com quem entende de engenharia."
      intro="Adequação estruturada para empresas de qualquer porte. Onde a consultoria tradicional recomenda de fora, a Átrios adéqua por dentro: quem constrói o sistema sabe onde protegê-lo."
      className="border-t border-line bg-surface-1"
    >
      <div className="grid gap-4 md:grid-cols-3">
        {SEGURANCA.map((s) => (
          <Card key={s.title}>
            <IconeCaixa d={s.d} />
            <span className="text-[14.5px] font-semibold text-fg-1">
              {s.title}
            </span>
            <p className="text-[13px] leading-[1.6] text-fg-5">{s.desc}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {s.pills.map((p) => (
                <Pill key={p}>{p}</Pill>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <div className="flex flex-col items-start gap-3 rounded-field border border-line-strong bg-surface-4 p-5 sm:flex-row sm:items-center">
        <p className="text-[13.5px] leading-[1.6] text-fg-4">
          A mesma adequação, com a norma que só nós dominamos na prática, atende
          também as serventias extrajudiciais.
        </p>
        <a
          href="#cartorios"
          className="ml-auto shrink-0 text-[13px] font-medium text-primary-ink transition-colors hover:text-primary-fg"
        >
          Ver a vertical de cartórios →
        </a>
      </div>
    </Secao>
  );
}

/* ---- 5. Cartórios — tudo derivado de parametro_norma -------------------- */

function Prazos({ norma }: { norma: Norma }) {
  // A ordem de CLASSES já é "menos prazo primeiro" — a 3 é a mais urgente.
  const cor: Record<number, string> = {
    3: "text-danger",
    2: "text-warning",
    1: "text-fg-hi",
  };
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[15px] font-semibold text-fg-2">
        Quanto falta para as Etapas 1 e 2, por classe
      </h3>
      <div className="grid gap-3 md:grid-cols-3">
        {CLASSES.map((c, i) => {
          const cl = norma.porClasse[c];
          const urgente = i === 0;
          return (
            <div
              key={c}
              className={`flex flex-col gap-1.5 rounded-field border p-5 ${
                urgente
                  ? "border-danger/35 bg-danger/7"
                  : "border-line-field bg-surface-4"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[14px] font-semibold text-fg-1">
                  Classe {c}
                </span>
                {urgente && (
                  <span className="rounded-chip border border-danger/30 bg-danger/12 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-danger">
                    mais urgente
                  </span>
                )}
              </div>
              <span className="text-[12.5px] leading-[1.45] text-fg-6">
                {c === 3
                  ? `Arrecadação acima de ${brlCurto(norma.tetoClasse2)}/semestre`
                  : c === 2
                    ? `Entre ${brlCurto(norma.tetoClasse1)} e ${brlCurto(norma.tetoClasse2)}/semestre`
                    : `Até ${brlCurto(norma.tetoClasse1)}/semestre`}
              </span>
              <div className="flex items-baseline gap-1.5 pt-1">
                <span
                  className={`text-[34px] font-bold leading-none tracking-[-0.03em] ${cor[c]}`}
                >
                  {cl.diasRestantes}
                </span>
                <span className="text-[13px] text-fg-6">dias</span>
              </div>
              <span className="text-[12px] text-fg-7">
                Etapas 1 e 2 até {cl.dataLimite}
              </span>
            </div>
          );
        })}
      </div>
      <p className="max-w-[760px] text-[12.5px] leading-[1.6] text-fg-7">
        Contagem sobre o prazo do art. 20, já somada à prorrogação de{" "}
        {norma.prorrogacaoDias} dias da CGJ-RN. A classe é declarada pela
        própria serventia (art. 16, §1º), então qualquer classe exibida aqui é
        estimativa.
      </p>
    </div>
  );
}

function Classes({ norma }: { norma: Norma }) {
  const faixa: Record<number, string> = {
    1: `Até ${brlCurto(norma.tetoClasse1)}`,
    2: `${brlCurto(norma.tetoClasse1)} a ${brlCurto(norma.tetoClasse2)}`,
    3: `Acima de ${brlCurto(norma.tetoClasse2)}`,
  };
  const desc: Record<number, string> = {
    1: "Serventias de menor arrecadação. Prazos mais longos, mesmo conjunto de etapas.",
    2: "Arrecadação intermediária por semestre. Exigências completas de segurança e backup.",
    3: "Maior arrecadação e maior exigência técnica. Os prazos mais curtos da norma.",
  };
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[15px] font-semibold text-fg-2">
        As 3 classes, por arrecadação (semestral, corrigida por IPCA)
      </h3>
      <div className="grid gap-3 md:grid-cols-3">
        {[1, 2, 3].map((c) => {
          const cl = norma.porClasse[c];
          return (
            <Card key={c}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="rounded-id bg-white/6 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary-fg">
                  C{c}
                </span>
                <span className="text-[13.5px] font-semibold tracking-[-0.01em] text-fg-1">
                  {faixa[c]}
                </span>
              </div>
              <p className="text-[12.5px] leading-[1.55] text-fg-5">
                {desc[c]}
              </p>
              <div className="mt-1 flex flex-col gap-1 border-t border-line pt-2.5 text-[12px]">
                <div className="flex justify-between gap-2">
                  <span className="text-fg-7">Etapas 1 e 2 (art. 20):</span>
                  <span className="font-medium text-fg-3">
                    {cl.prazoArt20Dias} dias
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-fg-7">Adequação total (art. 23):</span>
                  <span className="font-medium text-fg-3">
                    {cl.prazoArt23Meses} meses
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Copy do protótipo, não as constantes ETAPAS/ETAPAS_ESCOPO: aquelas servem ao
// módulo interno de diagnóstico e trazem o prefixo "Etapa N" com travessão.
// Aqui a copy é a revisada pelo design, e não pode ter travessão.
const ETAPAS_SITE = [
  {
    n: 1,
    title: "Organização e proteção de dados",
    scope: "Responsáveis nomeados, regras escritas e adequação à LGPD.",
    obrig: true,
  },
  {
    n: 2,
    title: "Estrutura e funcionamento",
    scope: "Energia, equipamentos, internet e plano para emergências.",
    obrig: true,
  },
  {
    n: 3,
    title: "Proteção e cópias de segurança",
    scope: "Como os dados são protegidos e como o backup é feito.",
    obrig: false,
  },
  {
    n: 4,
    title: "Testes e acompanhamento",
    scope: "Testes que provam que a proteção funciona de verdade.",
    obrig: false,
  },
  {
    n: 5,
    title: "Integração e manutenção",
    scope: "Integração com o CNJ, treinamentos e manutenção contínua.",
    obrig: false,
  },
];

function Etapas() {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[15px] font-semibold text-fg-2">
        As 5 etapas sequenciais
      </h3>
      <ol className="flex flex-col gap-2">
        {ETAPAS_SITE.map((e) => (
          <li key={e.n}>
            <Card className="flex-row items-start gap-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-btn bg-primary/12 text-[13.5px] font-bold text-primary-fg">
                {e.n}
              </span>
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14.5px] font-semibold leading-[1.4] text-fg-1">
                    {e.title}
                  </span>
                  {e.obrig && (
                    <span className="rounded-pill border border-danger/28 bg-danger/10 px-[7px] py-0.5 text-[10.5px] font-semibold text-danger">
                      obrigatória já
                    </span>
                  )}
                </div>
                <span className="text-[13px] leading-[1.5] text-fg-5">
                  {e.scope}
                </span>
              </div>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Cartorios({ norma }: { norma: Norma }) {
  return (
    <Secao
      id="cartorios"
      eyebrow="Vertical de cartórios · prazo correndo"
      titulo="Adequação ao Provimento CNJ 213/2026."
      intro={
        <>
          A norma revogou o Prov. 74/2018 e definiu padrões de TIC, segurança e
          LGPD para todas as serventias extrajudiciais. A adequação é dividida
          por classe de arrecadação e cumprida em cinco etapas sequenciais. As
          Etapas 1 e 2 já são obrigatórias.
        </>
      }
      className="border-y border-line bg-surface-1"
    >
      <div className="flex flex-col gap-10">
        <Prazos norma={norma} />
        <Classes norma={norma} />
        <Etapas />
        <Card className="max-w-[820px] border-primary/22 bg-primary/5">
          <span className="text-[14.5px] font-semibold text-fg-1">
            {`A prorrogação da CGJ-RN é de ${norma.prorrogacaoDias} dias, e é única.`}
          </span>
          <p className="text-[13.5px] leading-[1.6] text-fg-4">
            {norma.prorrogacaoData && norma.prorrogacaoProcesso
              ? `Decisão de ${norma.prorrogacaoData} (${norma.prorrogacaoProcesso}). `
              : ""}
            Vale de ofício para todas as serventias do RN, ninguém precisa
            requerer. O art. 21 permite prorrogar uma única vez, então não
            haverá outra. E o prazo adicional não dispensa nada: durante o
            período, as medidas mitigatórias continuam obrigatórias. A norma
            está em vigor desde {norma.vigencia}.
          </p>
        </Card>
        <CtaCartorios />
      </div>
    </Secao>
  );
}

/**
 * Fecha a seção de cartórios: é onde o protótipo põe o CTA do diagnóstico e as
 * logos de parceria, e não na seção "Como funciona o diagnóstico".
 */
function CtaCartorios() {
  return (
    <div className="flex flex-col gap-3">
      <Titulo>Comece pelo diagnóstico gratuito.</Titulo>
      <p className="max-w-[720px] text-pretty text-[14.5px] leading-[1.6] text-fg-5">
        Uma conversa de 20 minutos e um relatório por escrito com a sua classe,
        seus prazos e cada ponto de adequação. Sem compromisso.
      </p>
      <Link href="/diagnostico" className={`${btnPrimario} mt-1 w-fit`}>
        Começar meu diagnóstico
      </Link>
      <Parceiros />
    </div>
  );
}

/* ---- 6. Diagnóstico ----------------------------------------------------- */

const PASSOS = [
  {
    n: 1,
    title: "Você se cadastra",
    desc: "Leva 1 minuto, seis campos, sem compromisso.",
  },
  {
    n: 2,
    title: "Conversa de 20 minutos",
    desc: "Nossa equipe pergunta sobre o dia a dia, sem jargão técnico.",
  },
  {
    n: 3,
    title: "Relatório por escrito",
    desc: "Sua classe, seus prazos e o que falta em cada etapa.",
  },
];

const BARRAS = [
  { name: "Etapa 1", w: "62%", cor: "bg-success" },
  { name: "Etapa 2", w: "48%", cor: "bg-warning" },
  { name: "Etapa 3", w: "35%", cor: "bg-danger" },
  { name: "Etapa 4", w: "55%", cor: "bg-warning" },
  { name: "Etapa 5", w: "20%", cor: "bg-danger" },
];

/**
 * Prévia do relatório: mostra o formato da entrega sem entregá-la. Os números
 * são de exemplo e ficam ilegíveis por construção — nenhum deles é apresentado
 * como resultado real de serventia alguma.
 */
function PreviewRelatorio() {
  return (
    <div className="flex flex-col gap-4 rounded-panel border border-line-strong bg-surface-card p-5">
      <div className="flex items-baseline justify-between gap-2 border-b border-line pb-3.5">
        <span className="text-[14.5px] font-semibold text-fg-1">
          Relatório de adequação
        </span>
        <span className="text-[10.5px] font-medium uppercase tracking-[0.05em] text-fg-8">
          exemplo ilustrativo
        </span>
      </div>
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="text-[30px] font-bold leading-none tracking-[-0.03em] text-fg-2 blur-[5px] select-none">
          00%
        </span>
        <div className="flex flex-col">
          <span className="text-[12.5px] text-fg-4">Conformidade estimada</span>
          <span className="text-[11.5px] text-fg-7">
            Etapas 1 a 5 avaliadas
          </span>
        </div>
      </div>
      <ul className="flex flex-col gap-3" aria-hidden="true">
        {BARRAS.map((b) => (
          <li key={b.name} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-medium text-fg-5">
                {b.name}
              </span>
              <span className="text-[12px] font-bold text-fg-3 blur-[5px] select-none">
                00%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-pill bg-white/6">
              <div
                className={`h-full rounded-pill blur-[3px] ${b.cor} opacity-55`}
                style={{ width: b.w }}
              />
            </div>
          </li>
        ))}
      </ul>
      <span className="text-[11.5px] text-fg-7">
        Disponível após a conversa
      </span>
    </div>
  );
}

/** Logos de parceria — só quando a parceria estiver formalizada (ver config). */
function Parceiros() {
  if (!showPartners()) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-8">
        Realização e apoio
      </span>
      <div className="flex flex-wrap items-center gap-4">
        <Image
          src="/landing/anoreg-rn.png"
          alt="Anoreg/RN"
          width={104}
          height={24}
          className="h-6 w-auto"
        />
        <Image
          src="/landing/arpen-rn.png"
          alt="Arpen/RN"
          width={104}
          height={24}
          className="h-6 w-auto"
        />
      </div>
    </div>
  );
}

function Diagnostico() {
  return (
    <Secao
      id="diagnostico"
      eyebrow="Como funciona o diagnóstico"
      titulo="Do cadastro ao relatório, em três passos."
      className="bg-surface-0"
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,420px)] lg:items-start lg:gap-12">
        <div className="flex flex-col gap-4">
          {PASSOS.map((p) => (
            <div key={p.n} className="flex items-start gap-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-btn bg-primary/12 text-[13.5px] font-bold text-primary-fg">
                {p.n}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold text-fg-1">
                  {p.title}
                </span>
                <span className="text-[13.5px] leading-[1.5] text-fg-5">
                  {p.desc}
                </span>
              </div>
            </div>
          ))}
          <Link href="/diagnostico" className={`${btnPrimario} mt-2 w-fit`}>
            Começar meu diagnóstico
          </Link>
        </div>
        <PreviewRelatorio />
      </div>
    </Secao>
  );
}

/* ---- 7. Quem somos ------------------------------------------------------ */

// FORA DO AR por ora: os sócios ainda são placeholder ("Sócio-fundador",
// "Sócio de tecnologia"), e um card genérico rende menos que seção nenhuma.
// Volta quando os nomes reais forem confirmados: descomente e reponha o
// <QuemSomos /> entre <Diagnostico /> e <Tecnologias />. Nada aponta para
// #quem-somos no menu nem no rodapé, então não há âncora a religar.
//
// Cuidado ao voltar: esta seção é um dos três pilares de prova social que o site
// admite (sócios, domínio da norma, stack). Os outros dois seguem no ar.
//
// const SOCIOS = [
//   {
//     mono: "SF",
//     name: "Sócio-fundador",
//     role: "Consultoria e prática de cartório",
//     cred: "Mais de 10 anos de atuação dentro de serventia extrajudicial.",
//   },
//   {
//     mono: "ST",
//     name: "Sócio de tecnologia",
//     role: "Engenharia de software e segurança",
//     cred: "Desenvolvimento, segurança e conformidade em ambientes críticos.",
//   },
// ];
//
// function QuemSomos() {
//   return (
//     <Secao
//       id="quem-somos"
//       eyebrow="Quem somos"
//       titulo="Engenharia com prática de quem opera."
//       intro="A Átrios une desenvolvimento de software e prática de operação real. É o que faz a diferença nas três frentes: mais de 10 anos de atuação dentro de serventia extrajudicial, somados a engenharia de sistemas e segurança."
//     >
//       <div className="grid gap-4 md:grid-cols-2">
//         {SOCIOS.map((s) => (
//           <Card key={s.mono} className="flex-row items-start gap-4">
//             <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-primary/12 font-mono text-[13px] font-bold text-primary-fg">
//               {s.mono}
//             </span>
//             <div className="flex flex-col gap-0.5">
//               <span className="text-[14.5px] font-semibold text-fg-1">
//                 {s.name}
//               </span>
//               <span className="text-[12.5px] text-primary-ink">{s.role}</span>
//               <p className="pt-1 text-[13px] leading-[1.55] text-fg-5">
//                 {s.cred}
//               </p>
//             </div>
//           </Card>
//         ))}
//       </div>
//       <p className="text-[12px] leading-[1.55] text-fg-8">
//         Fotos e nomes definitivos entram aqui quando confirmados. O layout já
//         está pronto para recebê-los.
//       </p>
//     </Secao>
//   );
// }

/* ---- 8. Tecnologias ----------------------------------------------------- */

const STACK = [
  {
    label: "Bancos de dados",
    items: ["PostgreSQL", "MySQL", "MongoDB", "Redis"],
  },
  { label: "APIs e integração", items: ["REST APIs", "GraphQL", "Webhooks"] },
  { label: "Infraestrutura e DevOps", items: ["AWS", "Docker", "Kubernetes"] },
  { label: "Automação", items: ["n8n"] },
];

function Tecnologias() {
  return (
    <Secao
      id="tecnologias"
      eyebrow="Tecnologias"
      titulo="A stack que sustenta o que entregamos."
      intro="Ferramentas maduras, escaláveis e amplamente adotadas. Escolhidas por caso, nunca por moda."
      className="border-t border-line bg-surface-1"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STACK.map((g) => (
          <Card key={g.label}>
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-8">
              {g.label}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {g.items.map((t) => (
                <Pill key={t}>{t}</Pill>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </Secao>
  );
}

/* ---- 9. CTA final ------------------------------------------------------- */

function CtaFinal() {
  return (
    <section className={`${wrap} py-14 md:py-24`}>
      <div className="flex flex-col items-start gap-5 rounded-panel border border-line-strong bg-surface-card p-6 md:p-10">
        <div className="flex max-w-[720px] flex-col gap-2.5">
          <Titulo>
            Tem um sistema para construir, dados para proteger ou um prazo para
            cumprir?
          </Titulo>
          <p className="text-pretty text-[14.5px] leading-[1.6] text-fg-4 md:text-[15.5px]">
            Fale com a Átrios. Se você é de cartório, comece pelo diagnóstico
            gratuito: em 20 minutos você sai com um plano por escrito.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href={whatsappUrl(WA_TEXTO_CARTORIO)}
            target="_blank"
            rel="noopener noreferrer"
            className={btnPrimario}
          >
            Falar no WhatsApp
          </a>
          <Link href="/diagnostico" className={btnGhost}>
            Diagnóstico para cartórios
          </Link>
        </div>
        <span className="text-[13px] text-fg-6">
          <a
            href={`mailto:${CONTATO_EMAIL}`}
            className="text-primary-ink no-underline hover:text-primary-fg"
          >
            {CONTATO_EMAIL}
          </a>
          {` · WhatsApp ${WHATSAPP_EXIBICAO}`}
        </span>
      </div>
    </section>
  );
}

/* ---- Rodapé ------------------------------------------------------------- */

const RODAPE_NAV = [
  { href: "#servicos", label: "O que fazemos" },
  { href: "#porque", label: "Por que a Átrios" },
  { href: "#cartorios", label: "Cartórios e Prov. 213" },
  { href: "#tecnologias", label: "Tecnologias" },
];

function Rodape() {
  return (
    <footer className="border-t border-line bg-surface-0">
      <div className={`${wrap} flex flex-col gap-8 py-12`}>
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.6fr)_1fr_1fr]">
          <div className="flex flex-col gap-3">
            <LogoAtriosLockup className="h-[26px] w-auto text-white" />
            <p className="max-w-[420px] text-[13px] leading-[1.6] text-fg-6">
              Software sob medida, segurança da informação e LGPD, e a vertical
              de cartórios (Provimento CNJ 213/2026). A mesma competência que
              constrói sistemas também os protege.
            </p>
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-8">
              A Technology Group Company
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-8">
              Navegar
            </span>
            {RODAPE_NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="text-[13px] text-fg-5 transition-colors hover:text-fg-2"
              >
                {n.label}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-8">
              Contato
            </span>
            <a
              href={`mailto:${CONTATO_EMAIL}`}
              className="text-[13px] text-fg-5 transition-colors hover:text-fg-2"
            >
              {CONTATO_EMAIL}
            </a>
            <a
              href={whatsappUrl(WA_TEXTO)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-fg-5 transition-colors hover:text-fg-2"
            >
              {`WhatsApp ${WHATSAPP_EXIBICAO}`}
            </a>
            <Link
              href="/diagnostico"
              className="text-[13px] text-fg-5 transition-colors hover:text-fg-2"
            >
              Diagnóstico gratuito
            </Link>
            <Link
              href="/privacidade"
              className="text-[13px] text-fg-5 transition-colors hover:text-fg-2"
            >
              Política de privacidade
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-1 border-t border-line pt-6 text-[12px] text-fg-8 sm:flex-row sm:justify-between">
          <span>© 2026 Átrios Tecnologia e Consultoria.</span>
          <span>Feito com tecnologia, para o Rio Grande do Norte e além.</span>
        </div>
      </div>
    </footer>
  );
}

/* ---- Dados estruturados -------------------------------------------------- */

function JsonLd() {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Átrios Tecnologia e Consultoria",
    description: META_DESC,
    url: siteUrl(),
    logo: `${siteUrl()}/landing/atrios-logo.png`,
    email: CONTATO_EMAIL,
    telephone: `+${WHATSAPP_NUMERO}`,
    areaServed: {
      "@type": "State",
      name: "Rio Grande do Norte",
      addressCountry: "BR",
    },
    address: {
      "@type": "PostalAddress",
      addressRegion: "RN",
      addressCountry: "BR",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      email: CONTATO_EMAIL,
      telephone: `+${WHATSAPP_NUMERO}`,
      availableLanguage: "Portuguese",
    },
  };
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD estático, serializado de objeto próprio — sem entrada de usuário
      dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }}
    />
  );
}

/* ---- Página -------------------------------------------------------------- */

export default async function HomePage() {
  const norma = await carregarNorma();

  return (
    <main className="min-h-dvh w-full bg-surface-0">
      <JsonLd />
      <Topo />
      <Hero />
      <OQueFazemos />
      <PorQue />
      <Seguranca />
      <Cartorios norma={norma} />
      <Diagnostico />
      {/* <QuemSomos /> fora do ar até os nomes reais dos sócios (ver acima). */}
      <Tecnologias />
      <CtaFinal />
      <Rodape />
    </main>
  );
}
