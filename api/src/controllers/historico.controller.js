import { getDb } from "../config/firebase.js";
import { ok, created } from "../utils/respond.js";

const PATH = "historico";

const PERIOD_HOURS = { "1h": 1, "4h": 4, "8h": 8, "12h": 12, "24h": 24 };

/**
 * GET /api/v1/historico?period=4h&limit=100 → série temporal filtrada.
 * Usa orderByChild('t') + startAt — o RTDB já está indexado em "t"
 * (ver .indexOn no FIREBASE_SETUP.md).
 */
export async function listHistorico(req, res, next) {
  try {
    const { period, limit } = req.validated.query;
    const since = Date.now() - PERIOD_HOURS[period] * 3600_000;

    const snap = await getDb()
      .ref(PATH)
      .orderByChild("t")
      .startAt(since)
      .limitToLast(limit)
      .get();

    const val = snap.val() || {};
    const items = Object.values(val).sort((a, b) => (a.t ?? 0) - (b.t ?? 0));

    return ok(res, items, 200, { period, count: items.length });
  } catch (e) {
    next(e);
  }
}

/** POST /api/v1/historico → ESP32 anexa uma amostra. 201 + Location. */
export async function createHistorico(req, res, next) {
  try {
    const sample = { ...req.body, t: req.body.t ?? Date.now() };
    const refPush = await getDb().ref(PATH).push(sample);
    res.set("Location", `/api/v1/historico/${refPush.key}`);
    return created(res, { id: refPush.key, ...sample });
  } catch (e) {
    next(e);
  }
}
