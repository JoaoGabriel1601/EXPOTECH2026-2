import { describe, it, expect } from "vitest";
import { generateHistory, nextLiveSample } from "./mockData";

describe("generateHistory", () => {
  it("retorna 8h * 6 = 48 amostras por padrão", () => {
    expect(generateHistory()).toHaveLength(48);
  });

  it("respeita o parâmetro de horas", () => {
    expect(generateHistory(2)).toHaveLength(12);
    expect(generateHistory(4)).toHaveLength(24);
  });

  it("cada amostra tem todas as chaves esperadas", () => {
    const sample = generateHistory(1)[0];
    expect(sample).toEqual(
      expect.objectContaining({
        time: expect.any(String),
        pessoas: expect.any(Number),
        tempInt: expect.any(Number),
        tempExt: expect.any(Number),
        tempAlvo: expect.any(Number),
        umidInt: expect.any(Number),
        umidExt: expect.any(Number),
      })
    );
  });

  it("ocupação nunca é negativa", () => {
    const data = generateHistory();
    data.forEach((d) => expect(d.pessoas).toBeGreaterThanOrEqual(0));
  });
});

describe("nextLiveSample", () => {
  const baseSample = {
    time: "10:00",
    pessoas: 10,
    tempInt: 22,
    tempExt: 28,
    tempAlvo: 22,
    umidInt: 50,
    umidExt: 60,
  };

  it("retorna objeto com mesmo shape da amostra base", () => {
    const next = nextLiveSample(baseSample);
    expect(Object.keys(next).sort()).toEqual(Object.keys(baseSample).sort());
  });

  it("ocupação varia em ±1 (não negativa)", () => {
    for (let i = 0; i < 50; i++) {
      const next = nextLiveSample(baseSample);
      expect(next.pessoas).toBeGreaterThanOrEqual(0);
      expect(Math.abs(next.pessoas - baseSample.pessoas)).toBeLessThanOrEqual(1);
    }
  });
});
