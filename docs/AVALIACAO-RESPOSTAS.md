# ECO-API — Respostas ao Guia de Avaliação

**Projeto:** ClimaControl — climatização autônoma (ESP32 + IA) com dashboard e **API REST**.
**Repositório:** https://github.com/JoaoGabriel1601/Projeto-Integrador
**API em produção:** https://climacontrol-api.onrender.com · **Docs:** https://climacontrol-api.onrender.com/api/docs
**Dashboard:** https://movimenteunifecaf.web.app

**Integrantes:**

| Nome | RA |
|---|---|
| Juliana Kelly da Silva | 46684 |
| Gabriel Bezerra Teixeira | 40365 |
| Thiago Nunes da Silva | 38650 |
| Kayc Balbino Rodrigues Siqueira | 66593 |
| Luis Henrique Nunes Brito | 62379 |
| Vinicius Matos Alves | 123418 |
| Nathan Nascimento | 120341 |
| Larry Kristian | 40231 |
| Joao Gabriel Felix Fernandes | 95536 |
| Vitor Hugo da Costa Santos | 93829 |
| Rafael Amorim Delgado da Silva | 93994 |
| Ygor Rodrigues Araujo dos Santos | 62119 |
| Raissa Maria Moreira Cabral | 59049 |

**Vídeo pitch:** https://youtu.be/oI2Qdm9fJbQ

A API é um **contrato**: o ESP32 e o dashboard dependem dela. Tudo abaixo aponta para a
evidência no repositório.

---

## Critério 1 — Arquitetura da API & Protocolos

**Métodos HTTP corretos para cada ação.**
Modelamos recursos (substantivos) com os verbos certos — ver [api/openapi.yaml](../api/openapi.yaml) e [api/src/routes/v1/](../api/src/routes/v1/):

| Recurso | GET | PUT | PATCH | POST | DELETE |
|---|---|---|---|---|---|
| `/api/v1/sensores` | leitura atual | ESP32 envia tudo | — | — | — |
| `/api/v1/controle` | estado do A/C | — | liga/ajusta parcial | — | — |
| `/api/v1/historico` | série (paginada) | — | — | anexa amostra | — |
| `/api/v1/eventos` | log (paginado) | — | — | registra | remove por id |

**Caso real de dúvida POST vs PUT vs PATCH (idempotência):**
- `/sensores` usa **PUT** porque o ESP32 envia o objeto **inteiro** a cada ciclo — repetir o mesmo PUT leva ao mesmo estado (**idempotente**).
- `/controle` usa **PATCH** porque o dashboard mexe só em alguns campos (ex.: `temp_alvo`). Não faria sentido PUT (exigiria reenviar o recurso todo).
- `/eventos` usa **POST** (cria um novo recurso, **não idempotente** — dois POST geram dois eventos) e **DELETE** (idempotente: remover de novo dá 404, sem efeito colateral). Ver [eventos.controller.js](../api/src/controllers/eventos.controller.js).

**Status codes (sucesso e erro):** `200` (leitura/patch), `201` (criado, com header `Location`), `204` (DELETE), `400` (validação), `401` (sem/invalid token), `404` (não existe), `429` (rate limit), `503` (Firebase fora). Centralizados em [errorHandler.js](../api/src/middlewares/errorHandler.js). Isso ajuda o **monitoramento**: pelo código já se sabe se foi erro do cliente (4xx) ou do servidor (5xx) — ver o log estruturado em [requestLogger.js](../api/src/middlewares/requestLogger.js).

**Modelagem de recursos (Nível 2 de Richardson):** URLs são recursos + verbos HTTP + status coerentes. Nenhuma URL é "função" (sem `/criarEvento`); a regra Spectral `path-casing` em [.spectral.yaml](../api/.spectral.yaml) **bloqueia** camelCase em path (evita RPC disfarçado).

**Versionamento:** por **URL** (`/api/v1`). Escolhido pela clareza e por ser explícito no Swagger. Uma mudança incompatível (ex.: renomear `temp_alvo`) sairia em `/api/v2`, mantendo `/v1` no ar — quem usa a v1 não quebra.

**Contrato formalizado (design-first):** o [openapi.yaml](../api/openapi.yaml) é a **fonte da verdade** — a aplicação o carrega em runtime ([app.js](../api/src/app.js)) e serve em `/api/docs`. Decisão discutida antes de codar: PATCH (parcial) vs PUT (total) em `/controle` — escolhemos PATCH (prós: payload menor, semântica de "mudar um pedaço"; contra: não idempotente como o PUT).

**Falha parcial:** se o Firebase cair, respondemos `503` em **RFC 7807** (`application/problem+json`) com `Retry-After` ausente mas mensagem clara. Temos **timeout** (5s) e **circuit breaker** (abre após 5 falhas) em [config/firebase.js → `dbOp`](../api/src/config/firebase.js) + [utils/timeout.js](../api/src/utils/timeout.js).

---

## Critério 2 — DX & Documentação

**OpenAPI como fonte da verdade:** [openapi.yaml](../api/openapi.yaml) é carregado pelo código e validado no CI pelo Spectral. Onde contrato e código poderiam divergir: declaramos `bearerAuth` no contrato (design-first) **antes** de implementar a auth; depois a implementamos em [auth.js](../api/src/middlewares/auth.js), eliminando a divergência.

**Primeira chamada bem-sucedida (TTFC):** no Swagger (`/api/docs`), um dev:
1. Faz `GET /api/v1/sensores` (público) → vê `200` sem precisar de token.
2. Para escrever, clica em **Authorize**, cola um ID token do Firebase, e faz `PATCH /api/v1/controle`.
Exemplos de request/response e erros estão embutidos no contrato (`examples:` no `PATCH /controle`).

**Endpoint crítico no Nível 2 (`PATCH /api/v1/controle`):** recurso (`controle`), verbo correto (PATCH = parcial), status coerentes (`200/400/401/429/503`), regra de negócio (`temp_alvo` 16–28) validada — ver [controle.schema.js](../api/src/schemas/controle.schema.js).

**Padrão de erro (RFC 7807):** todas as respostas de erro são `application/problem+json` com `type/title/status/detail/instance` + extensão `errors`. Ver [utils/respond.js](../api/src/utils/respond.js). Diferença demonstrada:
- **erro do cliente** → `400` (corpo inválido, ex.: falta `type`);
- **regra de negócio** → `400` com `errors[].campo` (ex.: `temp_alvo` fora de 16–28);
- **erro técnico** → `503` (Firebase indisponível).

**Paginação, filtros e ordenação:** `page`/`limit` (com **máximo 100**) + `sort` + filtro `type` — ver [pagination.js](../api/src/utils/pagination.js), [historico.schema.js](../api/src/schemas/historico.schema.js) e [eventos.schema.js](../api/src/schemas/eventos.schema.js). Escolhemos **page/limit** (em vez de cursor) por simplicidade, já que os conjuntos são pequenos e limitados no tempo; o trade-off (cursor evita "saltos" em inserções) está documentado no próprio `pagination.js`.

**Governança do contrato (Spectral):** [.spectral.yaml](../api/.spectral.yaml) estende `spectral:oas` e adiciona regras próprias (`operation-operationId`, `path-casing` anti-RPC, exigir `problem+json` em 4xx/5xx). **Caso real:** o Spectral pegou 7 operações sem `description` — corrigimos todas; e a regra `path-casing` é `error`, bloqueando no CI qualquer URL camelCase.

---

## Critério 3 — Segurança

**BOLA (API1:2023):** a API **não tem recursos por-usuário** (sensores/controle são do prédio, não de uma pessoa), então o cenário clássico de "trocar o `:id` na URL para ver dado alheio" **não se aplica** — não há `/usuarios/:id`. Mesmo assim, registramos **quem** fez cada mudança (`por: req.user.uid`) em [controle.controller.js](../api/src/controllers/controle.controller.js) para auditoria.

**Autenticação (API2:2023):** escritas exigem **ID token JWT do Firebase**, validado com `verifyIdToken` (assinatura, expiração, `iss`, `aud`) em [auth.js](../api/src/middlewares/auth.js). Sem token → `401` + `WWW-Authenticate`. Token inválido → `401`. O dashboard anexa o token automaticamente em [apiClient.js](../src/services/apiClient.js). Trade-off: o ID token do Firebase dura ~1h e é renovado pelo SDK no cliente — bom equilíbrio entre segurança e comodidade.

**Validação de entrada (API4:2023):** todo corpo/query passa por **Zod** ([schemas/](../api/src/schemas/)) com limites e defaults (`limit` máx 100, `temp_alvo` 16–28, enums de `period`/`sort`). Valor inválido → `400` listando os campos.

**Rate Limiting:** 120 req/min por IP, `429` + `Retry-After` + headers `RateLimit-*` — ver [rateLimit.js](../api/src/middlewares/rateLimit.js). Contado por IP (store em memória; em produção multi-instância iria para Redis).

**Cache e LGPD:** todas as rotas de dados usam `Cache-Control: no-store` ([routes/v1/index.js](../api/src/routes/v1/index.js)). Motivo: os dados são dinâmicos e a **ocupação** é potencialmente sensível — cache público (`max-age`) arriscaria expor/servir dado pessoal desatualizado a outro usuário/proxy.

**BOPLA (API3:2023):** evitamos overexposure/mass assignment porque o Zod só aceita os campos previstos (qualquer campo extra é ignorado) e as respostas montam objetos explícitos — não devolvemos o documento bruto do banco. Ver os controllers em [controllers/](../api/src/controllers/).

---

## Critério 4 — Performance & Resiliência

**Paginação como proteção:** `limit` tem teto de **100** ([pagination.js](../api/src/utils/pagination.js)) — impede um cliente de pedir milhares de registros de uma vez e sobrecarregar o banco/rede.

**Cache x privacidade:** optamos por `no-store` em tudo (dados de telemetria/ocupação). O ganho de velocidade do cache não compensa o risco de servir dado pessoal/desatualizado.

**Rate limiting (performance):** o `429` + `Retry-After` protege a API de abuso/loop de cliente; tecnicamente via `express-rate-limit` ([rateLimit.js](../api/src/middlewares/rateLimit.js)).

**Throttling por concorrência / degradação controlada:** o **circuit breaker** em [dbOp](../api/src/config/firebase.js) faz a API degradar com elegância — quando o Firebase falha repetidamente, ela responde `503` rápido (circuito aberto) por 30s em vez de empilhar requisições penduradas. _Throttling por semáforo de operações caras: planejado (não há operação cara hoje)._

**Idempotência em retries:** `GET/PUT/PATCH/DELETE` são idempotentes por design. `POST /eventos` não é; um **idempotency-key** seria o próximo passo se precisássemos de retries seguros em criação — _planejado._

**Observabilidade:** log estruturado JSON por request (método, rota, status, latência, uid) em [requestLogger.js](../api/src/middlewares/requestLogger.js). **LGPD:** não logamos query string nem corpo (evita PII), só o caminho. Métricas-chave para decidir escalar/ajustar: taxa de 5xx, latência, contagem de 429.

---

## Critério 5 — Ciclo de Vida, Operação & Governança

**Testes no CI/CD:** [.github/workflows/api-ci.yml](../.github/workflows/api-ci.yml) roda, a cada push/PR, o **Spectral** (lint do contrato) e os **testes** ([api/test/api.test.js](../api/test/api.test.js), 19 casos). Qualquer falha **bloqueia** o merge. Ex. de falha que bloquearia: uma URL camelCase reprova na regra `path-casing` (severity error) do Spectral.

**Versionamento na prática:** `/v1` na URL. Breaking change (ex.: renomear campo) → nova versão `/v2`, com `/v1` mantida até a migração dos clientes.

**Plano de depreciação:** ao aposentar um endpoint, enviaríamos header `Deprecation: true` + `Sunset: <data>` e um aviso na descrição do OpenAPI, monitorando o uso (via logs por rota) até zerar antes de remover. _Plano._

**Observabilidade e SLO:** métricas essenciais = erro (5xx), latência, volume por endpoint. SLO proposto: **99% das respostas < 300ms** e disponibilidade 99% (medível pelos logs + health check `/health`). _Plano + base implementada (logs/health)._

**API Gateway e BFF:** a nossa API **já é um BFF/Gateway** sobre o Firebase — concentra auth, rate limiting, validação e o contrato, e expõe ao front um formato sob medida (envelope `data/meta`). Num gateway dedicado ficariam auth/rate limit/roteamento; a lógica de negócio (regra `temp_alvo`, auditoria) fica no BFF.

**Consumer-Driven Contracts (Pact):** _plano._ O front publicaria um contrato (expectativas) num Pact Broker; o `can-i-deploy` no pipeline impediria subir a API se quebrasse o contrato do consumidor — permitindo front e API evoluírem independentes.

---

## Critério 6 — Integração multidisciplinar (≥3 áreas)

Quatro áreas integradas, cada uma com contribuição concreta:

1. **Engenharia de Software** — a API REST ([api/](../api/)), o dashboard React ([src/](../src/)), testes e CI/CD.
2. **Eletrônica / Física aplicada** — o firmware ESP32 ([firmware/climacontrol/](../firmware/climacontrol/)): leitura de sensores (DHT11, TCRT5000), emissão IR para o A/C, e a **termodinâmica** que relaciona ocupação + calor externo à temperatura-alvo.
3. **IA / Pesquisa Operacional** — o modelo que **otimiza** a temperatura-alvo conforme ocupação e temperatura externa ([src/ai/](../src/ai/)): rede treinada + regras, com o objetivo de conforto × consumo.
4. **UX/UI** — o design do dashboard (fluxo de login, painéis, gráficos, tema claro/escuro) em [src/components/](../src/components/) e [src/styles/](../src/styles/).

---

## Critério 7 — Protótipo funcional & Repositório

- **Código no GitHub:** https://github.com/JoaoGabriel1601/Projeto-Integrador (público).
- **Testes:** [api/test/api.test.js](../api/test/api.test.js) (19, rodando no CI) + testes do front ([src/**/*.test.js](../src/)).
- **README:** [api/README.md](../api/README.md) explica o que é e como rodar; raiz em [README.md](../README.md).
- **Prova de conceito rodando:** API em produção respondendo de verdade — `GET https://climacontrol-api.onrender.com/api/v1/controle` → `200`. Dashboard em https://movimenteunifecaf.web.app.

---

## Checklist de entrega (referência)

| Item | Onde |
|---|---|
| openapi.yaml atualizado | [api/openapi.yaml](../api/openapi.yaml) |
| Swagger UI funcionando | https://climacontrol-api.onrender.com/api/docs |
| Métodos + status corretos | [routes/v1/](../api/src/routes/v1/) + [errorHandler.js](../api/src/middlewares/errorHandler.js) |
| Versionamento /v1 | [app.js](../api/src/app.js) |
| RFC 7807 | [respond.js](../api/src/utils/respond.js) |
| Auth por token + auditoria | [auth.js](../api/src/middlewares/auth.js) |
| Rate limiting 429/Retry-After | [rateLimit.js](../api/src/middlewares/rateLimit.js) |
| Paginação com máximo | [pagination.js](../api/src/utils/pagination.js) |
| Cache-Control no-store | [routes/v1/index.js](../api/src/routes/v1/index.js) |
| Testes + CI | [api/test/](../api/test/) + [api-ci.yml](../.github/workflows/api-ci.yml) |
| ≥3 áreas | Critério 6 acima |
