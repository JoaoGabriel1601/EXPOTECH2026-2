import { describe, it, expect } from "vitest";
import { generateSamples, datasetStats } from "../generateDataset.js";

describe("generateDataset", () => {
  it("gera o número de amostras pedido", () => {
    const samples = generateSamples(100);
    expect(samples).toHaveLength(100);
  });

  it("cada amostra tem todos os campos esperados", () => {
    const samples = generateSamples(10);
    for (const s of samples) {
      expect(s).toHaveProperty("pessoas");
      expect(s).toHaveProperty("temp_interna");
      expect(s).toHaveProperty("temp_externa");
      expect(s).toHaveProperty("temp_alvo_ideal");
    }
  });

  it("respeita limites de domínio (pessoas 0–50, temps no range esperado)", () => {
    const samples = generateSamples(1000);
    for (const s of samples) {
      expect(s.pessoas).toBeGreaterThanOrEqual(0);
      expect(s.pessoas).toBeLessThanOrEqual(50);
      expect(s.temp_interna).toBeGreaterThanOrEqual(15);
      expect(s.temp_interna).toBeLessThanOrEqual(40);
      expect(s.temp_externa).toBeGreaterThanOrEqual(15);
      expect(s.temp_externa).toBeLessThanOrEqual(45);
    }
  });

  it("temp_alvo é 0 quando pessoas=0, senão dentro de [16, 28]", () => {
    const samples = generateSamples(1000);
    for (const s of samples) {
      if (s.pessoas === 0) {
        expect(s.temp_alvo_ideal).toBe(0);
      } else {
        expect(s.temp_alvo_ideal).toBeGreaterThanOrEqual(16);
        expect(s.temp_alvo_ideal).toBeLessThanOrEqual(28);
      }
    }
  });

  it("cobre todos os cenários de ocupação", () => {
    const samples = generateSamples(5000);
    const buckets = { zero: 0, low: 0, mid: 0, high: 0, veryHigh: 0 };
    for (const s of samples) {
      if (s.pessoas === 0) buckets.zero++;
      else if (s.pessoas <= 5) buckets.low++;
      else if (s.pessoas <= 15) buckets.mid++;
      else if (s.pessoas <= 30) buckets.high++;
      else buckets.veryHigh++;
    }
    expect(buckets.zero).toBeGreaterThan(0);
    expect(buckets.low).toBeGreaterThan(0);
    expect(buckets.mid).toBeGreaterThan(0);
    expect(buckets.high).toBeGreaterThan(0);
    expect(buckets.veryHigh).toBeGreaterThan(0);
  });

  it("datasetStats retorna min/max/mean por campo", () => {
    const samples = generateSamples(200);
    const stats = datasetStats(samples);
    for (const field of ["pessoas", "temp_interna", "temp_externa", "temp_alvo_ideal"]) {
      expect(stats[field]).toHaveProperty("min");
      expect(stats[field]).toHaveProperty("max");
      expect(stats[field]).toHaveProperty("mean");
      expect(stats[field].max).toBeGreaterThanOrEqual(stats[field].min);
    }
  });
});
