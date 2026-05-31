import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../utils/pagination.js";

/**
 * Query da listagem: GET /api/v1/eventos?page=1&limit=50&sort=desc&type=ac_ligado_manual
 * - page/limit: paginação (limit com teto MAX_PAGE_SIZE)
 * - sort: ordem por timestamp
 * - type: filtro opcional por tipo de evento
 */
export const listEventosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(DEFAULT_PAGE_SIZE),
  sort: z.enum(["asc", "desc"]).optional().default("desc"),
  type: z.string().min(1).max(64).optional(),
});

/** Registro de evento: POST /api/v1/eventos. */
export const postEventoSchema = z.object({
  type: z.string().min(1).max(64),
  payload: z.unknown().optional().nullable(),
  timestamp: z.number().int().positive().optional(),
});
