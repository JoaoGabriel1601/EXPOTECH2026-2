# ClimaControl API

API REST que serve de **gateway** sobre o Firebase Realtime Database do ClimaControl.
Projeto Integrador — UNIFECAF.

Demonstra na prática: **REST** (recursos), **métodos HTTP**, **status codes**,
**versionamento** (`/api/v1`) e **contrato** (Zod + OpenAPI/Swagger).

## Arquitetura

```
ESP32 ─► [ API REST /api/v1 (Express) ] ─► Firebase RTDB
Web/Mobile ─► [ API REST /api/v1 (Express) ] ◄─┘
```

## Endpoints (v1)

| Método | Rota | Descrição | Sucesso |
|---|---|---|---|
| `GET` | `/api/v1/sensores` | Leitura atual | `200` |
| `PUT` | `/api/v1/sensores` | ESP32 envia leitura completa | `200` |
| `GET` | `/api/v1/controle` | Estado do A/C | `200` |
| `PATCH` | `/api/v1/controle` | Atualização parcial (liga A/C, temp_alvo…) | `200` |
| `GET` | `/api/v1/historico?period=4h&limit=100` | Série temporal | `200` |
| `POST` | `/api/v1/historico` | ESP32 anexa amostra | `201` |
| `GET` | `/api/v1/eventos?limit=50` | Log de eventos | `200` |
| `POST` | `/api/v1/eventos` | Registra evento | `201` |
| `GET` | `/api/docs` | Contrato (Swagger UI) | `200` |
| `GET` | `/health` | Health check | `200` |

Status de erro padronizados: `400` (validação), `404` (não existe),
`422`/`400` (regra de negócio), `500` (bug), `503` (RTDB indisponível).

## Rodar local

```bash
cd api
npm install
cp .env.example .env       # preencha FIREBASE_DATABASE_URL e a credencial
npm run dev                # http://localhost:3001  (docs em /api/docs)
```

### Credencial do Firebase (Admin SDK)

Console Firebase → **Configurações do projeto → Contas de serviço → Gerar nova chave privada**.
Baixa um `.json`. Em dev, aponte para ele:

```bash
# no .env
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
```

> A API sobe **mesmo sem credencial** — só que as rotas de dados respondem `503`.
> Útil para testar `/health`, validações (`400`) e `404` sem Firebase.

## Deploy no Render

1. Suba o repositório no GitHub (a pasta `api/` junto).
2. Render → **New → Blueprint** e aponte para o repo (ele lê o `render.yaml`),
   **ou** **New → Web Service** com: Root Dir `api`, Build `npm install`, Start `npm start`.
3. Em **Environment**, configure:
   - `FIREBASE_DATABASE_URL` = mesma URL do app web
   - `FIREBASE_SERVICE_ACCOUNT` = **JSON inteiro** da conta de serviço, em uma linha
   - `CORS_ORIGIN` = `https://movimenteunifecaf.web.app,http://localhost:5173`
4. Deploy. A URL pública sai como `https://climacontrol-api.onrender.com`.
5. No app web, defina `VITE_API_URL` com essa URL.

> Plano free do Render hiberna após ~15 min ocioso; a 1ª requisição depois disso
> leva ~50s (cold start). Uma chamada a `/health` reativa o serviço.

## Formato de resposta (contrato)

```jsonc
// sucesso
{ "data": { /* ... */ }, "meta": { "version": "v1", "timestamp": 1730000000000 } }
// erro
{ "error": { "code": "VALIDATION_ERROR", "status": 400, "message": "...", "details": [...] },
  "meta": { "version": "v1", "timestamp": 1730000000000 } }
```
