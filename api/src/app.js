import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import v1 from "./routes/v1/index.js";
import { openapiSpec } from "./docs/openapi.js";
import { firebaseReady } from "./config/firebase.js";
import { notFound } from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";

export function createApp() {
  const app = express();

  // ── Segurança e parsing ────────────────────────────────
  app.use(helmet());
  const origins = (process.env.CORS_ORIGIN || "*").split(",").map((s) => s.trim());
  app.use(cors({ origin: origins.includes("*") ? true : origins }));
  app.use(express.json({ limit: "100kb" }));

  // ── Health check (usado pelo Render) ───────────────────
  app.get("/health", (req, res) => {
    res.json({ status: "ok", firebase: firebaseReady() ? "up" : "down", uptime: process.uptime() });
  });

  // ── Documentação / contrato ────────────────────────────
  app.get("/", (req, res) => res.redirect("/api/docs"));
  app.get("/api/openapi.json", (req, res) => res.json(openapiSpec));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec, { customSiteTitle: "ClimaControl API" }));

  // ── Versionamento por URL ──────────────────────────────
  app.use("/api/v1", v1);

  // ── 404 e erros (sempre por último) ────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
