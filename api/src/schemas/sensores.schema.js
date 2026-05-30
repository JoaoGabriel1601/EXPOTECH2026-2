import { z } from "zod";

/**
 * Leitura completa enviada pelo ESP32 via PUT /api/v1/sensores.
 * Os nomes seguem o schema do Realtime Database (snake_case, em português),
 * para casar com o que o firmware já escreve hoje em /sensores.
 */
export const putSensoresSchema = z.object({
  ocupacao: z.number().int().min(0).max(500),
  temp_interna: z.number().min(-10).max(60),
  temp_externa: z.number().min(-10).max(60),
  temp_alvo: z.number().int().min(0).max(30),
  umid_interna: z.number().min(0).max(100),
  umid_externa: z.number().min(0).max(100),
  ac_ligado: z.boolean(),
  modo_manual: z.boolean().optional(),
  temp_alvo_ia: z.number().int().min(0).max(30).nullable().optional(),
  ia_ativa: z.boolean().optional(),
});
