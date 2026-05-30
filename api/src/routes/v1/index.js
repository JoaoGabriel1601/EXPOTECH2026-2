import { Router } from "express";
import sensores from "./sensores.routes.js";
import controle from "./controle.routes.js";
import historico from "./historico.routes.js";
import eventos from "./eventos.routes.js";

const router = Router();

// Índice da versão — útil para descoberta e para o avaliador ver o que existe.
router.get("/", (req, res) => {
  res.json({
    data: {
      version: "v1",
      recursos: {
        sensores: "/api/v1/sensores",
        controle: "/api/v1/controle",
        historico: "/api/v1/historico",
        eventos: "/api/v1/eventos",
      },
      docs: "/api/docs",
    },
    meta: { version: "v1", timestamp: Date.now() },
  });
});

router.use("/sensores", sensores);
router.use("/controle", controle);
router.use("/historico", historico);
router.use("/eventos", eventos);

export default router;
