import rateLimit from "express-rate-limit";

const WINDOW_MS = 60_000; // 1 minuto
const MAX = Number(process.env.RATE_LIMIT_MAX) || 120; // requisições por janela, por IP

/**
 * Rate limiting por IP (mitiga OWASP API4:2023 — Unrestricted Resource
 * Consumption). Emite headers padrão `RateLimit-*` e, no 429, `Retry-After`,
 * formatando a resposta como Problem Details via o errorHandler.
 *
 * Em produção com múltiplas instâncias, o store iria para Redis; aqui (1
 * instância no Render free) o store em memória é suficiente.
 */
export const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: MAX,
  standardHeaders: true, // expõe RateLimit-Limit / RateLimit-Remaining / RateLimit-Reset
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res, next, options) => {
    res.set("Retry-After", String(Math.ceil(options.windowMs / 1000)));
    const err = new Error(
      `Limite de ${options.limit} requisições por minuto excedido. Aguarde e tente novamente.`
    );
    err.status = 429;
    err.code = "RATE_LIMIT_EXCEEDED";
    next(err);
  },
});
