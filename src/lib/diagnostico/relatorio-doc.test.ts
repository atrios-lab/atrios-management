// Regra editorial dos dois relatórios — é o teste que protege o produto:
// o PDF do cliente nunca ensina a fazer, nunca vaza o roteiro interno e
// nunca entrega o método (as perguntas da entrevista).

import { describe, expect, it } from "vitest";
import { montarRequisitosSeed, PARAMETROS, REQS } from "@/db/provimento-data";
import type { RespostaValor } from "@/db/schema";
import {
  calcularPrazos,
  calcularScores,
  ordenarGaps,
  type ParametroRow,
  parametrosParaClasse,
} from "./motor";
import {
  type DadosRelatorio,
  MARCA_DAGUA_INTERNO,
  montarDocCliente,
  montarDocInterno,
  nomeArquivoCliente,
  nomeArquivoInterno,
  todasAsStrings,
} from "./relatorio-doc";

/* ---- Fixture: diagnóstico de teste com respostas mistas ------------------- */

const HOJE = new Date("2026-07-17T12:00:00");
const seedRows = montarRequisitosSeed();
const parametroRows: ParametroRow[] = PARAMETROS.map((p) => ({
  chave: p.chave,
  valor: p.valor,
  uf: p.uf ?? null,
  descricao: p.descricao ?? null,
}));

function montarDados(classe: number): DadosRelatorio {
  const etapas = [1, 2, 3, 4, 5];
  const aplicaveis = seedRows.filter((r) => r.classes.includes(classe));
  // Mistura determinística: garante nao/parcial/nao_sei/sim no mesmo relatório.
  const ciclo: RespostaValor[] = ["nao", "parcial", "nao_sei", "sim"];
  const respostas = new Map<string, RespostaValor>(
    aplicaveis.map((r, i) => [r.id, ciclo[i % ciclo.length]]),
  );
  const { porEtapa, geral } = calcularScores(aplicaveis, respostas, etapas);
  const gaps = ordenarGaps(aplicaveis, respostas).map((r) => ({
    ...r,
    valor: respostas.get(r.id) ?? ("nao" as RespostaValor),
  }));
  const parametros = parametrosParaClasse(parametroRows, classe, "RN");
  return {
    diagnostico: {
      serventia: "2º Ofício de Notas de Mossoró",
      municipio: "Mossoró",
      uf: "RN",
      cns: "000001",
      classe,
      subclasse: classe === 3 ? "G" : null,
      modeloSolucao: "saas",
      escopo: "completo",
      contatoNome: "Titular de Teste",
      contatoEmail: "titular@teste.dev",
      contatoWhatsapp: null,
      criadoPor: { name: "Equipe Átrios" },
    },
    etapas,
    porEtapa,
    geral,
    gaps,
    prazos: calcularPrazos(parametros, HOJE),
    parametros,
    identidadeOps: [
      { item: "site", valor: "nao" },
      { item: "email", valor: "parcial" },
    ],
  };
}

const dados = montarDados(3);
const docCliente = montarDocCliente(dados, HOJE);
const docInterno = montarDocInterno(dados, HOJE, "Equipe Átrios");
const stringsCliente = todasAsStrings(docCliente);
const stringsInterno = todasAsStrings(docInterno);

const RECEITA = [
  "recomenda-se",
  "instale",
  "configure",
  "habilite",
  "basta",
  "passo a passo",
];

/* ---- O teste que mais importa: o cliente não recebe o "como" -------------- */

describe("relatório do cliente", () => {
  it("não contém palavra de receita", () => {
    for (const s of stringsCliente) {
      const baixo = s.toLowerCase();
      for (const palavra of RECEITA) {
        expect(baixo, `receita "${palavra}" em: "${s}"`).not.toContain(palavra);
      }
    }
  });

  it("não contém nenhum trecho de roteiro_execucao", () => {
    const texto = stringsCliente.join("\n");
    for (const row of seedRows) {
      expect(texto).not.toContain(row.roteiroExecucao);
      const linhas = row.roteiroExecucao
        .split("\n")
        .map((l) => l.replace(/^\d+\.\s*/, "").trim())
        .filter((l) => l.length > 0);
      for (const linha of linhas) {
        expect(texto, `linha de roteiro vazou: "${linha}"`).not.toContain(
          linha,
        );
      }
    }
  });

  it("não contém nenhuma pergunta do diagnóstico", () => {
    const texto = stringsCliente.join("\n");
    for (const [, , simples, tecnica] of REQS) {
      expect(texto).not.toContain(simples);
      expect(texto).not.toContain(tecnica);
    }
  });

  it("não contém material interno (roteiro, esforço, CAPEX, ofertas)", () => {
    const marcadores = [
      "Roteiro de execução",
      "CAPEX",
      "Esforço:",
      "PENDENTE DE REVISÃO",
      "OFERTA",
      "Argumento na call",
      "template",
      MARCA_DAGUA_INTERNO,
    ];
    for (const s of stringsCliente) {
      for (const m of marcadores) {
        expect(s.toLowerCase(), `marcador interno "${m}"`).not.toContain(
          m.toLowerCase(),
        );
      }
    }
  });

  it('trata "não sei" como pendência a confirmar, nunca conformidade', () => {
    expect(
      stringsCliente.some((s) => s.includes("não soube informar, a confirmar")),
    ).toBe(true);
  });

  it("todo apontamento tem as quatro partes", () => {
    const apontamentos = docCliente.oQueFalta.etapas.flatMap(
      (e) => e.apontamentos,
    );
    expect(apontamentos.length).toBeGreaterThan(0);
    for (const a of apontamentos) {
      expect(a.titulo.length).toBeGreaterThan(0);
      // exigência com dispositivo exato entre parênteses
      expect(a.exigencia).toMatch(/\((Anexo|art\.)/);
      expect(a.situacao).toMatch(/^Situação: /);
      expect(a.consequencia.length).toBeGreaterThan(0);
    }
  });
});

/* ---- Regras comuns aos dois documentos ------------------------------------ */

describe("regras dos dois documentos", () => {
  it("nenhum travessão ou meia-risca no texto visível", () => {
    for (const s of [...stringsCliente, ...stringsInterno]) {
      expect(s, `travessão em: "${s}"`).not.toMatch(/[—–]/);
    }
  });

  it("a ressalva do art. 16 §1º acompanha as menções a classe", () => {
    const ressalva = (ss: string[]) =>
      ss.filter((s) => s.includes("art. 16, §1º")).length;
    expect(docCliente.capa.ressalva).toContain("art. 16, §1º");
    expect(docInterno.capa.ressalva).toContain("art. 16, §1º");
    // capa e bloco de prazo, nos dois documentos
    expect(ressalva(stringsCliente)).toBeGreaterThanOrEqual(2);
    expect(ressalva(stringsInterno)).toBeGreaterThanOrEqual(2);
  });

  it("prazos do art. 20 + prorrogação RN batem com a classe", () => {
    // Vigência 2026-02-23, art. 20 = 210/150/90 dias, prorrogação RN = 90 dias.
    const esperado: Record<number, string> = {
      1: "2026-12-20",
      2: "2026-10-21",
      3: "2026-08-22",
    };
    for (const classe of [1, 2, 3]) {
      const p = parametrosParaClasse(parametroRows, classe, "RN");
      const { limiteInicial } = calcularPrazos(p, HOJE);
      const iso = `${limiteInicial.getFullYear()}-${String(limiteInicial.getMonth() + 1).padStart(2, "0")}-${String(limiteInicial.getDate()).padStart(2, "0")}`;
      expect(iso, `classe ${classe}`).toBe(esperado[classe]);
    }
  });
});

/* ---- Relatório interno ----------------------------------------------------- */

describe("relatório interno", () => {
  it("nome de arquivo começa com INTERNO- e o do cliente não", () => {
    expect(docInterno.arquivo.startsWith("INTERNO-")).toBe(true);
    expect(nomeArquivoInterno("2º Ofício").startsWith("INTERNO-")).toBe(true);
    expect(docCliente.arquivo).not.toContain("INTERNO");
    expect(nomeArquivoCliente("2º Ofício")).toBe(
      "diagnostico-provimento-213-2-oficio.pdf",
    );
  });

  it("declara a marca d'água de uso interno", () => {
    expect(docInterno.marcaDagua).toBe(
      "USO INTERNO ÁTRIOS. NÃO ENVIAR AO CLIENTE.",
    );
    expect(docInterno.aviso).toBe(MARCA_DAGUA_INTERNO);
  });

  it("contém o roteiro, a natureza, o artefato e o esforço de cada gap", () => {
    const apontamentos = docInterno.execucao.etapas.flatMap(
      (e) => e.apontamentos,
    );
    expect(apontamentos.length).toBe(dados.gaps.length);
    for (const a of apontamentos) {
      expect(a.roteiro.length).toBeGreaterThan(0);
      expect(a.natureza.length).toBeGreaterThan(0);
      expect(a.artefato.length).toBeGreaterThan(0);
      expect(a.esforco).toMatch(
        /Esforço: .+ de template \(uma vez\) \+ .+ por serventia\./,
      );
    }
    // esqueleto do seed ainda não revisado → marcado no documento
    expect(stringsInterno.some((s) => s.includes("PENDENTE DE REVISÃO"))).toBe(
      true,
    );
  });

  it("lista o CAPEX como repasse e a ordem respeita o Anexo IV", () => {
    expect(docInterno.capexLista.itens.length).toBeGreaterThan(0);
    expect(docInterno.capexLista.nota).toContain("repasse");
    const etapasDosPassos = docInterno.ordemExecucao.passos.map((p) => {
      const m = p.match(/\[Etapa (\d)\]/);
      if (!m) throw new Error(`passo sem etapa: ${p}`);
      return Number(m[1]);
    });
    const ordenado = [...etapasDosPassos].sort((a, b) => a - b);
    expect(etapasDosPassos).toEqual(ordenado);
  });

  it("traz totais de esforço por etapa e a subclasse como régua de preço", () => {
    expect(docInterno.totais.linhas.length).toBeGreaterThan(1);
    expect(docInterno.totais.linhas.at(-1)).toContain("Total:");
    expect(docInterno.capa.subclasse).toContain(
      "régua de dimensionamento e preço",
    );
  });
});

/* ---- Conteúdo seedado (os 48 textos) -------------------------------------- */

describe("conteúdo do seed", () => {
  it("cada um dos 48 requisitos tem apontamento e roteiro completos", () => {
    expect(seedRows.length).toBe(48);
    for (const r of seedRows) {
      expect(r.apontamentoTitulo.length, r.id).toBeGreaterThan(0);
      expect(r.apontamentoExigencia, r.id).toMatch(/\((Anexo|art\.)/);
      expect(r.apontamentoConsequencia.length, r.id).toBeGreaterThan(0);
      expect(r.roteiroExecucao.length, r.id).toBeGreaterThan(0);
      expect(r.artefato.length, r.id).toBeGreaterThan(0);
      expect(r.natureza.length, r.id).toBeGreaterThan(0);
      expect(r.exigeCapex).toBe(r.capexDescricao != null);
      // esqueleto entra pendente de revisão humana
      expect(r.revisado).toBe(false);
    }
  });

  it("os textos do cliente não têm receita nem travessão, em nenhum requisito", () => {
    for (const r of seedRows) {
      for (const campo of [
        r.apontamentoTitulo,
        r.apontamentoExigencia,
        r.apontamentoConsequencia,
      ]) {
        expect(campo).not.toMatch(/[—–]/);
        const baixo = campo.toLowerCase();
        for (const palavra of RECEITA) {
          expect(baixo, `receita "${palavra}" em ${r.id}`).not.toContain(
            palavra,
          );
        }
      }
      // o roteiro é interno, mas também é renderizado: sem travessão
      expect(r.roteiroExecucao).not.toMatch(/[—–]/);
      expect(r.artefato).not.toMatch(/[—–]/);
      if (r.capexDescricao) expect(r.capexDescricao).not.toMatch(/[—–]/);
    }
  });

  it("apontamento não reaproveita a pergunta da entrevista", () => {
    for (const r of seedRows) {
      expect(r.apontamentoTitulo).not.toBe(r.perguntaTecnica);
      expect(r.apontamentoTitulo).not.toBe(r.perguntaSimples);
      expect(r.apontamentoExigencia).not.toContain(r.perguntaTecnica);
      expect(r.apontamentoExigencia).not.toContain(r.perguntaSimples);
    }
  });
});

/* ---- Guarda-corpo --------------------------------------------------------- */

describe("guarda-corpo", () => {
  it("diagnóstico sem classe não gera documento", () => {
    const semClasse = {
      ...dados,
      diagnostico: { ...dados.diagnostico, classe: null },
    };
    expect(() => montarDocCliente(semClasse, HOJE)).toThrow();
    expect(() => montarDocInterno(semClasse, HOJE)).toThrow();
  });
});
