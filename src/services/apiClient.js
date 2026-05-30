/**
 * Cliente HTTP da ClimaControl API (gateway REST sobre o Firebase).
 *
 * Ativa-se quando VITE_API_URL está definida. Quando ausente, `apiEnabled`
 * é false e o app usa o acesso direto ao Firebase (comportamento original) —
 * isso mantém a migração incremental e segura.
 *
 * Lida com o envelope de resposta da API: sucesso { data, meta },
 * erro { error: { code, status, message, details } }.
 */

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const apiEnabled = Boolean(API_URL);

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    // API fora do ar / CORS / sem rede
    const err = new Error("Não foi possível conectar à API.");
    err.cause = networkErr;
    err.code = "NETWORK_ERROR";
    throw err;
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const err = new Error(json?.error?.message || `Erro HTTP ${res.status}`);
    err.status = res.status;
    err.code = json?.error?.code || "HTTP_ERROR";
    err.details = json?.error?.details;
    throw err;
  }

  return json?.data;
}

export const api = {
  getSensores: () => request("GET", "/api/v1/sensores"),
  getControle: () => request("GET", "/api/v1/controle"),
  patchControle: (patch) => request("PATCH", "/api/v1/controle", patch),
  getHistorico: (period = "12h", limit = 200) =>
    request("GET", `/api/v1/historico?period=${encodeURIComponent(period)}&limit=${limit}`),
  postEvento: (type, payload = null) => request("POST", "/api/v1/eventos", { type, payload }),
};

if (typeof window !== "undefined" && import.meta.env.DEV) {
  console.info(
    apiEnabled
      ? `[ClimaControl] API REST ativa: ${API_URL} (escritas de controle passam pelo gateway)`
      : "[ClimaControl] VITE_API_URL não definida — escritas vão direto ao Firebase."
  );
}
