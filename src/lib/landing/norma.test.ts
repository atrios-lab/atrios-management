import { describe, expect, it } from "vitest";
import type { ParametroRow } from "../diagnostico/motor";
import { montarNorma } from "./norma";

// Estas linhas espelham o seed real (src/db/seed-provimento.ts). O ponto do
// arquivo é travar a regra: TODA data exibida em `/` e `/diagnostico` deriva de
// parametro_norma. Já houve bug em produção com a data hardcoded em dois
// lugares (landing exibindo "93 dias" com a CGJ-RN tendo concedido 90).

const linha = (
  chave: string,
  valor: string,
  uf: string | null = null,
): ParametroRow => ({ chave, valor, uf, descricao: null });

// Vigência do Prov. 243 (23/07/2026 + 30 dias) e prazos do art. 20 na redação
// dele. A prorrogação da CGJ-RN caiu com o novo cronograma nacional.
const ROWS: ParametroRow[] = [
  linha("vigencia", "2026-08-22"),
  linha("teto_classe_1", "300000"),
  linha("teto_classe_2", "1500000"),
  linha("prazo_art20_dias_classe_1", "300"),
  linha("prazo_art20_dias_classe_2", "240"),
  linha("prazo_art20_dias_classe_3", "180"),
  linha("prazo_art23_meses_classe_1", "36"),
  linha("prazo_art23_meses_classe_2", "30"),
  linha("prazo_art23_meses_classe_3", "24"),
];

const HOJE = new Date("2026-07-27T12:00:00");

describe("montarNorma", () => {
  it("deriva as datas-limite da vigência do Prov. 243 + art. 20", () => {
    const n = montarNorma(ROWS, HOJE);

    expect(n.vigencia).toBe("22/08/2026");
    expect(n.porClasse[3].dataLimite).toBe("18/02/2027");
    expect(n.porClasse[2].dataLimite).toBe("19/04/2027");
    expect(n.porClasse[1].dataLimite).toBe("18/06/2027");
  });

  it("sem prorrogação estadual vigente, prorrogacaoDias é 0", () => {
    expect(montarNorma(ROWS, HOJE).prorrogacaoDias).toBe(0);
  });

  it("recalcula tudo quando a vigência muda no banco (nada hardcoded)", () => {
    const adiada = ROWS.map((r) =>
      r.chave === "vigencia" ? { ...r, valor: "2026-09-19" } : r,
    );
    const n = montarNorma(adiada, HOJE);

    // +28 dias na vigência ⇒ +28 dias em cada data-limite.
    expect(n.vigencia).toBe("19/09/2026");
    expect(n.porClasse[3].dataLimite).toBe("18/03/2027");
    expect(n.porClasse[2].dataLimite).toBe("17/05/2027");
    expect(n.porClasse[1].dataLimite).toBe("16/07/2027");
  });

  it("conta os dias restantes a partir de hoje", () => {
    const n = montarNorma(ROWS, HOJE);
    // 27/07/2026 → 22/08/2026 são 26 dias; + 180 do art. 20 = 206.
    expect(n.porClasse[3].diasRestantes).toBe(206);
  });

  it("mostra 0 (e não negativo) quando o prazo já venceu", () => {
    const n = montarNorma(ROWS, new Date("2027-07-01T12:00:00"));
    for (const c of [1, 2, 3]) {
      expect(n.porClasse[c].diasRestantes).toBe(0);
    }
  });

  it("expõe os tetos de classe do art. 16 vindos do banco", () => {
    const n = montarNorma(ROWS, HOJE);
    expect(n.tetoClasse1).toBe(300_000);
    expect(n.tetoClasse2).toBe(1_500_000);
  });

  it("aplica prorrogação estadual quando existir, até o teto do art. 21", () => {
    const comProrrogacao = [
      ...ROWS,
      linha("prorrogacao_art20_dias", "90", "RN"),
    ];
    expect(montarNorma(comProrrogacao, HOJE).prorrogacaoDias).toBe(90);
  });

  it("recusa prorrogação acima do teto legal do art. 21 (somatório de 180)", () => {
    const invalida = [...ROWS, linha("prorrogacao_art20_dias", "181", "RN")];
    // Falha alto em vez de publicar uma afirmação juridicamente impossível.
    expect(() => montarNorma(invalida, HOJE)).toThrow(/art\. 21/);
  });
});
