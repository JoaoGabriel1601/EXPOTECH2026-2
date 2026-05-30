/**
 * Envelope de resposta padronizado — o "contrato" de saída da API.
 * Toda resposta de sucesso tem { data, meta }; toda de erro tem { error }.
 */

const VERSION = "v1";

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

export function fail(res, { status = 500, code = "INTERNAL_ERROR", message, details }) {
  return res.status(status).json({
    error: { code, status, message, ...(details ? { details } : {}) },
    meta: { version: VERSION, timestamp: Date.now() },
  });
}
