import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { putSensoresSchema } from "../../schemas/sensores.schema.js";
import { getSensores, putSensores } from "../../controllers/sensores.controller.js";

const router = Router();

router.get("/", getSensores); // 200 / 404 / 503
router.put("/", validate({ body: putSensoresSchema }), putSensores); // 200 / 400 / 503

export default router;
