import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { Topo } from "./topo";

// `Topo` é o ÚNICO lugar que renderiza os logos de parceria, e as duas páginas
// públicas (`/` e `/diagnostico`) o usam — testar aqui cobre as duas. Se alguém
// voltar a inlinar os logos numa página, este teste não pega: por isso o teste
// de fonte única abaixo (nenhuma página lê a flag por conta própria).

afterEach(() => {
  delete process.env.LANDING_SHOW_PARTNERS;
});

const markup = () => renderToStaticMarkup(<Topo />);

describe("Topo — logos de parceria", () => {
  it("não renderiza logo de parceria nenhum sem a flag (default)", () => {
    const html = markup();
    expect(html).not.toContain("arpen-rn.png");
    expect(html).not.toContain("anoreg-rn.png");
    expect(html).not.toContain("Realização / apoio");
    // a logo da própria Átrios continua lá (lockup inline, via aria-label)
    expect(html).toContain("Átrios Tecnologia e Consultoria");
  });

  it("não renderiza com a flag explicitamente 'false'", () => {
    process.env.LANDING_SHOW_PARTNERS = "false";
    expect(markup()).not.toContain("arpen-rn.png");
  });

  it("só renderiza com a flag exatamente 'true'", () => {
    process.env.LANDING_SHOW_PARTNERS = "true";
    const html = markup();
    expect(html).toContain("arpen-rn.png");
    expect(html).toContain("anoreg-rn.png");
  });

  it("ignora valores ambíguos (só 'true' liga)", () => {
    for (const v of ["1", "yes", "TRUE", ""]) {
      process.env.LANDING_SHOW_PARTNERS = v;
      expect(markup()).not.toContain("arpen-rn.png");
    }
  });
});
