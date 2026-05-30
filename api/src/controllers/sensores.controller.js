import { getDb } from "../config/firebase.js";
import { ok } from "../utils/respond.js";

const PATH = "sensores";

/** GET /api/v1/sensores → leitura atual dos sensores (recurso singleton). */
export async function getSensores(req, res, next) {
  try {
    const snap = await getDb().ref(PATH).get();
    if (!snap.exists()) {
      const err = new Error("Nenhuma leitura de sensores disponível ainda.");
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
 * PUT /api/v1/sensores → o ESP32 envia a leitura completa (substitui o estado).
 * PUT (e não PATCH) porque o dispositivo manda o objeto inteiro a cada ciclo.
 */
export async function putSensores(req, res, next) {
  try {
    const payload = { ...req.body, atualizado_em: Date.now() };
    await getDb().ref(PATH).set(payload);
    return ok(res, payload);
  } catch (e) {
    next(e);
  }
}
