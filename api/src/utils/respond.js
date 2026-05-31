/**
 * Helpers de resposta da API.
 *
 * Sucesso: envelope { data, meta } (meta carrega versão, timestamp e, em
 * coleções, a paginação).
 * Erro: RFC 7807 — Problem Details (application/problem+json).
 */

const VERSION = "v1";
const PROBLEM_BASE = "https://climacontrol-api.onrender.com/problems";

export function ok(res, data, status = 200, extraMeta = {}) {
  return res.status(status).json({
    data,
    meta: { version: VERSION, timestamp: Date.now(), ...extraMeta },
  });
}

export function created(res, data, extraMeta = {}) {
  return ok(res, data, 201, extraMeta);
}

export function noContent(res) {
  return res.status(204).send();
}

/**
 * Resposta de coleção paginada. `pagination` = { page, pageSize, total, hasMore }.
 */
export function paginated(res, items, pagination, extraMeta = {}) {
  return ok(res, items, 200, { pagination, ...extraMeta });
}

/**
 * Erro no formato RFC 7807 (Problem Details).
 * - type: URI que identifica o tipo do problema (slug de `code`).
 * - title: resumo legível e estável do problema.
 * - status: código HTTP.
 * - detail: explicação específica desta ocorrência.
 * - instance: caminho que gerou o erro.
 * - errors: extensão (lista de campos inválidos), quando houver.
 */
export function problem(res, { status = 500, code = "internal-error", title, detail, instance, errors }) {
  res.status(status);
  res.type("application/problem+json");
  return res.json({
    type: `${PROBLEM_BASE}/${code}`,
    title: title || "Erro",
    status,
    detail,
    instance,
    ...(errors ? { errors } : {}),
  });
}
