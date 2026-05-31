import { problem } from "../utils/respond.js";

// Mapa de status → (code, title) padrão para o Problem Details (RFC 7807).
const TITLES = {
  400: ["validation-error", "Dados de entrada inválidos."],
  401: ["unauthorized", "Autenticação necessária."],
  403: ["forbidden", "Acesso negado."],
  404: ["not-found", "Recurso não encontrado."],
  409: ["conflict", "Conflito de estado."],
  422: ["unprocessable-entity", "Não foi possível processar a entidade."],
  429: ["rate-limit-exceeded", "Limite de requisições excedido."],
  503: ["service-unavailable", "Serviço indisponível."],
};

/**
 * Tratador de erros central — único lugar que decide o status code e formata
 * a resposta de erro como Problem Details (application/problem+json).
 */
// eslint-disable-next-line no-unused-vars -- 4 args marcam um error handler no Express
export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;

  if (status >= 500) {
    console.error(`[erro ${status}] ${req.method} ${req.originalUrl}:`, err);
  }

  const [defaultCode, defaultTitle] = TITLES[status] || ["internal-error", "Erro interno do servidor."];
  // 500 genérico não vaza detalhe interno; demais erros trazem mensagem útil.
  const detail = status === 500 ? "Ocorreu um erro inesperado." : err.message;

  // Headers específicos do erro (ex.: WWW-Authenticate no 401).
  if (err.headers) {
    for (const [k, v] of Object.entries(err.headers)) res.set(k, v);
  }

  return problem(res, {
    status,
    code: err.code ? slug(err.code) : defaultCode,
    title: defaultTitle,
    detail,
    instance: req.originalUrl,
    errors: err.errors,
  });
}

function slug(code) {
  return String(code).toLowerCase().replace(/_/g, "-");
}
