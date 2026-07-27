import { describe, expect, it } from "vitest";
import type { RespostaValor } from "@/db/schema";
import {
  baseArrecadacao,
  calcularPrazos,
  calcularScores,
  classePorArrecadacao,
  dispensadoParaClasse,
  etapasDoEscopo,
  ordenarGaps,
  PRORROGACAO_MAX_DIAS,
  parametrosParaClasse,
  statusPorScore,
  subclassePorReceita,
  tetosDaNorma,
} from "./motor";

// Requisitos das Etapas 1 e 2 aplicáveis à classe 2 (mesmos pesos do seed —
// nas Etapas 1-2 todos os requisitos valem para as três classes).
const PESOS_ETAPA_1 = [2, 2, 1, 3, 3, 3, 3, 2, 2, 1]; // Σ 22
const PESOS_ETAPA_2 = [2, 1, 2, 2, 3, 1, 2, 1, 2, 1]; // Σ 17

const requisitos = [
  ...PESOS_ETAPA_1.map((peso, i) => ({
    id: `e1-${i}`,
    etapa: 1,
    peso,
    ordem: i + 1,
  })),
  ...PESOS_ETAPA_2.map((peso, i) => ({
    id: `e2-${i}`,
    etapa: 2,
    peso,
    ordem: 11 + i,
  })),
];

describe("calcularScores", () => {
  it("classe 2, mix de respostas — score por etapa e geral como no protótipo", () => {
    const respostas = new Map<string, RespostaValor>([
      // Etapa 1: 2 + 1 + 0 + 3 + 1.5 + 0 + 3 + 2 + 1 + 0 = 13.5 → 61%
      ["e1-0", "sim"],
      ["e1-1", "parcial"],
      ["e1-2", "nao"],
      ["e1-3", "sim"],
      ["e1-4", "parcial"],
      ["e1-5", "nao_sei"],
      ["e1-6", "sim"],
      ["e1-7", "sim"],
      ["e1-8", "parcial"],
      ["e1-9", "nao"],
      // Etapa 2: 2 + 1 + 1 + 0 + 3 + 1 + 0 + 0.5 + 2 + 0 = 10.5 → 62%
      ["e2-0", "sim"],
      ["e2-1", "sim"],
      ["e2-2", "parcial"],
      ["e2-3", "nao"],
      ["e2-4", "sim"],
      ["e2-5", "sim"],
      ["e2-6", "nao_sei"],
      ["e2-7", "parcial"],
      ["e2-8", "sim"],
      ["e2-9", "nao"],
    ]);
    const { porEtapa, geral } = calcularScores(
      requisitos,
      respostas,
      etapasDoEscopo("inicial"),
    );
    expect(porEtapa[1]).toBe(61); // round(100 · 13.5/22)
    expect(porEtapa[2]).toBe(62); // round(100 · 10.5/17)
    expect(geral).toBe(62); // round((61+62)/2)
  });

  it("requisito aplicável sem resposta pontua como 'não'", () => {
    const respostas = new Map<string, RespostaValor>(
      requisitos.filter((r) => r.etapa === 1).map((r) => [r.id, "sim"]),
    );
    respostas.delete("e1-3"); // peso 3 sem resposta → 0 pontos
    const { porEtapa } = calcularScores(requisitos, respostas, [1]);
    expect(porEtapa[1]).toBe(Math.round((100 * (22 - 3)) / 22)); // 86
  });

  it("status por faixa: ≥80 adequado, 40–79 atenção, <40 crítico", () => {
    expect(statusPorScore(80)).toBe("adequado");
    expect(statusPorScore(79)).toBe("atencao");
    expect(statusPorScore(40)).toBe("atencao");
    expect(statusPorScore(39)).toBe("critico");
  });

  it("gaps ordenados por peso desc, depois etapa", () => {
    const respostas = new Map<string, RespostaValor>([
      ["e1-0", "parcial"], // peso 2, etapa 1
      ["e2-4", "nao"], // peso 3, etapa 2
      ["e1-3", "nao_sei"], // peso 3, etapa 1
      ["e1-2", "sim"], // não é gap
    ]);
    const gaps = ordenarGaps(
      requisitos.filter((r) => respostas.has(r.id)),
      respostas,
    );
    expect(gaps.map((g) => g.id)).toEqual(["e1-3", "e2-4", "e1-0"]);
  });
});

describe("calcularPrazos", () => {
  const vigencia = new Date("2026-02-20T12:00:00");
  const base = { vigencia, prazoArt20Dias: 150, prazoArt23Meses: 30 };

  it("classe 2 sem prorrogação estadual", () => {
    const hoje = new Date("2026-07-10T12:00:00");
    const p = calcularPrazos({ ...base, prorrogacaoDias: 0 }, hoje);
    expect(p.limiteInicial.toISOString().slice(0, 10)).toBe("2026-07-20");
    expect(p.diasRestantesInicial).toBe(10);
    expect(p.limiteTotal.toISOString().slice(0, 10)).toBe("2028-08-20");
  });

  it("classe 2 com prorrogação de 90 dias (RN)", () => {
    const hoje = new Date("2026-07-10T12:00:00");
    const p = calcularPrazos({ ...base, prorrogacaoDias: 90 }, hoje);
    expect(p.limiteInicial.toISOString().slice(0, 10)).toBe("2026-10-18");
    expect(p.diasRestantesInicial).toBe(100);
  });

  it("prazo vencido retorna dias negativos", () => {
    const hoje = new Date("2026-08-01T12:00:00");
    const p = calcularPrazos({ ...base, prorrogacaoDias: 0 }, hoje);
    expect(p.diasRestantesInicial).toBe(-12);
  });
});

describe("parametrosParaClasse", () => {
  const rows = [
    { chave: "vigencia", valor: "2026-02-20", uf: null, descricao: null },
    {
      chave: "prazo_art20_dias_classe_2",
      valor: "150",
      uf: null,
      descricao: null,
    },
    {
      chave: "prazo_art23_meses_classe_2",
      valor: "30",
      uf: null,
      descricao: null,
    },
    {
      chave: "prorrogacao_art20_dias",
      valor: "90",
      uf: "RN",
      descricao: "Decisão CGJ-RN de 02/07/2026",
    },
  ];

  it("aplica prorrogação apenas para a UF que a possui", () => {
    const rn = parametrosParaClasse(rows, 2, "RN");
    expect(rn.prorrogacaoDias).toBe(90);
    expect(rn.prorrogacaoDescricao).toContain("CGJ-RN");
    const sp = parametrosParaClasse(rows, 2, "SP");
    expect(sp.prorrogacaoDias).toBe(0);
    expect(sp.prorrogacaoDescricao).toBeNull();
  });

  it("falha explícita quando o seed não rodou", () => {
    expect(() => parametrosParaClasse(rows, 3, "SP")).toThrow(/classe 3/);
  });

  it("aceita prorrogação no teto legal de 180 dias (art. 21, §3º)", () => {
    expect(PRORROGACAO_MAX_DIAS).toBe(180);
    const noTeto = rows.map((r) =>
      r.chave === "prorrogacao_art20_dias"
        ? { ...r, valor: String(PRORROGACAO_MAX_DIAS) }
        : r,
    );
    expect(parametrosParaClasse(noTeto, 2, "RN").prorrogacaoDias).toBe(180);
  });

  it("rejeita prorrogação acima do teto legal do art. 21 (> 180 dias)", () => {
    // valor juridicamente impossível — o somatório do art. 21, §3º (redação
    // do Prov. 243) é de "até 180 dias".
    const acimaDoTeto = rows.map((r) =>
      r.chave === "prorrogacao_art20_dias" ? { ...r, valor: "181" } : r,
    );
    expect(() => parametrosParaClasse(acimaDoTeto, 2, "RN")).toThrow(
      /art\. 21/,
    );
  });
});

describe("classePorArrecadacao (tetos 300k / 1,5M — art. 16, red. Prov. 243)", () => {
  it("classifica nos limites exatos dos tetos", () => {
    expect(classePorArrecadacao(300_000, 300_000, 1_500_000)).toBe(1);
    expect(classePorArrecadacao(300_000.01, 300_000, 1_500_000)).toBe(2);
    expect(classePorArrecadacao(1_500_000, 300_000, 1_500_000)).toBe(2);
    expect(classePorArrecadacao(1_500_000.01, 300_000, 1_500_000)).toBe(3);
  });

  it("valores típicos", () => {
    expect(classePorArrecadacao(0, 300_000, 1_500_000)).toBe(1);
    expect(classePorArrecadacao(376_172.77, 300_000, 1_500_000)).toBe(2);
    expect(classePorArrecadacao(9_000_000, 300_000, 1_500_000)).toBe(3);
  });
});

describe("subclassePorReceita (art. 16, A a J)", () => {
  const sub = (base: number) => subclassePorReceita(base, 300_000, 1_500_000);

  it("Classe 1 em terços do teto (A/B/C)", () => {
    expect(sub(0)).toBe("A");
    expect(sub(100_000)).toBe("A");
    expect(sub(100_000.01)).toBe("B");
    expect(sub(200_000)).toBe("B");
    expect(sub(200_000.01)).toBe("C");
    expect(sub(300_000)).toBe("C");
  });

  it("Classe 2 em terços do teto da classe (D/E/F)", () => {
    expect(sub(300_000.01)).toBe("D");
    expect(sub(500_000)).toBe("D");
    expect(sub(1_000_000)).toBe("E");
    expect(sub(1_500_000)).toBe("F");
  });

  it("Classe 3 em múltiplos do teto da Classe 2 (G/H/I/J)", () => {
    expect(sub(1_500_000.01)).toBe("G");
    expect(sub(4_500_000)).toBe("G");
    expect(sub(4_500_000.01)).toBe("H");
    expect(sub(9_000_000)).toBe("H");
    expect(sub(18_000_000)).toBe("I");
    expect(sub(18_000_000.01)).toBe("J");
  });
});

describe("dispensadoParaClasse (ex.: DPO na Classe 1 — Prov. 214)", () => {
  const condicoes = { dispensaClasses: [1], dispensaNota: "dispensado" };

  it("dispensa apenas as classes listadas", () => {
    expect(dispensadoParaClasse(condicoes, 1)).toBe(true);
    expect(dispensadoParaClasse(condicoes, 2)).toBe(false);
    expect(dispensadoParaClasse(condicoes, 3)).toBe(false);
  });

  it("sem condições ou sem dispensa, nunca dispensa", () => {
    expect(dispensadoParaClasse(null, 1)).toBe(false);
    expect(dispensadoParaClasse({ nota: "x" }, 1)).toBe(false);
  });
});

describe("baseArrecadacao (fallback do semestre zerado)", () => {
  it("usa o semestre atual quando ele tem arrecadação", () => {
    expect(baseArrecadacao(376_172.77, 169_932.35)).toBe(376_172.77);
  });

  it("cai no anterior quando o atual veio zerado", () => {
    expect(baseArrecadacao(0, 169_932.35)).toBe(169_932.35);
  });

  it("um semestre atual zerado que classificaria como C1 usa o anterior (C2)", () => {
    // atual=0 → base=400k → C2, não C1
    expect(
      classePorArrecadacao(baseArrecadacao(0, 400_000), 300_000, 1_500_000),
    ).toBe(2);
  });
});

describe("tetosDaNorma", () => {
  const rows = [
    { chave: "teto_classe_1", valor: "300000", uf: null, descricao: null },
    { chave: "teto_classe_2", valor: "1500000", uf: null, descricao: null },
  ];

  it("lê os tetos nacionais de parametro_norma", () => {
    expect(tetosDaNorma(rows)).toEqual({
      tetoClasse1: 300_000,
      tetoClasse2: 1_500_000,
    });
  });

  it("falha explícita quando o seed não rodou", () => {
    expect(() => tetosDaNorma([])).toThrow(/Tetos de classe ausentes/);
  });
});
