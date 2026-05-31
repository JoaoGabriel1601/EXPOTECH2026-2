import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { requireAuth } from "../../middlewares/auth.js";
import { putSensoresSchema } from "../../schemas/sensores.schema.js";
import { getSensores, putSensores } from "../../controllers/sensores.controller.js";

const router = Router();

router.get("/", getSensores); // público — 200 / 404 / 503
router.put("/", requireAuth, validate({ body: putSensoresSchema }), putSensores); // 200 / 400 / 401 / 503

export default router;
