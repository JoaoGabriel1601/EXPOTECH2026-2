# Roteiro de Apresentação — API REST do ClimaControl

Guia passo a passo para demonstrar a API na banca do Projeto Integrador.
Cobre os **5 conceitos** exigidos: REST, métodos HTTP, status codes, versionamento e contratos.

---

## 0. Antes de começar (preparação)

```bash
# Terminal 1 — API
cd api
npm install        # só na primeira vez
npm run dev        # sobe em http://localhost:3001

# Terminal 2 — Dashboard (use Node 22)
nvm use            # lê o .nvmrc (Node 22)
npm run dev        # sobe em http://localhost:5173
```

Checklist:
- [ ] `api/.env` preenchido (`FIREBASE_DATABASE_URL` + `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json`)
- [ ] `api/serviceAccount.json` presente
- [ ] No `.env` do dashboard: `VITE_API_URL=http://localhost:3001` e `VITE_USE_MOCK_DATA=false`
- [ ] Abrir 3 abas: dashboard (`5173`), Swagger (`localhost:3001/api/docs`), e o navegador com **DevTools → Network**

> Se estiver usando o Render em vez de local, troque `VITE_API_URL` pela URL do Render e abra `/health` 1 min antes para "acordar" o serviço.

---

## 1. Abertura — a arquitetura (1 min)

> "O ClimaControl tem ESP32, dashboard web e app mobile. Antes, os três falavam
> direto com o Firebase, cada um conhecendo o formato dos dados. Criamos uma
> **API REST** que centraliza esse contrato e fica entre os clientes e o banco."

```
ESP32 ─► [ API REST /api/v1 (Express) ] ─► Firebase RTDB
Web/Mobile ─► [ API REST /api/v1 ] ◄─┘
```

---

## 2. REST — recursos (1 min)

Abra `http://localhost:3001/api/v1` e mostre o índice:

> "REST organiza tudo em **recursos** (substantivos), não ações. Temos 4 recursos:
> `sensores`, `controle`, `historico` e `eventos` — cada um com sua URL."

| Recurso | URL | Tipo |
|---|---|---|
| Leitura atual | `/api/v1/sensores` | singleton |
| Controle do A/C | `/api/v1/controle` | singleton |
| Histórico | `/api/v1/historico` | coleção |
| Eventos | `/api/v1/eventos` | coleção |

---

## 3. Métodos HTTP + Status Codes (3 min) — o ponto alto

Abra o **Swagger** (`/api/docs`) e demonstre ao vivo com o botão "Try it out".

### a) GET — leitura → `200`
`GET /api/v1/historico?period=1h&limit=5` → **200 OK** com a lista.

### b) PATCH — atualização parcial → `200`
`PATCH /api/v1/controle` com:
```json
{ "ac_ligado": true, "temp_alvo": 22 }
```
→ **200 OK**.
> "Usamos **PATCH** porque o cliente manda só os campos que mudaram, não o objeto inteiro."

### c) POST — criação → `201`
`POST /api/v1/eventos` com `{ "type": "teste_apresentacao" }` → **201 Created**.
> "POST cria um novo item numa coleção; o status correto de criação é **201**, não 200."

### d) Erros — mostre que a API valida (o que mais impressiona)

| Requisição | Status | Por quê |
|---|---|---|
| `PATCH /controle {"temp_alvo": 99}` | **400** | regra de negócio: alvo só 16–28°C |
| `PATCH /controle {}` | **400** | precisa de ao menos 1 campo |
| `POST /eventos {}` (sem `type`) | **400** | campo obrigatório |
| `GET /sensores` com Firebase fora | **503** | serviço indisponível |
| `GET /api/v1/qualquer-coisa` | **404** | recurso não existe |

> "Cada situação tem o **status code** certo: 4xx é erro do cliente, 5xx é do servidor.
> Isso é o que diferencia uma API bem feita."

---

## 4. Versionamento (30 s)

> "Toda rota vive sob **`/api/v1`**. Se um dia mudarmos o contrato de forma
> incompatível, criamos `/api/v2` sem quebrar quem usa a v1. O número da versão
> também volta em todo `meta.version` da resposta."

Mostre na URL: `/api/v1/sensores` e o campo `"version": "v1"` em qualquer resposta.

---

## 5. Contrato (1 min)

Mostre o Swagger (`/api/docs`) inteiro:

> "O **contrato** é o documento que diz exatamente o que cada rota aceita e devolve.
> Aqui ele é gerado em **OpenAPI 3.1** e validado na entrada com **Zod** — se o cliente
> mandar algo fora do contrato, a API recusa com 400 antes de tocar no banco."

Aponte também o **envelope padrão** de resposta:
```jsonc
{ "data": { ... }, "meta": { "version": "v1", "timestamp": 1730000000000 } }   // sucesso
{ "error": { "code": "VALIDATION_ERROR", "status": 400, "message": "...", "details": [...] } } // erro
```

---

## 6. Integração com o dashboard (1 min) — o fecho

No dashboard (`localhost:5173`), com o **Network** aberto:

1. Clique em **Ligar / Desligar** ou ajuste a **temperatura**.
2. Mostre a requisição `PATCH http://localhost:3001/api/v1/controle` aparecendo no Network → **200**.
3. Mostre o evento aparecendo no painel de eventos (registrado pela própria API).

> "Quando o usuário clica, o dashboard não fala mais direto com o Firebase —
> ele chama a **nossa API REST**, que valida, grava e registra o evento. As leituras
> em tempo real continuam direto no Firebase, porque REST é requisição/resposta e
> não faz streaming."

---

## Perguntas prováveis da banca (cole de respostas)

- **Por que não usar a REST nativa do Firebase?** Ela é automática — não dá pra
  desenhar métodos, status codes, versão nem validação. A nossa demonstra os conceitos.
- **Por que PATCH e não PUT no controle?** PUT substitui o recurso inteiro; PATCH
  atualiza parcialmente, que é o caso (mudar só `temp_alvo`, por ex.).
- **Por que 201 no POST e 200 no GET/PATCH?** 201 = "criado um recurso novo";
  200 = "sucesso, aqui está o resultado".
- **O que é 422 vs 400?** Ambos erro do cliente; usamos 400 para entrada inválida.
  422 seria para algo sintaticamente válido mas que viola regra de negócio (citável como evolução).
- **Como versiona?** Por URL (`/api/v1`). Alternativas: header `Accept` ou query `?version=`.
- **Onde roda?** Node.js + Express, hospedado no Render (grátis), banco no Firebase.
```
