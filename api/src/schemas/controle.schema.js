import { z } from "zod";

export const MIN_TARGET_TEMP = 16;
export const MAX_TARGET_TEMP = 28;

/**
 * Atualização PARCIAL do estado de controle do A/C — PATCH /api/v1/controle.
 * Todos os campos são opcionais (é um PATCH), mas pelo menos um deve vir.
 * A regra de negócio temp_alvo ∈ [16, 28] espelha MIN_TARGET_TEMP/AI_MAX_TARGET_TEMP
 * do app web (src/constants/index.js).
 */
export const patchControleSchema = z
  .object({
    ac_ligado: z.boolean().optional(),
    modo_manual: z.boolean().optional(),
    temp_alvo: z
      .number()
      .int()
      .min(MIN_TARGET_TEMP, `temp_alvo deve ser no mínimo ${MIN_TARGET_TEMP}°C`)
      .max(MAX_TARGET_TEMP, `temp_alvo deve ser no máximo ${MAX_TARGET_TEMP}°C`)
      .optional(),
    ia_ativa: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Envie ao menos um campo para atualizar (ac_ligado, modo_manual, temp_alvo ou ia_ativa).",
  });
