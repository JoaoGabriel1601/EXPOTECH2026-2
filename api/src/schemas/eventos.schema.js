import { z } from "zod";

/** Query da listagem: GET /api/v1/eventos?limit=50 */
export const listEventosQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

/**
 * Registro de evento: POST /api/v1/eventos.
 * Espelha o formato que o app web já grava em /eventos via push().
 */
export const postEventoSchema = z.object({
  type: z.string().min(1).max(64),
  payload: z.unknown().optional().nullable(),
  timestamp: z.number().int().positive().optional(), // se ausente, o servidor usa Date.now()
});
