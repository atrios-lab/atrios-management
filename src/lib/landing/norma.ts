// Leitura dos dados da norma para as páginas públicas (`/` e `/diagnostico`).
//
// Fonte ÚNICA: a tabela `parametro_norma`, via `motor` — a mesma que o módulo
// de diagnóstico e os relatórios usam. Nada de vigência, prazo ou prorrogação
// hardcoded aqui: já houve bug em produção por a data existir em dois lugares
// (a landing chegou a exibir "93 dias" quando a CGJ-RN concedeu 90). Alterar a
// norma é um UPDATE numa linha do banco e as duas páginas mudam juntas.

import {
  calcularPrazos,
  type ParametroRow,
  parametrosParaClasse,
  tetosDaNorma,
} from "@/lib/diagnostico/motor";

/** UF atendida pelas páginas públicas — define qual prorrogação do art. 21 vale. */
export const UF = "RN";

/** Ordem de exibição: a classe com menos prazo primeiro. */
export const CLASSES = [3, 2, 1] as const;

export interface ClasseNorma {
  classe: number;
  /** art. 20 — dias para as Etapas 1 e 2, contados da vigência. */
  prazoArt20Dias: number;
  /** art. 23 — meses para as 5 etapas, contados da vigência. */
  prazoArt23Meses: number;
  /** Dias restantes até o limite do art. 20 (já com a prorrogação). Nunca negativo. */
  diasRestantes: number;
  /** dd/mm/aaaa — limite do art. 20 já com a prorrogação estadual. */
  dataLimite: string;
  /** dd/mm/aaaa — limite do art. 23 (todas as etapas). */
  dataLimiteTotal: string;
}

export interface Norma {
  /** dd/mm/aaaa — vigência do Prov. 243 (base de contagem dos arts. 20 e 23). */
  vigencia: string;
  porClasse: Record<number, ClasseNorma>;
  /** Dias da prorrogação estadual do art. 21 (0 quando a UF não tem). */
  prorrogacaoDias: number;
  /** Descrição da decisão que concedeu a prorrogação (processo, data, órgão). */
  prorrogacaoDescricao: string | null;
  /** dd/mm/aaaa da decisão que concedeu a prorrogação estadual. */
  prorrogacaoData: string | null;
  /** Processo administrativo da decisão (ex.: "PP 0000897-..."). */
  prorrogacaoProcesso: string | null;
  /** art. 16, I (red. Prov. 243) — teto de receita bruta semestral da Classe 1, em reais. */
  tetoClasse1: number;
  /** art. 16, II (red. Prov. 243) — teto de receita bruta semestral da Classe 2, em reais. */
  tetoClasse2: number;
}

const fmtData = (d: Date) => d.toLocaleDateString("pt-BR");

/**
 * Monta os dados de exibição da norma a partir das linhas de `parametro_norma`.
 * Puro (recebe `hoje`) — é aqui que os testes travam a regra de que toda data
 * exibida deriva do banco.
 */
export function montarNorma(rows: ParametroRow[], hoje: Date): Norma {
  const porClasse: Record<number, ClasseNorma> = {};
  let prorrogacaoDias = 0;
  let prorrogacaoDescricao: string | null = null;
  let prorrogacaoData: string | null = null;
  let prorrogacaoProcesso: string | null = null;
  let vigencia = "";

  for (const classe of CLASSES) {
    const params = parametrosParaClasse(rows, classe, UF);
    const prazos = calcularPrazos(params, hoje);
    porClasse[classe] = {
      classe,
      prazoArt20Dias: params.prazoArt20Dias,
      prazoArt23Meses: params.prazoArt23Meses,
      // Piso em 0: "-12 dias" não é contagem regressiva, é prazo vencido — e a
      // UI não promete nada sobre prazo vencido.
      diasRestantes: Math.max(0, prazos.diasRestantesInicial),
      dataLimite: fmtData(prazos.limiteInicial),
      dataLimiteTotal: fmtData(prazos.limiteTotal),
    };
    prorrogacaoDias = params.prorrogacaoDias;
    prorrogacaoDescricao = params.prorrogacaoDescricao;
    prorrogacaoData = params.prorrogacaoData;
    prorrogacaoProcesso = params.prorrogacaoProcesso;
    vigencia = fmtData(params.vigencia);
  }

  return {
    vigencia,
    porClasse,
    prorrogacaoDias,
    prorrogacaoDescricao,
    prorrogacaoData,
    prorrogacaoProcesso,
    ...tetosDaNorma(rows),
  };
}
