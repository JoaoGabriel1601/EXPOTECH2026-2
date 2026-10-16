import { afterEach, describe, expect, it, vi } from "vitest";
import { getHistory, getLatest, login, mapReading } from "./movementApi";

const reading = {
  measured_at: "2026-10-16T12:00:00Z", occupancy: 8,
  temp_inside: 27.5, temp_outside: 32, target_temp: 21,
  humidity_inside: 55, humidity_outside: 62, ac_on: false, manual_mode: true,
};

afterEach(() => vi.unstubAllGlobals());

describe("API Movement", () => {
  it("preserva A/C desligado mesmo com alvo positivo", () => {
    expect(mapReading(reading)).toMatchObject({ acLigado: false, tempAlvo: 21, modoManual: true });
  });

  it("transporta atraso da leitura e autenticação sem cache", async () => {
    vi.stubGlobal("sessionStorage", { getItem: () => "session-token" });
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      reading, is_stale: true, age_seconds: 300,
    }) });
    vi.stubGlobal("fetch", fetch);
    expect(await getLatest()).toMatchObject({ isStale: true, ageSeconds: 300 });
    expect(fetch.mock.calls[0][1]).toMatchObject({
      cache: "no-store", headers: { Authorization: "Bearer session-token" },
    });
  });

  it("trata ambiente sem leitura e histórico vazio", async () => {
    vi.stubGlobal("sessionStorage", { getItem: () => "session-token" });
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reading: null }) })
      .mockResolvedValueOnce({ ok: true, json: async () => [] }));
    expect(await getLatest()).toBeNull();
    expect(await getHistory()).toEqual([]);
  });

  it("limpa sessão expirada para solicitar novo login", async () => {
    const removeItem = vi.fn();
    const dispatchEvent = vi.fn();
    vi.stubGlobal("sessionStorage", { getItem: () => "expired", removeItem });
    vi.stubGlobal("window", { dispatchEvent });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(getLatest()).rejects.toThrow("sessão inválidos");
    expect(removeItem).toHaveBeenCalled();
    expect(dispatchEvent).toHaveBeenCalled();
  });

  it("login não envia a sessão anterior e guarda somente token de sessão", async () => {
    const setItem = vi.fn();
    vi.stubGlobal("sessionStorage", { getItem: () => "old-token", setItem });
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: "new-token" }) });
    vi.stubGlobal("fetch", fetch);
    await login("admin", "password");
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(setItem).toHaveBeenCalledWith("movement.operator.session", "new-token");
  });
});
