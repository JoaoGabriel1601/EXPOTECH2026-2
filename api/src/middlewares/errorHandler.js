import { fail } from "../utils/respond.js";

/**
 * Tratador de erros central — único lugar que decide o status code de saída.
 * Qualquer `next(err)` dos controllers cai aqui. Erros sem `status` viram 500.
 */
// eslint-disable-next-line no-unused-vars -- assinatura de 4 args é o que marca um error handler no Express
export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;

  // Loga 5xx (bugs/infra); 4xx são esperados e não poluem o log.
  if (status >= 500) {
    console.error(`[erro ${status}] ${req.method} ${req.originalUrl}:`, err);
  }

  // Só o 500 "genérico" esconde a mensagem (pode vazar interno). Erros
  // operacionais como 503 trazem mensagem segura e útil para o cliente.
  const hideMessage = status === 500;

  return fail(res, {
    status,
    code: err.code || "INTERNAL_ERROR",
    message: hideMessage ? "Erro interno do servidor." : err.message,
    details: err.details,
  });
}
