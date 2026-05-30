import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { listHistoricoQuerySchema, postHistoricoSchema } from "../../schemas/historico.schema.js";
import { listHistorico, createHistorico } from "../../controllers/historico.controller.js";

const router = Router();

router.get("/", validate({ query: listHistoricoQuerySchema }), listHistorico); // 200 / 400 / 503
router.post("/", validate({ body: postHistoricoSchema }), createHistorico); // 201 / 400 / 503

export default router;
