import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { requireAuth } from "../../middlewares/auth.js";
import { listEventosQuerySchema, postEventoSchema } from "../../schemas/eventos.schema.js";
import { listEventos, createEvento, deleteEvento } from "../../controllers/eventos.controller.js";

const router = Router();

router.get("/", validate({ query: listEventosQuerySchema }), listEventos); // público — 200 / 400 / 503
router.post("/", requireAuth, validate({ body: postEventoSchema }), createEvento); // 201 / 400 / 401 / 503
router.delete("/:id", requireAuth, deleteEvento); // 204 / 401 / 404 / 503

export default router;
