/**
 * Log estruturado (JSON) de cada requisição: método, rota, status, latência.
 *
 * Observabilidade para monitorar erros 5xx, latência e 429. Cuidado LGPD:
 * NÃO logamos query string nem corpo (evita vazar parâmetros/PII); guardamos
 * só o caminho, o status, o tempo e o uid (quando autenticado).
 */
export function requestLogger(req, res, next) {
  if (process.env.NODE_ENV === "test") return next(); // silencioso nos testes
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const line = {
      t: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl.split("?")[0],
      status: res.statusCode,
      ms: Math.round(ms),
      ip: req.ip,
      uid: req.user?.uid ?? null,
    };
    // 5xx em erro, resto em info — facilita alertas.
    if (res.statusCode >= 500) console.error("[req]", JSON.stringify(line));
    else console.info("[req]", JSON.stringify(line));
  });
  next();
}
