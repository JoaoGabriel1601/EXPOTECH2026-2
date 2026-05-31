import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import YAML from "js-yaml";

import v1 from "./routes/v1/index.js";
import { firebaseReady } from "./config/firebase.js";
import { notFound } from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { requestLogger } from "./middlewares/requestLogger.js";
import { apiLimiter } from "./middlewares/rateLimit.js";

// Contrato = fonte da verdade. Carregado do openapi.yaml em tempo de execução.
const __dirname = dirname(fileURLToPath(import.meta.url));
const OPENAPI_PATH = join(__dirname, "..", "openapi.yaml");
const openapiYaml = readFileSync(OPENAPI_PATH, "utf8");
const openapiSpec = YAML.load(openapiYaml);

export function createApp() {
  const app = express();

  // Atrás do proxy do Render — necessário para req.ip correto (rate limit) e HTTPS.
  app.set("trust proxy", 1);

  // ── Observabilidade ────────────────────────────────────
  app.use(requestLogger);

  // ── Segurança e parsing ────────────────────────────────
  app.use(helmet());
  const origins = (process.env.CORS_ORIGIN || "*").split(",").map((s) => s.trim());
  app.use(cors({ origin: origins.includes("*") ? true : origins }));
  app.use(express.json({ limit: "100kb" }));

  // ── Health check (usado pelo Render) ───────────────────
  app.get("/health", (req, res) => {
    res.json({ status: "ok", firebase: firebaseReady() ? "up" : "down", uptime: process.uptime() });
  });

  // ── Contrato / documentação ────────────────────────────
  app.get("/", (req, res) => res.redirect("/api/docs"));
  app.get("/api/openapi.json", (req, res) => res.json(openapiSpec));
  app.get("/api/openapi.yaml", (req, res) => res.type("text/yaml").send(openapiYaml));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec, { customSiteTitle: "ClimaControl API" }));

  // ── Versionamento por URL (com rate limiting) ──────────
  app.use("/api/v1", apiLimiter, v1);

  // ── 404 e erros (sempre por último) ────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
