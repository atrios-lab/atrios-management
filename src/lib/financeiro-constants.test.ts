import { describe, expect, it } from "vitest";
import {
  formatMoney,
  formatMoneyComSinal,
  hojeISO,
  intervaloDoMes,
  isMes,
  labelDia,
  labelMes,
  maskValor,
  mesAtual,
  parseValorCentavos,
  shiftMes,
} from "./financeiro-constants";

describe("dinheiro", () => {
  it("formata em pt-BR e respeita as preferências", () => {
    expect(formatMoney(1_850_000)).toBe("R$ 18.500,00");
    expect(
      formatMoney(432_000, { ocultarValores: false, mostrarCentavos: false }),
    ).toBe("R$ 4.320");
    expect(
      formatMoney(432_000, { ocultarValores: true, mostrarCentavos: true }),
    ).toBe("R$ ••••");
  });

  it("prefixa o sinal pelo valor, não pelo módulo", () => {
    expect(formatMoneyComSinal(1_850_000)).toBe("+R$ 18.500,00");
    expect(formatMoneyComSinal(-432_000)).toBe("−R$ 4.320,00");
  });

  it("lê o campo mascarado de volta em centavos", () => {
    expect(parseValorCentavos("4.320,00")).toBe(432_000);
    expect(parseValorCentavos("R$ 1.234,5")).toBe(123_45);
    expect(parseValorCentavos("")).toBeNull();
    expect(parseValorCentavos("abc")).toBeNull();
  });

  it("mascara digitando da direita para a esquerda", () => {
    expect(maskValor("4")).toBe("0,04");
    expect(maskValor("432000")).toBe("4.320,00");
  });
});

describe("meses", () => {
  it("valida o formato da URL", () => {
    expect(isMes("2026-07")).toBe(true);
    expect(isMes("2026-13")).toBe(false);
    expect(isMes("2026-7")).toBe(false);
  });

  it("atravessa a virada do ano nos dois sentidos", () => {
    expect(shiftMes("2026-12", 1)).toBe("2027-01");
    expect(shiftMes("2026-01", -1)).toBe("2025-12");
  });

  it("delimita o mês como intervalo semiaberto", () => {
    expect(intervaloDoMes("2026-07")).toEqual({
      inicio: "2026-07-01",
      fim: "2026-08-01",
    });
  });

  it("usa a data civil local (sem UTC) para hoje", () => {
    // 31/12 às 21h em -03 ainda é dezembro — em UTC já teria virado o ano.
    const virada = new Date(2026, 11, 31, 21, 0, 0);
    expect(mesAtual(virada)).toBe("2026-12");
    expect(hojeISO(virada)).toBe("2026-12-31");
  });

  it("rotula mês e dia em pt-BR", () => {
    expect(labelMes("2026-07")).toBe("Julho 2026");
    expect(labelDia("2026-07-11")).toBe("11 jul");
  });
});
