import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

// Substitui o Firebase real pelo mock em memória.
vi.mock("../src/config/firebase.js", async () => await import("./fakeFirebase.js"));

const { createApp } = await import("../src/app.js");
const { __setStore, __reset } = await import("./fakeFirebase.js");

const app = createApp();
const AUTH = { Authorization: "Bearer valid-token" };

beforeEach(() => {
  __reset();
  __setStore({
    sensores: { ocupacao: 12, temp_interna: 23.5, temp_externa: 31, temp_alvo: 22, umid_interna: 55, umid_externa: 70, ac_ligado: true },
    controle: { ac_ligado: true, modo_manual: true, temp_alvo: 22 },
    historico: { a: { t: Date.now(), o: 10, ti: 23, te: 30, ta: 22, ui: 50, ue: 60 } },
    eventos: { e1: { type: "ac_ligado_manual", timestamp: Date.now(), payload: null } },
  });
});

describe("infra & contrato", () => {
  it("GET /health → 200, firebase up", async () => {
    const r = await request(app).get("/health");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ status: "ok", firebase: "up" });
  });

  it("GET /api/openapi.json → 200, OpenAPI 3.1", async () => {
    const r = await request(app).get("/api/openapi.json");
    expect(r.status).toBe(200);
    expect(r.body.openapi).toBe("3.1.0");
    expect(Object.keys(r.body.paths).length).toBeGreaterThanOrEqual(5);
  });

  it("rota inexistente → 404 em application/problem+json (RFC 7807)", async () => {
    const r = await request(app).get("/api/v1/nada");
    expect(r.status).toBe(404);
    expect(r.headers["content-type"]).toContain("application/problem+json");
    expect(r.body.type).toContain("not-found");
    expect(r.body.status).toBe(404);
  });

  it("respostas de dados trazem Cache-Control: no-store", async () => {
    const r = await request(app).get("/api/v1/sensores");
    expect(r.headers["cache-control"]).toBe("no-store");
  });
});

describe("sensores", () => {
  it("GET → 200 com a leitura", async () => {
    const r = await request(app).get("/api/v1/sensores");
    expect(r.status).toBe(200);
    expect(r.body.data.ocupacao).toBe(12);
    expect(r.body.meta.version).toBe("v1");
  });

  it("GET sem dados → 404", async () => {
    __reset();
    const r = await request(app).get("/api/v1/sensores");
    expect(r.status).toBe(404);
  });

  it("PUT sem token → 401 + WWW-Authenticate", async () => {
    const r = await request(app).put("/api/v1/sensores").send({ ocupacao: 1, temp_interna: 20, temp_externa: 25, temp_alvo: 22, umid_interna: 50, umid_externa: 60, ac_ligado: true });
    expect(r.status).toBe(401);
    expect(r.headers["www-authenticate"]).toContain("Bearer");
  });

  it("PUT com token + corpo válido → 200", async () => {
    const r = await request(app).put("/api/v1/sensores").set(AUTH).send({ ocupacao: 5, temp_interna: 22, temp_externa: 28, temp_alvo: 21, umid_interna: 50, umid_externa: 60, ac_ligado: true });
    expect(r.status).toBe(200);
    expect(r.body.data.ocupacao).toBe(5);
  });

  it("PUT com token + corpo inválido → 400 com errors", async () => {
    const r = await request(app).put("/api/v1/sensores").set(AUTH).send({ ocupacao: -1, temp_interna: 22, temp_externa: 28, temp_alvo: 21, umid_interna: 50, umid_externa: 60, ac_ligado: true });
    expect(r.status).toBe(400);
    expect(r.headers["content-type"]).toContain("application/problem+json");
    expect(Array.isArray(r.body.errors)).toBe(true);
  });
});

describe("controle", () => {
  it("GET → 200", async () => {
    const r = await request(app).get("/api/v1/controle");
    expect(r.status).toBe(200);
    expect(r.body.data.temp_alvo).toBe(22);
  });

  it("PATCH sem token → 401", async () => {
    const r = await request(app).patch("/api/v1/controle").send({ temp_alvo: 24 });
    expect(r.status).toBe(401);
  });

  it("PATCH temp_alvo fora de [16,28] → 400 (regra de negócio)", async () => {
    const r = await request(app).patch("/api/v1/controle").set(AUTH).send({ temp_alvo: 99 });
    expect(r.status).toBe(400);
    expect(r.body.errors[0].campo).toBe("temp_alvo");
  });

  it("PATCH válido → 200 e registra evento de auditoria", async () => {
    const r = await request(app).patch("/api/v1/controle").set(AUTH).send({ temp_alvo: 24 });
    expect(r.status).toBe(200);
    expect(r.body.data.temp_alvo).toBe(24);
    // o evento registrado deve carregar o uid do token (auditoria)
    const ev = await request(app).get("/api/v1/eventos");
    expect(ev.body.data.some((e) => e.type === "temp_alvo_manual" && e.por === "test-uid")).toBe(true);
  });
});

describe("eventos (coleção paginada + DELETE)", () => {
  it("GET → 200 com meta.pagination", async () => {
    const r = await request(app).get("/api/v1/eventos");
    expect(r.status).toBe(200);
    expect(r.body.meta.pagination).toMatchObject({ page: 1, page_size: 50 });
  });

  it("POST sem token → 401", async () => {
    const r = await request(app).post("/api/v1/eventos").send({ type: "teste" });
    expect(r.status).toBe(401);
  });

  it("POST com token → 201 + Location", async () => {
    const r = await request(app).post("/api/v1/eventos").set(AUTH).send({ type: "teste" });
    expect(r.status).toBe(201);
    expect(r.headers["location"]).toContain("/api/v1/eventos/");
  });

  it("DELETE existente → 204; inexistente → 404 (idempotência)", async () => {
    const del = await request(app).delete("/api/v1/eventos/e1").set(AUTH);
    expect(del.status).toBe(204);
    const again = await request(app).delete("/api/v1/eventos/e1").set(AUTH);
    expect(again.status).toBe(404);
  });
});

describe("paginação", () => {
  it("limit acima do máximo (100) → 400", async () => {
    const r = await request(app).get("/api/v1/historico?limit=999");
    expect(r.status).toBe(400);
    expect(r.body.errors[0].campo).toBe("limit");
  });

  it("GET /historico → 200 com pagination", async () => {
    const r = await request(app).get("/api/v1/historico?period=1h");
    expect(r.status).toBe(200);
    expect(r.body.meta.pagination.page).toBe(1);
  });
});
