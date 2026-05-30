import { z } from "zod";

/** Query da listagem: GET /api/v1/historico?period=4h&limit=100 */
export const listHistoricoQuerySchema = z.object({
  period: z.enum(["1h", "4h", "8h", "12h", "24h"]).optional().default("12h"),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
});

/**
 * Amostra anexada pelo ESP32: POST /api/v1/historico.
 * Mantém as chaves curtas do RTDB (t, o, ti, te, ta, ui, ue) para economizar
 * banda no dispositivo — é o formato que o dashboard já lê em /historico.
 */
export const postHistoricoSchema = z.object({
  t: z.number().int().positive().optional(), // timestamp ms; se ausente, o servidor usa Date.now()
  o: z.number().int().min(0).max(500), // ocupação
  ti: z.number().min(-10).max(60), // temp interna
  te: z.number().min(-10).max(60), // temp externa
  ta: z.number().int().min(0).max(30), // temp alvo
  ui: z.number().min(0).max(100), // umidade interna
  ue: z.number().min(0).max(100), // umidade externa
});
