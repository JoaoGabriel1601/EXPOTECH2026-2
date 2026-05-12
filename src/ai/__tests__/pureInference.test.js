import { describe, it, expect } from "vitest";
import { forwardPass, getModelVersion, getNormalization } from "../pureInference.js";

describe("pureInference", () => {
  it("retorna a versão do modelo", () => {
    expect(getModelVersion()).toBeTruthy();
  });

  it("retorna parâmetros de normalização", () => {
    const norm = getNormalization();
    expect(norm).toHaveProperty("features");
    expect(norm).toHaveProperty("stats");
    expect(norm.features).toContain("pessoas");
    expect(norm.features).toContain("temp_interna");
    expect(norm.features).toContain("temp_externa");
  });

  it("forwardPass retorna número finito para inputs típicos", () => {
    const cases = [
      [0, 25, 28],
      [5, 24, 26],
      [10, 27, 32],
      [25, 28, 36],
      [45, 30, 40],
    ];
    for (const [p, ti, te] of cases) {
      const out = forwardPass(p, ti, te);
      expect(Number.isFinite(out)).toBe(true);
    }
  });

  it("forwardPass produz valor mais baixo para mais pessoas (tendência)", () => {
    const fewPeople = forwardPass(3, 26, 30);
    const manyPeople = forwardPass(35, 26, 30);
    expect(manyPeople).toBeLessThan(fewPeople);
  });
});
