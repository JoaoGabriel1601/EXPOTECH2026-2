import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../utils/pagination.js";

/**
 * Query da listagem: GET /api/v1/historico?period=4h&page=1&limit=50&sort=asc
 * - period: janela de tempo (filtro)
 * - page/limit: paginação (limit tem teto MAX_PAGE_SIZE)
 * - sort: ordem temporal
 */
export const listHistoricoQuerySchema = z.object({
  period: z.enum(["1h", "4h", "8h", "12h", "24h"]).optional().default("12h"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(DEFAULT_PAGE_SIZE),
  sort: z.enum(["asc", "desc"]).optional().default("asc"),
});

/**
 * Amostra anexada pelo ESP32: POST /api/v1/historico.
 * Chaves curtas (t, o, ti, te, ta, ui, ue) = formato que o dashboard já lê.
 */
export const postHistoricoSchema = z.object({
  t: z.number().int().positive().optional(), // timestamp ms; servidor preenche se ausente
  o: z.number().int().min(0).max(500),
  ti: z.number().min(-10).max(60),
  te: z.number().min(-10).max(60),
  ta: z.number().int().min(0).max(30),
  ui: z.number().min(0).max(100),
  ue: z.number().min(0).max(100),
});
