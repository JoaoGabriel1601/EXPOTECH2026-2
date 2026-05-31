import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { requireAuth } from "../../middlewares/auth.js";
import { patchControleSchema } from "../../schemas/controle.schema.js";
import { getControle, patchControle } from "../../controllers/controle.controller.js";

const router = Router();

router.get("/", getControle); // público — 200 / 404 / 503
router.patch("/", requireAuth, validate({ body: patchControleSchema }), patchControle); // 200 / 400 / 401 / 503

export default router;
