/** Captura qualquer rota não mapeada e gera um 404 padronizado. */
export function notFound(req, _res, next) {
  const err = new Error(`Recurso não encontrado: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  err.code = "NOT_FOUND";
  next(err);
}
