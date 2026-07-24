// Catálogo estático e helpers puros do Financeiro (telas 20–23 do mockup
// "Átrios Financeiro"). Sem tabela de categoria: são cinco, fixas e sem CRUD —
// o mesmo tratamento que ACCESS_TIPOS recebe no cofre.

import type { CategoriaId, LancamentoTipo } from "@/db/schema";

export type { CategoriaId, LancamentoTipo };

export interface Categoria {
  id: CategoriaId;
  nome: string;
  cor: string;
}

export const CATEGORIAS: Record<CategoriaId, Categoria> = {
  receita_cliente: {
    id: "receita_cliente",
    nome: "Receita de cliente",
    cor: "#4cb782",
  },
  infra: { id: "infra", nome: "Infra", cor: "#e2b13c" },
  servicos: { id: "servicos", nome: "Serviços", cor: "#5e9eff" },
  impostos: { id: "impostos", nome: "Impostos", cor: "#bb9af7" },
  pessoal: { id: "pessoal", nome: "Pessoal", cor: "#8b95a5" },
};

export const CATEGORIA_IDS = Object.keys(CATEGORIAS) as CategoriaId[];

export const isCategoriaId = (v: string): v is CategoriaId => v in CATEGORIAS;

/**
 * Saldo que o caixa já tinha antes do primeiro lançamento registrado aqui.
 * ponytail: constante e não tabela — o spec não tem tela para editá-la; vira
 * `configuracao` no banco quando alguém precisar mudar sem deploy.
 */
export const SALDO_INICIAL_CENTAVOS = 0;

export const COR_RECEITA = "#4cb782";
export const COR_DESPESA = "#e06c6c";

export const corDoTipo = (tipo: LancamentoTipo) =>
  tipo === "receita" ? COR_RECEITA : COR_DESPESA;

/** Centavos com sinal: receita positiva, despesa negativa. */
export const comSinal = (tipo: LancamentoTipo, valorCentavos: number) =>
  tipo === "receita" ? valorCentavos : -valorCentavos;

/* ---- Dinheiro ----------------------------------------------------------- */

export interface MoneyPrefs {
  /** Troca todo montante por "R$ ••••" (tela compartilhada). */
  ocultarValores: boolean;
  /** `false` arredonda para reais inteiros: R$ 4.320. */
  mostrarCentavos: boolean;
}

export const MONEY_PREFS_PADRAO: MoneyPrefs = {
  ocultarValores: false,
  mostrarCentavos: true,
};

export const VALOR_OCULTO = "R$ ••••";

/** "R$ 18.500,00" — sempre o módulo; o sinal é responsabilidade do chamador. */
export function formatMoney(
  centavos: number,
  { ocultarValores, mostrarCentavos }: MoneyPrefs = MONEY_PREFS_PADRAO,
): string {
  if (ocultarValores) return VALOR_OCULTO;
  const casas = mostrarCentavos ? 2 : 0;
  return `R$ ${(Math.abs(centavos) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}`;
}

/** Idem, prefixado por − ou + (usa o menos tipográfico, como no mockup). */
export function formatMoneyComSinal(
  centavos: number,
  prefs: MoneyPrefs = MONEY_PREFS_PADRAO,
): string {
  if (prefs.ocultarValores) return VALOR_OCULTO;
  return (centavos < 0 ? "−" : "+") + formatMoney(centavos, prefs);
}

/**
 * "4.320,00" / "4320" / "R$ 1.234" → centavos. Só os dígitos importam: o campo
 * é mascarado enquanto se digita, então a última "vírgula" é sempre posicional.
 */
export function parseValorCentavos(texto: string): number | null {
  const digitos = texto.replace(/\D/g, "");
  if (!digitos) return null;
  const centavos = Number(digitos);
  return Number.isSafeInteger(centavos) ? centavos : null;
}

/** Máscara pt-BR do campo Valor: digita-se em centavos, da direita para a esquerda. */
export function maskValor(texto: string): string {
  const centavos = parseValorCentavos(texto);
  if (centavos === null) return "";
  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ---- Meses e datas (tudo em data civil "YYYY-MM-DD", sem fuso) ---------- */

const MESES_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const MESES_CURTOS_PT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/** Mês no formato da URL: "2026-07". */
export type Mes = string;

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const isMes = (v: string): v is Mes => MES_RE.test(v);

/** Mês civil de hoje no fuso do servidor/navegador. */
export function mesAtual(hoje: Date = new Date()): Mes {
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

/** Data civil de hoje ("YYYY-MM-DD"), para o default do campo Data. */
export function hojeISO(hoje: Date = new Date()): string {
  return `${mesAtual(hoje)}-${String(hoje.getDate()).padStart(2, "0")}`;
}

export const mesDeData = (dataISO: string): Mes => dataISO.slice(0, 7);

/** Desloca o mês em `n` meses (aceita negativo). */
export function shiftMes(mes: Mes, n: number): Mes {
  const [ano, m] = mes.split("-").map(Number);
  const total = ano * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Primeiro dia do mês e primeiro dia do mês seguinte — intervalo [ , ) da query. */
export function intervaloDoMes(mes: Mes): { inicio: string; fim: string } {
  return { inicio: `${mes}-01`, fim: `${shiftMes(mes, 1)}-01` };
}

/** "Julho 2026" — rótulo do seletor de mês. */
export function labelMes(mes: Mes): string {
  const [ano, m] = mes.split("-").map(Number);
  const nome = MESES_PT[m - 1];
  return `${nome[0].toUpperCase()}${nome.slice(1)} ${ano}`;
}

/** "julho" — usado no título do estado vazio. */
export const nomeDoMes = (mes: Mes): string =>
  MESES_PT[Number(mes.split("-")[1]) - 1];

/** "11 jul" — header do grupo do dia. */
export function labelDia(dataISO: string): string {
  const [, m, d] = dataISO.split("-");
  return `${d} ${MESES_CURTOS_PT[Number(m) - 1]}`;
}

/** "11 jul 2026" — detalhe do lançamento. */
export function labelDataCompleta(dataISO: string): string {
  const [ano] = dataISO.split("-");
  return `${labelDia(dataISO)} ${ano}`;
}
