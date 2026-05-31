import { dbOp } from "../config/firebase.js";
import { ok } from "../utils/respond.js";

const PATH = "controle";
const EVENTOS_PATH = "eventos";

/** GET /api/v1/controle → estado atual de controle do A/C (singleton). */
export async function getControle(req, res, next) {
  try {
    const snap = await dbOp((db) => db.ref(PATH).get(), "get controle");
    if (!snap.exists()) {
      const err = new Error("Estado de controle ainda não inicializado.");
      err.status = 404;
      err.code = "NOT_FOUND";
      throw err;
    }
    return ok(res, snap.val());
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /api/v1/controle → atualização parcial (ligar A/C, mudar temp_alvo, etc).
 * PATCH porque o cliente envia só os campos que quer mudar. Também registra um
 * evento de auditoria em /eventos.
 */
export async function patchControle(req, res, next) {
  try {
    const patch = { ...req.body, atualizado_em: Date.now() };
    await dbOp((db) => db.ref(PATH).update(patch), "patch controle");

    const type = describeChange(req.body);
    if (type) {
      await dbOp(
        (db) =>
          db.ref(EVENTOS_PATH).push({
            type,
            timestamp: Date.now(),
            payload: req.body,
            por: req.user?.uid ?? null, // quem fez a mudança (auditoria)
          }),
        "push evento"
      );
    }

    const snap = await dbOp((db) => db.ref(PATH).get(), "get controle");
    return ok(res, snap.val());
  } catch (e) {
    next(e);
  }
}

function describeChange(body) {
  // Ordem importa: ajustar a temperatura também envia ac_ligado:true,
  // então temp_alvo tem prioridade para o evento refletir a intenção real.
  if ("temp_alvo" in body) return "temp_alvo_manual";
  if ("ac_ligado" in body) return body.ac_ligado ? "ac_ligado_manual" : "ac_desligado_manual";
  if ("modo_manual" in body) return body.modo_manual ? "modo_manual_on" : "modo_manual_off";
  return null;
}
