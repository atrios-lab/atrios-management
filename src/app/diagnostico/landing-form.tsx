"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import {
  ATRIBUICOES,
  CARGOS,
  type ErrosPorCampo,
  formatarWhatsapp,
  MUNICIPIOS_RN,
  type PreCadastroCampo,
  validarPreCadastro,
} from "@/lib/diagnostico/pre-cadastro";
import { whatsappUrl as waUrl } from "@/lib/landing/config";
import { enviarPreCadastro } from "./actions";

/** Link do WhatsApp com mensagem pré-preenchida, citando a serventia quando disponível. */
function whatsappUrl(serventia?: string) {
  return waUrl(
    serventia
      ? `Olá! Acabei de fazer o pré-cadastro do diagnóstico gratuito do Provimento CNJ 213/2026 pela serventia ${serventia}.`
      : "Olá! Acabei de fazer o pré-cadastro do diagnóstico gratuito do Provimento CNJ 213/2026.",
  );
}

const controle =
  "h-12 w-full rounded-field border bg-surface-1 px-3.5 text-[15px] text-fg-1 outline-none transition-colors md:h-[42px] md:px-[13px] md:text-sm";
const focoOk =
  "focus:border-[rgba(94,106,210,0.55)] focus:shadow-[0_0_0_3px_rgba(94,106,210,0.15)]";
const bordaOk = "border-line-field";
const bordaErro =
  "border-[rgba(224,108,108,0.55)] shadow-[0_0_0_3px_rgba(224,108,108,0.10)]";

function classeCampo(erro?: string) {
  return `${controle} ${erro ? bordaErro : `${bordaOk} ${focoOk}`}`;
}

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
    <label
      htmlFor={htmlFor}
      className="text-[13px] font-medium text-[#b6b9c2] md:text-[12.5px]"
    >
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
  return (
    <span className="flex items-center gap-1.5 text-xs text-danger">
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="6.4" />
        <path d="M8 5v3.4M8 11h.01" strokeLinecap="round" />
      </svg>
      {msg}
    </span>
  );
}

const chevron = (
  <svg
    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="#6b6f7a"
    strokeWidth="1.6"
    aria-hidden="true"
  >
    <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type Campos = {
  nomeServentia: string;
  municipioUf: string;
  atribuicao: string;
  seuNome: string;
  cargo: string;
  whatsapp: string;
  email: string;
};

const VAZIO: Campos = {
  nomeServentia: "",
  municipioUf: "",
  atribuicao: "",
  seuNome: "",
  cargo: "",
  whatsapp: "",
  email: "",
};

export function LandingForm() {
  const uid = useId();
  const id = (campo: string) => `${uid}-${campo}`;
  const [campos, setCampos] = useState<Campos>(VAZIO);
  const [consentimento, setConsentimento] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<ErrosPorCampo & { geral?: string }>({});
  const [sucesso, setSucesso] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = (campo: keyof Campos, valor: string) => {
    setCampos((c) => ({ ...c, [campo]: valor }));
    if (errors[campo as PreCadastroCampo])
      setErrors((e) => ({ ...e, [campo]: undefined }));
  };

  const submit = () => {
    if (pending) return;
    // valida no client para feedback imediato; o servidor revalida.
    const { errors: locais } = validarPreCadastro({ ...campos, consentimento });
    if (Object.keys(locais).length > 0) {
      setErrors(locais);
      return;
    }
    setErrors({});
    startTransition(async () => {
      const res = await enviarPreCadastro({
        ...campos,
        consentimento,
        website: honeypot,
      });
      if (res.ok) {
        setSucesso(true);
        return;
      }
      setErrors(res.errors ?? { geral: "Não foi possível enviar." });
    });
  };

  if (sucesso) return <Sucesso serventia={campos.nomeServentia} />;

  return (
    <div className="flex flex-col gap-4 rounded-panel border border-line-strong bg-surface-card p-5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)] md:gap-[15px] md:p-[26px_26px_24px]">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-9">
        Pré-cadastro em 1 minuto
      </span>

      {/* honeypot: invisível para humanos, atrai bots. */}
      <div
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor={id("website")}>Não preencha este campo</label>
        <input
          id={id("website")}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Rotulo htmlFor={id("serventia")}>Nome da serventia</Rotulo>
        <input
          id={id("serventia")}
          type="text"
          placeholder="Ex.: Cartório do 1º Ofício de Notas"
          className={classeCampo(errors.nomeServentia)}
          value={campos.nomeServentia}
          onChange={(e) => set("nomeServentia", e.target.value)}
        />
        <ErroCampo msg={errors.nomeServentia} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-[14px]">
        <div className="flex flex-col gap-1.5">
          <Rotulo htmlFor={id("municipio")}>Município / UF</Rotulo>
          <div className="relative">
            <select
              id={id("municipio")}
              className={`${classeCampo(errors.municipioUf)} cursor-pointer appearance-none pr-9`}
              value={campos.municipioUf}
              onChange={(e) => set("municipioUf", e.target.value)}
            >
              <option value="">Selecione o município (RN)</option>
              {MUNICIPIOS_RN.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {chevron}
          </div>
          <ErroCampo msg={errors.municipioUf} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Rotulo htmlFor={id("atribuicao")}>Atribuição da serventia</Rotulo>
          <div className="relative">
            <select
              id={id("atribuicao")}
              className={`${classeCampo(errors.atribuicao)} cursor-pointer appearance-none pr-9`}
              value={campos.atribuicao}
              onChange={(e) => set("atribuicao", e.target.value)}
            >
              <option value="">Selecione a atribuição</option>
              {ATRIBUICOES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            {chevron}
          </div>
          <ErroCampo msg={errors.atribuicao} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-[14px]">
        <div className="flex flex-col gap-1.5">
          <Rotulo htmlFor={id("nome")}>Seu nome</Rotulo>
          <input
            id={id("nome")}
            type="text"
            placeholder="Nome completo"
            className={classeCampo(errors.seuNome)}
            value={campos.seuNome}
            onChange={(e) => set("seuNome", e.target.value)}
          />
          <ErroCampo msg={errors.seuNome} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Rotulo htmlFor={id("cargo")} opcional>
            Cargo
          </Rotulo>
          <div className="relative">
            <select
              id={id("cargo")}
              className={`${classeCampo()} cursor-pointer appearance-none pr-9`}
              value={campos.cargo}
              onChange={(e) => set("cargo", e.target.value)}
            >
              <option value="">Selecione</option>
              {CARGOS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {chevron}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-[14px]">
        <div className="flex flex-col gap-1.5">
          <Rotulo htmlFor={id("whatsapp")}>WhatsApp</Rotulo>
          <input
            id={id("whatsapp")}
            type="tel"
            inputMode="tel"
            placeholder="(84) 9 0000-0000"
            className={classeCampo(errors.whatsapp)}
            value={campos.whatsapp}
            onChange={(e) => set("whatsapp", formatarWhatsapp(e.target.value))}
          />
          <ErroCampo msg={errors.whatsapp} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Rotulo htmlFor={id("email")}>E-mail</Rotulo>
          <input
            id={id("email")}
            type="email"
            inputMode="email"
            placeholder="voce@cartorio.com.br"
            className={classeCampo(errors.email)}
            value={campos.email}
            onChange={(e) => set("email", e.target.value)}
          />
          <ErroCampo msg={errors.email} />
        </div>
      </div>

      <div className="mt-0.5 flex flex-col gap-2.5">
        {/* Consentimento explícito (LGPD art. 8º): nunca pré-marcado, com a
            finalidade declarada no próprio rótulo. */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-2.5">
            <input
              id={id("consentimento")}
              type="checkbox"
              checked={consentimento}
              onChange={(e) => {
                setConsentimento(e.target.checked);
                if (errors.consentimento)
                  setErrors((x) => ({ ...x, consentimento: undefined }));
              }}
              className={`mt-0.5 size-[18px] shrink-0 cursor-pointer rounded-[5px] accent-primary ${
                errors.consentimento ? "outline outline-1 outline-danger" : ""
              }`}
            />
            <label
              htmlFor={id("consentimento")}
              className="cursor-pointer text-xs leading-[1.55] text-fg-6 md:text-[11.5px]"
            >
              Autorizo a Átrios a tratar meus dados de contato com a finalidade
              exclusiva de falar comigo sobre o diagnóstico gratuito e a
              adequação à Lei Geral de Proteção de Dados (LGPD). Posso revogar
              este consentimento a qualquer momento em{" "}
              <a
                href="mailto:contato@atrioss.com"
                className="text-primary-ink no-underline hover:text-primary-fg"
              >
                contato@atrioss.com
              </a>
              , como descrito na{" "}
              <Link
                href="/privacidade"
                target="_blank"
                className="text-primary-ink no-underline hover:text-primary-fg"
              >
                Política de privacidade
              </Link>
              .
            </label>
          </div>
          <ErroCampo msg={errors.consentimento} />
        </div>

        {errors.geral && (
          <p className="text-[13px] leading-snug text-danger">{errors.geral}</p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="h-[52px] w-full rounded-field bg-primary text-[15.5px] font-semibold text-white shadow-[0_4px_14px_rgba(94,106,210,0.30)] transition-colors hover:bg-primary-hover disabled:opacity-70 md:h-12 md:text-[15px]"
        >
          {pending ? "Enviando…" : "Quero meu diagnóstico gratuito"}
        </button>
        <p className="text-xs leading-[1.55] text-fg-8 md:text-[11.5px]">
          Sem compromisso. Não vendemos nem compartilhamos seus dados com
          terceiros.
        </p>
      </div>
    </div>
  );
}

function Sucesso({ serventia }: { serventia?: string }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center gap-4 rounded-panel border border-line-strong bg-surface-card p-8 text-center shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)]">
      <div className="mt-2 flex size-[58px] items-center justify-center rounded-full border border-[rgba(76,183,130,0.35)] bg-[rgba(76,183,130,0.10)] shadow-[0_0_24px_rgba(76,183,130,0.15)]">
        <svg
          width="26"
          height="26"
          viewBox="0 0 16 16"
          fill="none"
          stroke="#4cb782"
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
      <h2 className="text-[23px] font-bold tracking-[-0.02em] text-fg-hi">
        Recebemos seu cadastro!
      </h2>
      <p className="max-w-[420px] text-[15px] leading-[1.55] text-fg-4">
        Vamos te chamar no WhatsApp em até 1 dia útil para combinar o melhor
        horário da conversa de 20 minutos.
      </p>
      <a
        href={whatsappUrl(serventia)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 flex h-[50px] w-full max-w-[420px] items-center justify-center gap-2.5 rounded-field border border-[rgba(76,183,130,0.45)] text-[15px] font-semibold text-[#58c48f] no-underline transition-colors hover:bg-[rgba(76,183,130,0.08)] hover:text-[#6fd4a2]"
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path
            d="M14 10a2 2 0 0 1-2 2H6.5L3 14.8V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Chamar agora no WhatsApp
      </a>
      <span className="text-[12.5px] text-fg-8">
        Se preferir: contato@atrioss.com
      </span>
    </div>
  );
}
