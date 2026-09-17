import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// A rota pública de autoavaliação roda em tema claro por redefinição de
// tokens ([data-theme="light"] em globals.css). Isso só funciona se NENHUMA
// cor for literal nos componentes da rota: hex ou rgb/rgba fixos ignoram o
// tema. Este teste é a regra de lint que o Biome não tem.

const ROTA = new URL("../../app/autoavaliacao/[token]/", import.meta.url);
const ARQUIVOS = ["telas.tsx", "autoavaliacao-form.tsx"];

/** Remove comentários `//…` e `/* … *\/` (podem citar cores como exemplo). */
function semComentarios(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("tema claro da autoavaliação: cor só por token", () => {
  for (const nome of ARQUIVOS) {
    it(`${nome} não tem hex nem rgb/rgba literal`, () => {
      const src = semComentarios(
        readFileSync(fileURLToPath(new URL(nome, ROTA)), "utf8"),
      );
      const hex = src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
      const rgb = src.match(/\brgba?\(/g) ?? [];
      expect(hex, `hex literal em ${nome}`).toEqual([]);
      expect(rgb, `rgb/rgba literal em ${nome}`).toEqual([]);
    });
  }

  it("a casca declara data-theme=light e usa o gradiente por token", () => {
    const src = readFileSync(fileURLToPath(new URL("telas.tsx", ROTA)), "utf8");
    expect(src).toContain('data-theme="light"');
    expect(src).toContain("var(--color-canvas-top)");
  });
});
