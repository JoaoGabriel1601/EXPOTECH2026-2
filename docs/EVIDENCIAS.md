# Evidências — ClimaControl API (capturadas em produção)

Respostas **reais** da API publicada (`https://climacontrol-api.onrender.com`).
O plano free hiberna após inatividade; uma chamada a `/health` reativa o serviço.

> Os comandos abaixo funcionam em qualquer terminal com `curl`.

---

## 1. Sucesso — leitura (200, envelope `data`/`meta`, `Cache-Control`)

```bash
curl -i https://climacontrol-api.onrender.com/api/v1/controle
```
```
HTTP/2 200
content-type: application/json; charset=utf-8
cache-control: no-store

{"data":{"ac_ligado":true,"atualizado_em":1780179995120,"modo_manual":true,"temp_alvo":22},
 "meta":{"version":"v1","timestamp":1780201827478}}
```
**Mostra:** status 200, envelope padronizado, versionamento (`meta.version`), e `Cache-Control: no-store` (LGPD/dados dinâmicos).

---

## 2. Health check (200)

```bash
curl https://climacontrol-api.onrender.com/health
```
```json
{"status":"ok","firebase":"up","uptime":78.08}
```
**Mostra:** observabilidade básica + dependência (Firebase) saudável.

---

## 3. Coleção paginada (200, `meta.pagination`)

```bash
curl "https://climacontrol-api.onrender.com/api/v1/eventos?limit=2&sort=desc"
```
```json
{"data":[{"id":"-Otuzk...","type":"temp_alvo_manual","timestamp":1780179996158,
          "payload":{"ac_ligado":true,"modo_manual":true,"temp_alvo":22}}],
 "meta":{"version":"v1","timestamp":1780201827,"pagination":{"page":1,"page_size":2,"total":1,"total_pages":1,"has_more":false}}}
```
**Mostra:** paginação (`page`/`page_size`/`total`/`has_more`), ordenação (`sort`).

---

## 4. Autenticação — escrita SEM token (401 + RFC 7807)

```bash
curl -i -X PATCH https://climacontrol-api.onrender.com/api/v1/controle \
  -H 'Content-Type: application/json' -d '{"temp_alvo":22}'
```
```
HTTP/2 401
content-type: application/problem+json; charset=utf-8
www-authenticate: Bearer realm="ClimaControl API"

{"type":"https://climacontrol-api.onrender.com/problems/unauthorized",
 "title":"Autenticação necessária.","status":401,
 "detail":"Token ausente. Envie 'Authorization: Bearer <id_token>'.",
 "instance":"/api/v1/controle"}
```
**Mostra:** OWASP API2 (auth JWT obrigatória na escrita), header `WWW-Authenticate`, erro no padrão **RFC 7807**.

---

## 5. Recurso inexistente (404 + RFC 7807)

```bash
curl https://climacontrol-api.onrender.com/api/v1/inexistente
```
```json
{"type":"https://climacontrol-api.onrender.com/problems/not-found",
 "title":"Recurso não encontrado.","status":404,
 "detail":"Recurso não encontrado: GET /api/v1/inexistente",
 "instance":"/api/v1/inexistente"}
```

---

## 6. Rate limiting — headers `RateLimit-*`

```bash
curl -I https://climacontrol-api.onrender.com/api/v1/sensores
```
```
ratelimit-limit: 120
ratelimit-policy: 120;w=60
ratelimit-remaining: 118
ratelimit-reset: 59
cache-control: no-store
```
**Mostra:** limite de 120 req/min por IP; ao exceder, retorna `429` + `Retry-After` (ver teste automatizado).

---

## 7. Validação de regra de negócio (400) — via Swagger ou com token

A validação roda **após** a autenticação, então pelo `curl` sem token o que se vê é o 401.
Para evidenciar o **400**, use o **Swagger** (`/api/docs` → Authorize com um ID token →
`PATCH /controle` com `{"temp_alvo": 99}`), ou veja o **teste automatizado**
[api/test/api.test.js](../api/test/api.test.js) (`PATCH temp_alvo fora de [16,28] → 400`):

```json
{"type":".../problems/validation-error","title":"Dados de entrada inválidos.","status":400,
 "detail":"Um ou mais campos da requisição são inválidos.","instance":"/api/v1/controle",
 "errors":[{"campo":"temp_alvo","mensagem":"temp_alvo deve ser no máximo 28°C"}]}
```

---

## 8. Contrato e governança (linha de comando, no repositório)

```bash
cd api
npm run lint:openapi   # Spectral valida o openapi.yaml → "No results with a severity of 'error'"
npm test               # 19 testes (vitest + supertest) passam
```
**Mostra:** contrato versionado + governança automática + testes (Crit 2, 5 e 7).

---

### Tabela resumo de status codes

| Cenário | Código | Onde reproduzir |
|---|---|---|
| Leitura ok | `200` | `GET /api/v1/controle` |
| Criação | `201` | `POST /api/v1/eventos` (com token) |
| Remoção | `204` | `DELETE /api/v1/eventos/:id` (com token) |
| Validação | `400` | Swagger `PATCH {temp_alvo:99}` |
| Sem auth | `401` | `PATCH` sem token |
| Não existe | `404` | `GET /api/v1/inexistente` |
| Rate limit | `429` | 121 req/min |
| Dependência fora | `503` | Firebase indisponível |
