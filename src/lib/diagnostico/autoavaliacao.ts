// Autoavaliação pública: regras puras do link enviado à serventia (sem banco,
// sem next/*). Estado do link, validações do que a serventia preenche,
// pendências para o envio e o payload MÍNIMO que a página pública recebe.
// Actions em src/app/autoavaliacao/[token]/actions.ts e
// src/app/diagnosticos/actions.ts só ligam isto ao banco.

import type {
  DiagnosticoEscopo,
  DiagnosticoModelo,
  IdentidadeItem,
  RequisitoCondicoes,
  RespostaValor,
} from "@/db/schema";
import { POLITICA_VERSAO } from "../legal";
import { MODELO_LABEL, SUBCLASSES } from "./constants";
import { dispensadoParaClasse } from "./motor";
import {
  CARGOS,
  emailValido,
  formatarWhatsapp,
  telefoneValido,
} from "./pre-cadastro";

/* ---- Token e validade ---------------------------------------------------- */

export const LINK_VALIDADE_DIAS = 30;

/** 32 bytes aleatórios em base64url (~43 chars): 256 bits, não se enumera. */
export function gerarToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

export function expiracaoPadrao(agora: Date): Date {
  return new Date(agora.getTime() + LINK_VALIDADE_DIAS * 24 * 60 * 60 * 1000);
}

/* ---- Estado do link (derivado, nunca coluna) ----------------------------- */

export type EstadoLink =
  | "nao_gerado"
  | "nao_iniciado"
  | "aberto"
  | "enviado"
  | "expirado"
  | "revogado";

export interface LinkRow {
  expiraEm: Date;
  revogadoEm: Date | null;
  iniciadoEm: Date | null;
  enviadoEm: Date | null;
}

/** Prioridade: revogado > enviado > expirado > aberto > não iniciado. */
export function estadoLink(
  row: LinkRow | null | undefined,
  agora: Date,
): EstadoLink {
  if (!row) return "nao_gerado";
  if (row.revogadoEm) return "revogado";
  if (row.enviadoEm) return "enviado";
  if (agora.getTime() > row.expiraEm.getTime()) return "expirado";
  if (row.iniciadoEm) return "aberto";
  return "nao_iniciado";
}

export const ESTADO_LINK_LABEL: Record<EstadoLink, string> = {
  nao_gerado: "Não gerado",
  nao_iniciado: "Não iniciado",
  aberto: "Aberto",
  enviado: "Enviado",
  expirado: "Expirado",
  revogado: "Revogado",
};

/** A página pública abre (mesmo que só para leitura, no caso de "enviado"). */
export function linkAcessivel(estado: EstadoLink): boolean {
  return (
    estado === "nao_iniciado" || estado === "aberto" || estado === "enviado"
  );
}

/** A serventia ainda pode gravar por este link. */
export function linkEditavel(estado: EstadoLink): boolean {
  return estado === "nao_iniciado" || estado === "aberto";
}

/* ---- Identificação de quem responde --------------------------------------- */

export interface RespondenteInput {
  nome: string;
  cargo?: string;
  email?: string;
  whatsapp?: string;
  consentimento?: boolean;
}

export interface RespondenteNormalizado {
  nome: string;
  cargo: string | null;
  email: string | null;
  whatsapp: string | null;
  politicaVersao: string;
}

export type RespondenteCampo = "nome" | "email" | "whatsapp" | "consentimento";
export type ErrosRespondente = Partial<Record<RespondenteCampo, string>>;

const OBRIGATORIO = "Campo obrigatório.";
const CONTATO_FALTANDO = "Informe um e-mail ou WhatsApp para contato.";
const CONSENTIMENTO_FALTANDO =
  "É preciso aceitar a Política de Privacidade para continuar.";

/** Nome + (e-mail OU WhatsApp) + aceite. Cargo opcional, só do catálogo. */
export function validarRespondente(input: RespondenteInput): {
  data: RespondenteNormalizado | null;
  errors: ErrosRespondente;
} {
  const errors: ErrosRespondente = {};
  const nome = input.nome?.trim() ?? "";
  if (!nome) errors.nome = OBRIGATORIO;

  const emailRaw = input.email?.trim() ?? "";
  const whatsappRaw = input.whatsapp?.trim() ?? "";
  if (!emailRaw && !whatsappRaw) {
    errors.email = CONTATO_FALTANDO;
    errors.whatsapp = CONTATO_FALTANDO;
  } else {
    if (emailRaw && !emailValido(emailRaw))
      errors.email = "Informe um e-mail válido.";
    if (whatsappRaw && !telefoneValido(whatsappRaw))
      errors.whatsapp = "Informe um número com DDD, ex.: (84) 9 0000-0000.";
  }

  if (input.consentimento !== true)
    errors.consentimento = CONSENTIMENTO_FALTANDO;

  if (Object.keys(errors).length > 0) return { data: null, errors };

  const cargo = input.cargo?.trim();
  return {
    data: {
      nome,
      cargo: cargo && CARGOS.includes(cargo as never) ? cargo : null,
      email: emailRaw ? emailRaw.toLowerCase() : null,
      whatsapp: whatsappRaw ? formatarWhatsapp(whatsappRaw) : null,
      politicaVersao: POLITICA_VERSAO,
    },
    errors: {},
  };
}

/* ---- Enquadramento declarado pela serventia ------------------------------ */

export interface EnquadramentoInput {
  classe: number;
  subclasse?: string | null;
  modelo: string;
}

export interface EnquadramentoNormalizado {
  classe: number;
  subclasse: string | null;
  modelo: DiagnosticoModelo;
}

export function validarEnquadramento(input: EnquadramentoInput): {
  data: EnquadramentoNormalizado | null;
  error: string | null;
} {
  if (![1, 2, 3].includes(input.classe))
    return { data: null, error: "Escolha a faixa de receita do cartório." };
  const subclasse = input.subclasse?.trim().toUpperCase() || null;
  if (subclasse && !SUBCLASSES[input.classe].includes(subclasse))
    return { data: null, error: "Subclasse inválida para a faixa escolhida." };
  if (!(input.modelo in MODELO_LABEL))
    return {
      data: null,
      error: "Escolha como funciona o sistema do cartório.",
    };
  return {
    data: {
      classe: input.classe,
      subclasse,
      modelo: input.modelo as DiagnosticoModelo,
    },
    error: null,
  };
}

/* ---- Pendências para o envio --------------------------------------------- */

export interface Faltantes {
  requisitos: string[];
  identidade: IdentidadeItem[];
  total: number;
}

export function faltantesParaEnvio(
  aplicaveisIds: readonly string[],
  respondidos: ReadonlySet<string>,
  identidadeItens: readonly IdentidadeItem[],
  identidadeRespondidos: ReadonlySet<IdentidadeItem>,
): Faltantes {
  const requisitos = aplicaveisIds.filter((id) => !respondidos.has(id));
  const identidade = identidadeItens.filter(
    (i) => !identidadeRespondidos.has(i),
  );
  return {
    requisitos,
    identidade,
    total: requisitos.length + identidade.length,
  };
}

export function mensagemFaltantes(total: number): string {
  return total === 1
    ? "Falta 1 pergunta. Se não souber, marque “Não sei”."
    : `Faltam ${total} perguntas. Se não souber, marque “Não sei”.`;
}

/* ---- Payload público: o MÍNIMO ------------------------------------------- */

/** O que a página pública recebe de cada requisito. Nada além disto. */
export interface RequisitoPublico {
  id: string;
  etapa: number;
  perguntaSimples: string;
}

export interface IdentidadePublica {
  item: IdentidadeItem;
  perguntaSimples: string;
}

export interface DiagnosticoPublico {
  serventia: string;
  municipio: string | null;
  uf: string;
  classe: number | null;
  subclasse: string | null;
  modeloSolucao: DiagnosticoModelo;
  escopo: DiagnosticoEscopo;
}

export interface PayloadPublico {
  diagnostico: DiagnosticoPublico;
  requisitos: RequisitoPublico[];
  identidade: IdentidadePublica[];
}

interface RequisitoFonte {
  id: string;
  etapa: number;
  perguntaSimples: string;
  condicoes?: RequisitoCondicoes | null;
}

/**
 * Projeta explicitamente campo a campo (nunca spread) — perguntaTecnica,
 * refNormativa, peso, apontamentos, roteiro e contatos do diagnóstico JAMAIS
 * chegam ao cliente. Dispensados para a classe não são perguntados.
 * Teste em autoavaliacao.test.ts protege isto.
 */
export function montarPayloadPublico(
  diag: DiagnosticoPublico & Record<string, unknown>,
  requisitos: readonly RequisitoFonte[],
  identidade: readonly { item: IdentidadeItem; perguntaSimples: string }[],
): PayloadPublico {
  const classe = diag.classe;
  const aplicaveis =
    classe == null
      ? []
      : requisitos.filter((r) => !dispensadoParaClasse(r.condicoes, classe));
  return {
    diagnostico: {
      serventia: diag.serventia,
      municipio: diag.municipio ?? null,
      uf: diag.uf,
      classe: diag.classe ?? null,
      subclasse: diag.subclasse ?? null,
      modeloSolucao: diag.modeloSolucao,
      escopo: diag.escopo,
    },
    requisitos: aplicaveis.map((r) => ({
      id: r.id,
      etapa: r.etapa,
      perguntaSimples: r.perguntaSimples,
    })),
    identidade: identidade.map((q) => ({
      item: q.item,
      perguntaSimples: q.perguntaSimples,
    })),
  };
}

/* ---- Textos do formulário público ---------------------------------------- */

export const LEGENDA_OPCOES: {
  value: RespostaValor;
  label: string;
  ajuda: string;
}[] = [
  { value: "sim", label: "Sim", ajuda: "já existe e está em uso." },
  {
    value: "parcial",
    label: "Parcial",
    ajuda: "existe, mas incompleto, desatualizado ou só em parte do cartório.",
  },
  { value: "nao", label: "Não", ajuda: "não existe." },
  {
    value: "nao_sei",
    label: "Não sei",
    ajuda: "sem problema, a Átrios confirma com você.",
  },
];

/** Texto pronto para o WhatsApp do contato da serventia. */
export function mensagemWhatsappLink(serventia: string, url: string): string {
  return `Olá! Aqui é da Átrios. Segue o link da autoavaliação do Provimento CNJ 213/2026 para ${serventia}. São perguntas simples sobre a rotina do cartório, leva uns 15 minutos e você pode parar e voltar depois pelo mesmo link: ${url}`;
}
