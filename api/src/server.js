import "dotenv/config";
import { createApp } from "./app.js";

const PORT = process.env.PORT || 3001;
const app = createApp();

const server = app.listen(PORT, () => {
  console.info(`[server] ClimaControl API ouvindo em http://localhost:${PORT}`);
  console.info(`[server] Docs: http://localhost:${PORT}/api/docs`);
});

// Encerramento gracioso (Render envia SIGTERM ao redeployar).
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    console.info(`[server] ${sig} recebido, encerrando…`);
    server.close(() => process.exit(0));
  });
}
