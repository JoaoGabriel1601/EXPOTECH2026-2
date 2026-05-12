import { describe, it, expect, beforeEach } from "vitest";
import {
  initClimateAI,
  isAIReady,
  predictTargetTemp,
  getAIDiagnostics,
  ruleBasedTarget,
  __resetForTests,
} from "../climateAI.js";

describe("climateAI", () => {
  beforeEach(() => {
    __resetForTests();
  });

  it("isAIReady é verdadeiro porque os pesos são bundled", () => {
    expect(isAIReady()).toBe(true);
  });

  it("initClimateAI resolve em true", async () => {
    const ok = await initClimateAI();
    expect(ok).toBe(true);
  });

  it("retorna 0 quando pessoas <= 0", () => {
    expect(predictTargetTemp(0, 25, 28)).toBe(0);
    expect(predictTargetTemp(-1, 25, 28)).toBe(0);
  });

  it("retorna um número no intervalo [16, 28] para ocupação > 0", () => {
    for (let p = 1; p <= 50; p += 3) {
      const v = predictTargetTemp(p, 25, 28);
      expect(v).toBeGreaterThanOrEqual(16);
      expect(v).toBeLessThanOrEqual(28);
    }
  });

  it("é determinístico (mesmos inputs → mesmo output)", () => {
    const a = predictTargetTemp(10, 26, 30);
    const b = predictTargetTemp(10, 26, 30);
    expect(a).toBe(b);
  });

  it("temperatura alvo diminui (ou se mantém) com mais pessoas", () => {
    const lowOccupancy = predictTargetTemp(3, 25, 28);
    const highOccupancy = predictTargetTemp(40, 25, 28);
    expect(highOccupancy).toBeLessThanOrEqual(lowOccupancy);
  });

  it("temperatura alvo diminui com calor externo extremo", () => {
    const mild = predictTargetTemp(15, 25, 25);
    const hot = predictTargetTemp(15, 25, 40);
    expect(hot).toBeLessThanOrEqual(mild);
  });

  it("getAIDiagnostics expõe estado", () => {
    predictTargetTemp(10, 25, 28);
    const d = getAIDiagnostics();
    expect(d).toHaveProperty("modelLoaded");
    expect(d).toHaveProperty("modelVersion");
    expect(d).toHaveProperty("lastPrediction");
    expect(d.lastPrediction).not.toBeNull();
  });

  it("ruleBasedTarget continua existindo como fallback", () => {
    expect(ruleBasedTarget(10, 28)).toBe(22);
    expect(ruleBasedTarget(0, 28)).toBe(0);
  });
});
