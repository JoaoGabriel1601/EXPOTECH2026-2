import { describe, it, expect } from "vitest";
import { calcTargetTemp, MIN_TARGET_TEMP } from "./index";

describe("calcTargetTemp", () => {
  it("retorna 0 quando não há pessoas", () => {
    expect(calcTargetTemp(0, 25)).toBe(0);
    expect(calcTargetTemp(0, 40)).toBe(0);
  });

  it("aplica regras base por faixa de ocupação", () => {
    expect(calcTargetTemp(3, 25)).toBe(24);
    expect(calcTargetTemp(10, 25)).toBe(22);
    expect(calcTargetTemp(20, 25)).toBe(20);
    expect(calcTargetTemp(50, 25)).toBe(18);
  });

  it("reduz 1°C quando externa > 30°C", () => {
    expect(calcTargetTemp(10, 31)).toBe(21);
    expect(calcTargetTemp(20, 31)).toBe(19);
  });

  it("reduz 2°C quando externa > 35°C", () => {
    expect(calcTargetTemp(10, 36)).toBe(20);
    expect(calcTargetTemp(20, 36)).toBe(18);
  });

  it("nunca abaixa do limite mínimo", () => {
    expect(calcTargetTemp(50, 40)).toBe(MIN_TARGET_TEMP);
  });

  it("trata limite exato (não inclusivo) de 30°C", () => {
    expect(calcTargetTemp(10, 30)).toBe(22);
    expect(calcTargetTemp(10, 30.1)).toBe(21);
  });
});
