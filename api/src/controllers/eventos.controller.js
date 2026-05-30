import { getDb } from "../config/firebase.js";
import { ok, created } from "../utils/respond.js";

const PATH = "eventos";

/** GET /api/v1/eventos?limit=50 → últimos eventos, mais recentes primeiro. */
export async function listEventos(req, res, next) {
  try {
    const { limit } = req.validated.query;
    const snap = await getDb()
      .ref(PATH)
      .orderByChild("timestamp")
      .limitToLast(limit)
      .get();

    const val = snap.val() || {};
    const items = Object.entries(val)
      .map(([id, e]) => ({ id, ...e }))
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

    return ok(res, items, 200, { count: items.length });
  } catch (e) {
    next(e);
  }
}

/** POST /api/v1/eventos → registra um evento. 201 + Location. */
export async function createEvento(req, res, next) {
  try {
    const evento = {
      type: req.body.type,
      payload: req.body.payload ?? null,
      timestamp: req.body.timestamp ?? Date.now(),
    };
    const refPush = await getDb().ref(PATH).push(evento);
    res.set("Location", `/api/v1/eventos/${refPush.key}`);
    return created(res, { id: refPush.key, ...evento });
  } catch (e) {
    next(e);
  }
}
