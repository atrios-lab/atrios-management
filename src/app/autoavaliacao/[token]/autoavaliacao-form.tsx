"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import type {
  DiagnosticoModelo,
  IdentidadeItem,
  RespostaValor,
} from "@/db/schema";
import { cn } from "@/lib/cn";
import {
  type ErrosRespondente,
  faltantesParaEnvio,
  LEGENDA_OPCOES,
  mensagemFaltantes,
  type PayloadPublico,
  validarEnquadramento,
  validarRespondente,
} from "@/lib/diagnostico/autoavaliacao";
import { CLASSE_LABEL, MODELO_LABEL } from "@/lib/diagnostico/constants";
import { CARGOS, formatarWhatsapp } from "@/lib/diagnostico/pre-cadastro";
import { whatsappUrl } from "@/lib/landing/config";
import {
  declararEnquadramento,
  enviarAutoavaliacao,
  iniciarAutoavaliacao,
  responderAutoavaliacao,
} from "./actions";

// Formulário que a serventia responde sozinha. Só linguagem simples: nenhuma
// referência normativa, peso ou pergunta técnica chega aqui (o payload já vem
// filtrado pelo servidor). Cada resposta é gravada na hora (autosave) e o
// mesmo link retoma de onde parou.

interface EtapaView {
  numero: number;
  titulo: string;
  escopo: string;
}

interface Respondente {
  nome: string;
  cargo: string;
  email: string;
  whatsapp: string;
}

type StatusSalvo = "salvando" | "salvo" | "erro";

/* ---- Estilos compartilhados com a landing -------------------------------- */

const controle =
  "h-12 w-full rounded-field border bg-surface-1 px-3.5 text-[15px] text-fg-1 outline-none transition-colors md:h-[44px] md:text-sm";
// Cor SÓ por token (a rota roda em tema claro; ver telas.tsx). O teste
// autoavaliacao-tema.test.ts falha se aparecer hex/rgba literal aqui.
const focoOk = "focus:border-primary/55 focus:ring-3 focus:ring-primary/15";
const bordaErro = "border-danger/55 ring-3 ring-danger/10";
const classeCampo = (erro?: string) =>
  `${controle} ${erro ? bordaErro : `border-line-field ${focoOk}`}`;

const painel =
  "flex flex-col gap-4 rounded-panel border border-line-strong bg-surface-card p-5 md:p-6";
const botaoPrimario =
  "flex h-12 w-full items-center justify-center rounded-field bg-primary px-5 text-[15px] font-semibold text-white shadow-brand transition-colors hover:bg-primary-hover disabled:opacity-60 md:w-auto";

function Rotulo({
  children,
  htmlFor,
  opcional,
}: {
  children: React.ReactNode;
  htmlFor: string;
  opcional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="text-[13.5px] font-medium text-fg-3">
      {children}{" "}
      {opcional ? (
        <span className="font-normal text-fg-8">(opcional)</span>
      ) : (
        <span className="text-danger">*</span>
      )}
    </label>
  );
}

function ErroCampo({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <span className="text-xs text-danger">{msg}</span>;
}

function Titulo({
  passo,
  children,
  sub,
}: {
  passo: string;
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-9">
        {passo}
      </span>
      <h2 className="text-[19px] font-bold leading-tight tracking-[-0.01em] text-fg-hi">
        {children}
      </h2>
      {sub && <p className="text-[14px] leading-[1.5] text-fg-5">{sub}</p>}
    </div>
  );
}

/* ---- Opções de resposta -------------------------------------------------- */

function Opcoes({
  name,
  valor,
  onChange,
  disabled,
}: {
  name: string;
  valor?: RespostaValor;
  onChange: (v: RespostaValor) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {LEGENDA_OPCOES.map((o) => (
        <label
          key={o.value}
          className={cn(
            "flex h-11 cursor-pointer items-center justify-center rounded-field border text-[14px] font-medium transition-colors",
            valor === o.value
              ? "border-primary/70 bg-primary/20 text-fg-hi"
              : "border-line-field bg-surface-1 text-fg-4 hover:border-line-strong hover:text-fg-2",
            disabled && "cursor-default opacity-70",
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={valor === o.value}
            disabled={disabled}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function IndicadorSalvo({ status }: { status?: StatusSalvo }) {
  if (!status) return null;
  return (
    <span
      className={cn(
        "text-[11.5px]",
        status === "erro" ? "text-danger" : "text-fg-8",
      )}
    >
      {status === "salvando" && "Salvando…"}
      {status === "salvo" && "Salvo"}
      {status === "erro" && "Não salvou. Toque de novo para tentar."}
    </span>
  );
}

/* ---- Formulário ---------------------------------------------------------- */

export function AutoavaliacaoForm({
  token,
  payload,
  etapas,
  respondente: respondenteInicial,
  enviadoEm,
  respostasIniciais,
  identidadeIniciais,
}: {
  token: string;
  payload: PayloadPublico;
  etapas: EtapaView[];
  respondente: Respondente | null;
  enviadoEm: Date | null;
  respostasIniciais: Record<string, RespostaValor>;
  identidadeIniciais: Record<string, RespostaValor>;
}) {
  const router = useRouter();
  const uid = useId();
  const id = (c: string) => `${uid}-${c}`;
  const { diagnostico: diag, requisitos, identidade } = payload;

  // 1. identificação
  const [respondente, setRespondente] = useState<Respondente | null>(
    respondenteInicial,
  );
  const [campos, setCampos] = useState<Respondente>(
    respondenteInicial ?? { nome: "", cargo: "", email: "", whatsapp: "" },
  );
  const [consentimento, setConsentimento] = useState(
    respondenteInicial !== null,
  );
  const [errosResp, setErrosResp] = useState<
    ErrosRespondente & { geral?: string }
  >({});
  const [editandoResp, setEditandoResp] = useState(respondenteInicial === null);

  // 2. enquadramento
  const [classe, setClasse] = useState<number | null>(diag.classe);
  const [modelo, setModelo] = useState<DiagnosticoModelo>(diag.modeloSolucao);
  const [erroEnq, setErroEnq] = useState<string | null>(null);
  const enquadramentoSujo =
    classe !== diag.classe || modelo !== diag.modeloSolucao;

  // 3. respostas
  const [respostas, setRespostas] =
    useState<Record<string, RespostaValor>>(respostasIniciais);
  const [respostasIdent, setRespostasIdent] =
    useState<Record<string, RespostaValor>>(identidadeIniciais);
  const [status, setStatus] = useState<Record<string, StatusSalvo>>({});
  const [destaque, setDestaque] = useState<string | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<Date | null>(enviadoEm);
  const [pending, startTransition] = useTransition();
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  const total = requisitos.length + identidade.length;
  const respondidas =
    requisitos.filter((r) => respostas[r.id]).length +
    identidade.filter((q) => respostasIdent[q.item]).length;
  const podeResponder = respondente !== null && diag.classe != null;

  /* -- ações -- */

  const salvarRespondente = () => {
    if (pending) return;
    const { errors } = validarRespondente({ ...campos, consentimento });
    if (Object.keys(errors).length > 0) {
      setErrosResp(errors);
      return;
    }
    setErrosResp({});
    startTransition(async () => {
      const r = await iniciarAutoavaliacao(token, { ...campos, consentimento });
      if (!r.ok) {
        setErrosResp({ ...r.errors, geral: r.error });
        return;
      }
      setRespondente(campos);
      setEditandoResp(false);
      // se já há classe, o servidor não precisa recarregar nada; se não há, a
      // seção de enquadramento aparece com o estado local
    });
  };

  const salvarEnquadramento = () => {
    if (pending || classe == null) return;
    const { error } = validarEnquadramento({ classe, modelo });
    if (error) {
      setErroEnq(error);
      return;
    }
    setErroEnq(null);
    startTransition(async () => {
      const r = await declararEnquadramento(token, { classe, modelo });
      if (!r.ok) {
        setErroEnq(r.error);
        return;
      }
      // a classe define quais perguntas aparecem: recarrega do servidor
      router.refresh();
    });
  };

  const responder = (chave: string, envio: () => Promise<{ ok: boolean }>) => {
    setStatus((s) => ({ ...s, [chave]: "salvando" }));
    setDestaque((d) => (d === chave ? null : d));
    void envio().then(
      (r) => setStatus((s) => ({ ...s, [chave]: r.ok ? "salvo" : "erro" })),
      () => setStatus((s) => ({ ...s, [chave]: "erro" })),
    );
  };

  const responderRequisito = (requisitoId: string, valor: RespostaValor) => {
    setRespostas((p) => ({ ...p, [requisitoId]: valor }));
    responder(requisitoId, () =>
      responderAutoavaliacao(token, { requisitoId, valor }),
    );
  };

  const responderIdentidade = (item: IdentidadeItem, valor: RespostaValor) => {
    setRespostasIdent((p) => ({ ...p, [item]: valor }));
    responder(item, () => responderAutoavaliacao(token, { item, valor }));
  };

  const enviar = () => {
    if (pending) return;
    setErroEnvio(null);
    const faltantes = faltantesParaEnvio(
      requisitos.map((r) => r.id),
      new Set(Object.keys(respostas)),
      identidade.map((q) => q.item),
      new Set(Object.keys(respostasIdent) as IdentidadeItem[]),
    );
    if (faltantes.total > 0) {
      const primeira = faltantes.identidade[0] ?? faltantes.requisitos[0];
      setDestaque(primeira);
      setErroEnvio(mensagemFaltantes(faltantes.total));
      refs.current[primeira]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    startTransition(async () => {
      const r = await enviarAutoavaliacao(token);
      if (!r.ok) {
        setErroEnvio(r.faltantes ? mensagemFaltantes(r.faltantes) : r.error);
        return;
      }
      setEnviado(new Date());
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  /* -- cabeçalho comum -- */

  const cabecalho = (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-9">
        Autoavaliação · Provimento CNJ 213/2026
      </span>
      <h1 className="text-[24px] font-bold leading-[1.2] tracking-[-0.02em] text-fg-hi md:text-[28px]">
        {diag.serventia}
      </h1>
      <p className="text-[14px] text-fg-6">
        {diag.municipio ? `${diag.municipio} / ${diag.uf}` : diag.uf}
      </p>
    </div>
  );

  /* -- tela pós-envio -- */

  if (enviado) {
    return (
      <>
        {cabecalho}
        <div className={cn(painel, "items-center text-center")}>
          <div className="mt-1 flex size-[58px] items-center justify-center rounded-full border border-success/35 bg-success/10 text-success">
            <svg
              width="26"
              height="26"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <path
                d="M3.5 8.5l3 3 6-6.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="text-[22px] font-bold tracking-[-0.02em] text-fg-hi">
            Recebemos suas respostas!
          </h2>
          <p className="max-w-[440px] text-[15px] leading-[1.55] text-fg-4">
            {total} respostas enviadas em{" "}
            {enviado.toLocaleString("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
            . A equipe da Átrios vai analisar e entrar em contato com o
            relatório do cartório.
          </p>
          <a
            href={whatsappUrl(
              `Olá! Acabei de enviar a autoavaliação do Provimento CNJ 213/2026 pela serventia ${diag.serventia}.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-full max-w-[420px] items-center justify-center rounded-field border border-success/45 text-[15px] font-semibold text-success no-underline transition-colors hover:bg-success/8"
          >
            Falar com a Átrios no WhatsApp
          </a>
        </div>

        <details className="rounded-panel border border-line bg-surface-card p-5">
          <summary className="cursor-pointer text-[14px] font-medium text-fg-3">
            Ver o que foi respondido
          </summary>
          <div className="mt-4 flex flex-col gap-3">
            {identidade.map((q) => (
              <Resumo
                key={q.item}
                pergunta={q.perguntaSimples}
                valor={respostasIdent[q.item]}
              />
            ))}
            {requisitos.map((r) => (
              <Resumo
                key={r.id}
                pergunta={r.perguntaSimples}
                valor={respostas[r.id]}
              />
            ))}
          </div>
        </details>
      </>
    );
  }

  /* -- formulário -- */

  return (
    <>
      {cabecalho}

      <p className="text-[15px] leading-[1.55] text-fg-4">
        São perguntas simples sobre a rotina do cartório. Leva uns 15 minutos.
        Suas respostas são salvas automaticamente: pode parar e voltar depois
        por este mesmo link.
      </p>

      {/* 1. Quem está respondendo */}
      <section className={painel}>
        <Titulo
          passo="Passo 1"
          sub="Para sabermos com quem falar sobre o resultado."
        >
          Quem está respondendo
        </Titulo>

        {respondente && !editandoResp ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-[14.5px] text-fg-2">
            <span>
              {respondente.nome}
              {respondente.cargo ? ` · ${respondente.cargo}` : ""}
              <span className="block text-[13px] text-fg-6">
                {respondente.whatsapp || respondente.email}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setEditandoResp(true)}
              className="text-[13px] text-primary-ink hover:text-primary-fg"
            >
              Alterar
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Rotulo htmlFor={id("nome")}>Seu nome</Rotulo>
                <input
                  id={id("nome")}
                  type="text"
                  autoComplete="name"
                  placeholder="Nome completo"
                  className={classeCampo(errosResp.nome)}
                  value={campos.nome}
                  onChange={(e) =>
                    setCampos((c) => ({ ...c, nome: e.target.value }))
                  }
                />
                <ErroCampo msg={errosResp.nome} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Rotulo htmlFor={id("cargo")} opcional>
                  Cargo
                </Rotulo>
                <select
                  id={id("cargo")}
                  className={`${classeCampo()} cursor-pointer`}
                  value={campos.cargo}
                  onChange={(e) =>
                    setCampos((c) => ({ ...c, cargo: e.target.value }))
                  }
                >
                  <option value="">Selecione</option>
                  {CARGOS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Rotulo htmlFor={id("whatsapp")}>WhatsApp</Rotulo>
                <input
                  id={id("whatsapp")}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(84) 9 0000-0000"
                  className={classeCampo(errosResp.whatsapp)}
                  value={campos.whatsapp}
                  onChange={(e) =>
                    setCampos((c) => ({
                      ...c,
                      whatsapp: formatarWhatsapp(e.target.value),
                    }))
                  }
                />
                <ErroCampo msg={errosResp.whatsapp} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Rotulo htmlFor={id("email")}>E-mail</Rotulo>
                <input
                  id={id("email")}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="voce@cartorio.com.br"
                  className={classeCampo(errosResp.email)}
                  value={campos.email}
                  onChange={(e) =>
                    setCampos((c) => ({ ...c, email: e.target.value }))
                  }
                />
                <ErroCampo msg={errosResp.email} />
              </div>
            </div>
            <p className="-mt-2 text-[12.5px] text-fg-8">
              Basta um dos dois contatos: WhatsApp ou e-mail.
            </p>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-start gap-2.5">
                <input
                  id={id("consentimento")}
                  type="checkbox"
                  checked={consentimento}
                  onChange={(e) => setConsentimento(e.target.checked)}
                  className={cn(
                    "mt-0.5 size-[20px] shrink-0 cursor-pointer rounded-[5px] accent-primary",
                    errosResp.consentimento &&
                      "outline outline-1 outline-danger",
                  )}
                />
                <label
                  htmlFor={id("consentimento")}
                  className="cursor-pointer text-[13px] leading-[1.55] text-fg-6"
                >
                  Eu autorizo a Átrios a usar meus dados e as respostas deste
                  formulário para elaborar o diagnóstico do cartório, segundo a{" "}
                  <Link
                    href="/privacidade"
                    target="_blank"
                    className="text-primary-ink no-underline hover:text-primary-fg"
                  >
                    Política de privacidade
                  </Link>
                  . Posso revogar quando quiser em contato@atrioss.com.
                </label>
              </div>
              <ErroCampo msg={errosResp.consentimento} />
            </div>

            {errosResp.geral && (
              <p className="text-[13px] text-danger">{errosResp.geral}</p>
            )}
            <button
              type="button"
              onClick={salvarRespondente}
              disabled={pending}
              className={botaoPrimario}
            >
              {pending
                ? "Salvando…"
                : respondente
                  ? "Salvar alteração"
                  : "Começar"}
            </button>
          </>
        )}
      </section>

      {/* 2. Sobre o cartório (enquadramento) */}
      {respondente && (
        <section className={painel}>
          <Titulo
            passo="Passo 2"
            sub="Isso define quais perguntas se aplicam ao cartório. Pelo Provimento, vale o que a própria serventia declara."
          >
            Sobre o cartório
          </Titulo>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13.5px] font-medium text-fg-3">
              Receita bruta do cartório por semestre{" "}
              <span className="text-danger">*</span>
              <span className="block text-[12.5px] font-normal text-fg-8">
                Considere os últimos seis meses.
              </span>
            </legend>
            {[1, 2, 3].map((c) => (
              <label
                key={c}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-field border px-3.5 py-2.5 text-[14.5px] transition-colors",
                  classe === c
                    ? "border-primary/70 bg-primary/15 text-fg-hi"
                    : "border-line-field bg-surface-1 text-fg-3 hover:border-line-strong",
                )}
              >
                <input
                  type="radio"
                  name={id("classe")}
                  checked={classe === c}
                  onChange={() => setClasse(c)}
                  className="size-[18px] accent-primary"
                />
                {CLASSE_LABEL[c].replace(/^Classe \d — /, "")}
              </label>
            ))}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13.5px] font-medium text-fg-3">
              Como funciona o sistema do cartório{" "}
              <span className="text-danger">*</span>
            </legend>
            {(Object.keys(MODELO_LABEL) as DiagnosticoModelo[]).map((m) => (
              <label
                key={m}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-field border px-3.5 py-2.5 text-[14.5px] transition-colors",
                  modelo === m
                    ? "border-primary/70 bg-primary/15 text-fg-hi"
                    : "border-line-field bg-surface-1 text-fg-3 hover:border-line-strong",
                )}
              >
                <input
                  type="radio"
                  name={id("modelo")}
                  checked={modelo === m}
                  onChange={() => setModelo(m)}
                  className="size-[18px] accent-primary"
                />
                {MODELO_LABEL[m]}
              </label>
            ))}
          </fieldset>

          {erroEnq && <p className="text-[13px] text-danger">{erroEnq}</p>}
          {(diag.classe == null || enquadramentoSujo) && (
            <button
              type="button"
              onClick={salvarEnquadramento}
              disabled={pending || classe == null}
              className={botaoPrimario}
            >
              {pending
                ? "Salvando…"
                : diag.classe == null
                  ? "Salvar e ver as perguntas"
                  : "Salvar alteração"}
            </button>
          )}
        </section>
      )}

      {/* 3. Perguntas */}
      {podeResponder && (
        <>
          <section className={painel}>
            <Titulo
              passo="Passo 3"
              sub="Responda pelo que existe hoje no cartório. Não há resposta errada: o objetivo é saber por onde começar."
            >
              As perguntas
            </Titulo>
            <ul className="flex flex-col gap-1.5 rounded-field border border-line bg-surface-1 p-3.5 text-[13.5px] leading-[1.5] text-fg-5">
              {LEGENDA_OPCOES.map((o) => (
                <li key={o.value}>
                  <b className="text-fg-2">{o.label}</b>: {o.ajuda}
                </li>
              ))}
            </ul>
          </section>

          <Secao
            titulo="Identidade digital do cartório"
            escopo="Site, e-mail e telefone que o público usa para falar com o cartório."
          >
            {identidade.map((q) => (
              <Pergunta
                key={q.item}
                ref={(el) => {
                  refs.current[q.item] = el;
                }}
                texto={q.perguntaSimples}
                destacada={destaque === q.item}
                status={status[q.item]}
              >
                <Opcoes
                  name={id(q.item)}
                  valor={respostasIdent[q.item]}
                  onChange={(v) => responderIdentidade(q.item, v)}
                />
              </Pergunta>
            ))}
          </Secao>

          {etapas.map((etapa) => {
            const lista = requisitos.filter((r) => r.etapa === etapa.numero);
            if (lista.length === 0) return null;
            return (
              <Secao
                key={etapa.numero}
                titulo={etapa.titulo}
                escopo={etapa.escopo}
              >
                {lista.map((r) => (
                  <Pergunta
                    key={r.id}
                    ref={(el) => {
                      refs.current[r.id] = el;
                    }}
                    texto={r.perguntaSimples}
                    destacada={destaque === r.id}
                    status={status[r.id]}
                  >
                    <Opcoes
                      name={id(r.id)}
                      valor={respostas[r.id]}
                      onChange={(v) => responderRequisito(r.id, v)}
                    />
                  </Pergunta>
                ))}
              </Secao>
            );
          })}

          {/* barra fixa de envio */}
          <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface-0/92 px-4 py-3 backdrop-blur md:px-10">
            <div className="mx-auto flex w-full max-w-[640px] flex-col gap-2">
              {/* erro em linha própria: ao lado do contador, no celular,
                  quebrava em quatro linhas e espremia o botão */}
              {erroEnvio && (
                <p className="text-[13px] leading-snug text-danger">
                  {erroEnvio}
                </p>
              )}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-[12.5px] text-fg-6">
                    {respondidas} de {total} respondidas
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-fg-hi/10">
                    <div
                      className="h-full rounded-pill bg-primary transition-[width]"
                      style={{
                        width: `${total ? Math.round((respondidas / total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={enviar}
                  disabled={pending}
                  className="h-12 shrink-0 rounded-field bg-primary px-5 text-[15px] font-semibold text-white shadow-brand transition-colors hover:bg-primary-hover disabled:opacity-60"
                >
                  {pending ? "Enviando…" : "Enviar respostas"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ---- Blocos de apresentação --------------------------------------------- */

function Secao({
  titulo,
  escopo,
  children,
}: {
  titulo: string;
  escopo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-panel border border-line bg-surface-card p-5 md:p-6">
      <h2 className="text-[17px] font-semibold leading-tight text-fg-hi">
        {titulo}
      </h2>
      <p className="mt-1 text-[13.5px] leading-[1.5] text-fg-6">{escopo}</p>
      <div className="mt-2 flex flex-col divide-y divide-line-subtle">
        {children}
      </div>
    </section>
  );
}

function Pergunta({
  ref,
  texto,
  destacada,
  status,
  children,
}: {
  ref: React.Ref<HTMLDivElement>;
  texto: string;
  destacada: boolean;
  status?: StatusSalvo;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-3 py-4 transition-colors",
        destacada &&
          "-mx-3 rounded-field border border-warning/50 bg-warning/8 px-3",
      )}
    >
      <p className="text-[15px] font-medium leading-[1.45] text-fg-1">
        {texto}
      </p>
      {children}
      <IndicadorSalvo status={status} />
    </div>
  );
}

function Resumo({
  pergunta,
  valor,
}: {
  pergunta: string;
  valor?: RespostaValor;
}) {
  const label = LEGENDA_OPCOES.find((o) => o.value === valor)?.label ?? "—";
  return (
    <div className="flex items-start justify-between gap-4 text-[13.5px]">
      <span className="leading-[1.45] text-fg-5">{pergunta}</span>
      <span className="shrink-0 font-medium text-fg-2">{label}</span>
    </div>
  );
}
