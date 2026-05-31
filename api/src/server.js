import "dotenv/config";
import { createApp } from "./app.js";

const PORT = process.env.PORT || 3001;
// Bind explícito em 0.0.0.0 (todas as interfaces IPv4). Sem o host, o Node
// escuta só em IPv6 `::`, e a malha de roteamento do Render conecta via IPv4 —
// o que causa `x-render-routing: no-server` em parte das requisições.
const HOST = process.env.HOST || "0.0.0.0";
const app = createApp();

const server = app.listen(PORT, HOST, () => {
  console.info(`[server] ClimaControl API ouvindo em ${HOST}:${PORT}`);
  console.info(`[server] Docs: http://localhost:${PORT}/api/docs`);
});

// Encerramento gracioso (Render envia SIGTERM ao redeployar).
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    console.info(`[server] ${sig} recebido, encerrando…`);
    server.close(() => process.exit(0));
  });
}
