import { dbOp } from "../config/firebase.js";
import { created, paginated } from "../utils/respond.js";
import { paginateArray } from "../utils/pagination.js";

const PATH = "historico";
const PERIOD_HOURS = { "1h": 1, "4h": 4, "8h": 8, "12h": 12, "24h": 24 };

/**
 * GET /api/v1/historico?period=4h&page=1&limit=50&sort=asc
 * Filtra pela janela de tempo (orderByChild('t') indexado), ordena e pagina.
 */
export async function listHistorico(req, res, next) {
  try {
    const { period, page, limit, sort } = req.validated.query;
    const since = Date.now() - PERIOD_HOURS[period] * 3600_000;

    const snap = await dbOp(
      (db) => db.ref(PATH).orderByChild("t").startAt(since).get(),
      "list historico"
    );
    const val = snap.val() || {};

    let items = Object.values(val).sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
    if (sort === "desc") items.reverse();

    const { slice, pagination } = paginateArray(items, page, limit);
    return paginated(res, slice, pagination, { period });
  } catch (e) {
    next(e);
  }
}

/** POST /api/v1/historico → ESP32 anexa uma amostra. 201 + Location. */
export async function createHistorico(req, res, next) {
  try {
    const sample = { ...req.body, t: req.body.t ?? Date.now() };
    const ref = await dbOp((db) => db.ref(PATH).push(sample), "create historico");
    res.set("Location", `/api/v1/historico/${ref.key}`);
    return created(res, { id: ref.key, ...sample });
  } catch (e) {
    next(e);
  }
}
