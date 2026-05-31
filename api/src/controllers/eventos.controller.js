import { dbOp } from "../config/firebase.js";
import { created, paginated, noContent } from "../utils/respond.js";
import { paginateArray } from "../utils/pagination.js";

const PATH = "eventos";

/**
 * GET /api/v1/eventos?page=1&limit=50&sort=desc&type=...
 * Lista paginada, com ordenação por timestamp e filtro opcional por tipo.
 */
export async function listEventos(req, res, next) {
  try {
    const { page, limit, sort, type } = req.validated.query;

    const snap = await dbOp(
      (db) => db.ref(PATH).orderByChild("timestamp").get(),
      "list eventos"
    );
    const val = snap.val() || {};

    let items = Object.entries(val).map(([id, e]) => ({ id, ...e }));
    if (type) items = items.filter((e) => e.type === type);
    items.sort((a, b) =>
      sort === "asc"
        ? (a.timestamp ?? 0) - (b.timestamp ?? 0)
        : (b.timestamp ?? 0) - (a.timestamp ?? 0)
    );

    const { slice, pagination } = paginateArray(items, page, limit);
    return paginated(res, slice, pagination);
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
      por: req.user?.uid ?? null,
    };
    const ref = await dbOp((db) => db.ref(PATH).push(evento), "create evento");
    res.set("Location", `/api/v1/eventos/${ref.key}`);
    return created(res, { id: ref.key, ...evento });
  } catch (e) {
    next(e);
  }
}

/**
 * DELETE /api/v1/eventos/:id → remove um evento.
 * 204 (removido) ou 404 (não existe). DELETE é idempotente.
 */
export async function deleteEvento(req, res, next) {
  try {
    const { id } = req.params;
    const snap = await dbOp((db) => db.ref(`${PATH}/${id}`).get(), "get evento");
    if (!snap.exists()) {
      const err = new Error(`Evento '${id}' não encontrado.`);
      err.status = 404;
      err.code = "NOT_FOUND";
      throw err;
    }
    await dbOp((db) => db.ref(`${PATH}/${id}`).remove(), "delete evento");
    return noContent(res);
  } catch (e) {
    next(e);
  }
}
