import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { listEventosQuerySchema, postEventoSchema } from "../../schemas/eventos.schema.js";
import { listEventos, createEvento } from "../../controllers/eventos.controller.js";

const router = Router();

router.get("/", validate({ query: listEventosQuerySchema }), listEventos); // 200 / 400 / 503
router.post("/", validate({ body: postEventoSchema }), createEvento); // 201 / 400 / 503

export default router;
