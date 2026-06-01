<div align="center">

<br/><br/><br/>

# ClimaControl

## Documentação Técnica Completa

### Sistema de Climatização Autônoma
#### ESP32 · IA · API REST · Dashboard Web · App Android

<br/>

**Projeto Integrador — UNIFECAF**

<br/><br/>

| | |
|---|---|
| **Nome do projeto** | ClimaControl |
| **Instituição** | UNIFECAF |
| **Versão deste documento** | 1.0 |
| **Repositório** | https://github.com/JoaoGabriel1601/Projeto-Integrador |
| **Dashboard (produção)** | https://movimenteunifecaf.web.app |
| **API REST (produção)** | https://climacontrol-api.onrender.com |
| **Documentação da API (Swagger)** | https://climacontrol-api.onrender.com/api/docs |
| **Integrantes** | _(preencher)_ |
| **Vídeo pitch** | _(preencher)_ |

<br/><br/><br/>

</div>

<div style="page-break-after: always;"></div>

## Sumário

1. [Resumo executivo](#1-resumo-executivo)
2. [Contexto, problema e objetivos](#2-contexto-problema-e-objetivos)
3. [Visão geral da arquitetura](#3-visão-geral-da-arquitetura)
4. [Stack tecnológica](#4-stack-tecnológica)
5. [Estrutura do monorepo](#5-estrutura-do-monorepo)
6. [Modelo de dados (Firebase Realtime Database)](#6-modelo-de-dados-firebase-realtime-database)
7. [Regras de climatização](#7-regras-de-climatização)
8. [Componente A — Firmware ESP32](#8-componente-a--firmware-esp32)
9. [Componente B — API REST](#9-componente-b--api-rest)
10. [Componente C — Modelo de Inteligência Artificial](#10-componente-c--modelo-de-inteligência-artificial)
11. [Componente D — Dashboard Web (React)](#11-componente-d--dashboard-web-react)
12. [Componente E — Aplicativo Mobile (Android)](#12-componente-e--aplicativo-mobile-android)
13. [Fluxos de dados ponta a ponta](#13-fluxos-de-dados-ponta-a-ponta)
14. [Configuração e variáveis de ambiente](#14-configuração-e-variáveis-de-ambiente)
15. [Como executar (passo a passo)](#15-como-executar-passo-a-passo)
16. [Deploy / publicação](#16-deploy--publicação)
17. [Segurança](#17-segurança)
18. [Testes, qualidade e CI/CD](#18-testes-qualidade-e-cicd)
19. [Integração multidisciplinar](#19-integração-multidisciplinar)
20. [Glossário](#20-glossário)
21. [Apêndices](#21-apêndices)

<div style="page-break-after: always;"></div>

## 1. Resumo executivo

O **ClimaControl** é um sistema de **climatização autônoma** para ambientes coletivos (salas de aula, escritórios). Ele mede em tempo real a **ocupação** (número de pessoas), a **temperatura interna e externa** e a **umidade**, e calcula automaticamente a **temperatura-alvo ideal** do ar-condicionado conforme a quantidade de pessoas e o calor externo — economizando energia ao evitar que o A/C opere no mesmo set-point com 2 ou com 40 pessoas.

O projeto é um **monorepo** com **cinco frentes** que se comunicam através do **Firebase Realtime Database** e de uma **API REST** própria:

| Frente | O que faz | Tecnologia | Pasta |
|---|---|---|---|
| 🔌 **Firmware** | Lê sensores, conta pessoas, comanda o A/C por IR e publica os dados | ESP32 + Arduino/PlatformIO | `firmware/` |
| 🌐 **API REST** | Gateway/BFF sobre o Firebase: contrato, auth, validação, rate limit | Node.js + Express | `api/` |
| 🧠 **IA** | Rede neural que prevê a temperatura-alvo ideal | TensorFlow.js (treino) + JS puro (inferência) | `src/ai/` |
| 💻 **Dashboard Web** | Monitoramento em tempo real, controle manual, gráficos, PDF | React 19 + Vite | `src/` |
| 📱 **App Android** | Mesmo dashboard, nativo, com biometria, push e OTA | Expo + React Native | `mobile/` |

**Conceito central:** a **API REST é o contrato** do sistema. ESP32, dashboard e app dependem dela; ela centraliza autenticação, validação, versionamento e o formato dos dados.

<div style="page-break-after: always;"></div>

## 2. Contexto, problema e objetivos

### 2.1. Problema

Ambientes climatizados desperdiçam energia porque o ar-condicionado costuma operar com um **set-point fixo**, independentemente de quantas pessoas estão na sala ou do calor externo. Uma sala com 2 pessoas e outra com 40 recebem o mesmo tratamento; o A/C continua ligado em ambientes vazios.

### 2.2. Solução proposta

Um controle que **reage à realidade da sala**:

- Conta pessoas entrando/saindo (sensores ultrassônicos direcionais).
- Mede temperatura e umidade interna/externa.
- Calcula a temperatura-alvo ideal por **regra determinística** e por **modelo de IA**.
- Comanda o A/C via **LED infravermelho** (emula o controle remoto).
- Expõe tudo num **dashboard web/mobile** com controle manual e histórico.

### 2.3. Objetivos

- **Eficiência energética:** desligar/ajustar o A/C conforme a ocupação real.
- **Conforto:** manter temperatura adequada ao número de pessoas e ao calor externo.
- **Transparência:** dashboard em tempo real, histórico e log de eventos auditável.
- **Boas práticas de engenharia:** API REST versionada e documentada, testes, CI/CD, segurança (OWASP/LGPD).
- **Integração multidisciplinar:** eletrônica, IA/pesquisa operacional, engenharia de software e UX.

<div style="page-break-after: always;"></div>

## 3. Visão geral da arquitetura

### 3.1. Diagrama de alto nível

```
                          ┌───────────────────────────┐
   IR  ◄─────────────────┤  ESP32 (firmware/)          │
 (A/C)                   │  • 3x DHT11  • 2x HC-SR04   │
                         │  • regra climate.h          │
                         └──────────┬────────────┬─────┘
                  escreve /sensores │            │ ouve /controle (stream)
                       /historico   ▼            ▲
                         ┌──────────────────────────────┐
                         │  Firebase Realtime Database   │
                         │  /sensores /controle          │
                         │  /historico /eventos /ia      │
                         └───▲────────────▲─────────┬────┘
        leitura realtime     │            │         │ lê/escreve (Admin SDK)
                  ┌──────────┘            │         │
                  │            escritas   │    ┌────┴───────────────┐
        ┌─────────┴─────────┐  controle   │    │ API REST (api/)    │
        │ Dashboard Web      │ ───────────┼──► │ Express /api/v1    │
        │ (React, src/)      │            │    │ auth·validação·    │
        ├────────────────────┤            │    │ rate limit·docs    │
        │ App Android         │ ──────────┘    └────────────────────┘
        │ (Expo, mobile/)     │  PATCH /controle
        └─────────────────────┘
        (a IA roda dentro do cliente Web/Mobile — inferência local)
```

**Resumo dos fluxos:**

| Origem | Destino | O que trafega |
|---|---|---|
| ESP32 | Firebase | escreve `/sensores`, `/historico`, `/eventos` |
| ESP32 | Firebase | escuta `/controle` (stream, tempo real) |
| Dashboard/App | Firebase | leitura em tempo real (`/sensores`, `/historico`) |
| Dashboard/App | API REST | escritas de controle (`PATCH /controle`) |
| API REST | Firebase | lê/escreve via Admin SDK |
| IA | — | roda **dentro** do cliente Web/Mobile (inferência local) |

### 3.2. Princípios de design

- **Desacoplamento auth × dados:** o login sempre usa Firebase Auth quando configurado; os dados podem vir do banco real ou de um mock — eixos independentes.
- **Migração incremental:** o dashboard funciona com escrita direta no Firebase **ou** via API REST (decidido por uma variável de ambiente), sem reescrever o front.
- **Contrato como fonte da verdade:** o `openapi.yaml` é carregado pela API em tempo de execução e validado no CI.
- **Lógica compartilhada:** regra de climatização, mock e IA existem em uma forma canônica e são replicados (web ↔ mobile) com verificação automática de sincronia.

<div style="page-break-after: always;"></div>

## 4. Stack tecnológica

### 4.1. Por camada

| Camada | Tecnologia | Versão | Onde |
|---|---|---|---|
| **Hardware** | ESP32 DevKit v1, DHT11, HC-SR04, LED IR | — | `firmware/` |
| **Firmware** | Arduino framework, PlatformIO, Wokwi (simulação) | Espressif32 | `firmware/climacontrol/` |
| **Backend de dados** | Firebase Realtime Database | — | Cloud |
| **API REST** | Node.js + Express | Express 4.21, Node ≥20 (Render: 22) | `api/` |
| **Validação** | Zod | 3.24 | `api/src/schemas/` |
| **Documentação API** | OpenAPI 3.1 + Swagger UI | — | `api/openapi.yaml` |
| **Segurança API** | Helmet, CORS, express-rate-limit, firebase-admin | — | `api/src/middlewares/` |
| **IA (treino)** | TensorFlow.js Node | 4.22 | `src/ai/trainModel.js` |
| **IA (inferência)** | JavaScript puro (sem dependência em runtime) | — | `src/ai/pureInference.js` |
| **Web** | React + Vite | React 19.2, Vite 8 | `src/` |
| **Gráficos web** | Recharts | 3.8 | `src/components/charts/` |
| **PDF** | jsPDF + jspdf-autotable | 4.2 / 5.0 | `src/utils/pdfExport.js` |
| **Mobile** | Expo SDK + React Native | SDK 52, RN 0.76.9 | `mobile/` |
| **Gráficos mobile** | Victory Native + Skia | 41 / 1.5 | `mobile/src/components/charts/` |
| **Hospedagem web** | Firebase Hosting | — | `firebase.json` |
| **Hospedagem API** | Render (plano free) | — | `api/render.yaml` |
| **Build mobile** | EAS Build + Updates (OTA) | — | `mobile/eas.json` |
| **CI** | GitHub Actions | — | `.github/workflows/api-ci.yml` |
| **Lint** | ESLint 9, Spectral (contrato OpenAPI) | — | `eslint.config.js`, `api/.spectral.yaml` |
| **Git hooks** | Husky + lint-staged | 9.1 / 16.4 | `.husky/` |
| **Testes** | Vitest + Supertest | 2.1 / 7.0 | `api/test/`, `src/**/*.test.js` |

### 4.2. Versão do Node

O arquivo [`.nvmrc`](../.nvmrc) fixa **Node 22**. Use `nvm use` antes de buildar o web ou rodar a API localmente.

<div style="page-break-after: always;"></div>

## 5. Estrutura do monorepo

```
Projeto Integrador/
├── README.md                 → visão geral (web)
├── package.json              → web (React + Vite)
├── vite.config.js            → bundler (sourcemap on)
├── eslint.config.js          → lint (ignora mobile/ e api/)
├── index.html                → entry HTML do dashboard
├── firebase.json             → Firebase Hosting (public: dist, SPA rewrites)
├── .firebaserc               → projeto Firebase: movimenteunifecaf
├── .nvmrc                    → Node 22
├── .gitattributes            → normaliza fins de linha (LF)
├── .env.example              → variáveis do WEB (prefixo VITE_)
│
├── src/                      → ░░ DASHBOARD WEB (React 19) ░░
│   ├── main.jsx              → entry point
│   ├── App.jsx               → composição do dashboard
│   ├── config/firebase.js    → inicialização Firebase (mock vs real)
│   ├── components/           → UI (cards, header, login, painéis…)
│   │   └── charts/           → 5 gráficos Recharts
│   ├── hooks/                → useSensorData, useAuth, useClimateAI, useEventLog
│   ├── services/apiClient.js → cliente HTTP da API REST
│   ├── ai/                   → pipeline de IA (treino + inferência)
│   ├── utils/                → mockData, pdfExport
│   ├── constants/index.js    → regras, cores, thresholds (CANÔNICO)
│   └── styles/               → CSS (tema claro/escuro)
│
├── api/                      → ░░ API REST (Express) ░░
│   ├── openapi.yaml          → contrato (fonte da verdade)
│   ├── .spectral.yaml        → governança do contrato
│   ├── render.yaml           → blueprint de deploy (Render)
│   ├── .env.example          → variáveis da API (segredos, sem prefixo)
│   ├── src/
│   │   ├── server.js         → bootstrap (porta, host, shutdown)
│   │   ├── app.js            → montagem do Express
│   │   ├── config/firebase.js→ Admin SDK + circuit breaker
│   │   ├── routes/v1/        → rotas por recurso
│   │   ├── controllers/      → lógica de cada recurso
│   │   ├── schemas/          → validação Zod
│   │   ├── middlewares/      → auth, validate, rateLimit, errorHandler, logger
│   │   └── utils/            → respond, pagination, timeout
│   └── test/                 → 19 testes (vitest + supertest + fake Firebase)
│
├── mobile/                   → ░░ APP ANDROID (Expo) ░░
│   ├── App.jsx               → providers globais (tema, auth)
│   ├── app.json              → config Expo (ícones, permissões, OTA)
│   ├── eas.json              → perfis de build (apk/aab)
│   ├── .env.example          → variáveis do mobile (prefixo EXPO_PUBLIC_)
│   └── src/
│       ├── navigation/       → stack Login ↔ Dashboard
│       ├── screens/          → LoginScreen, DashboardScreen
│       ├── components/       → UI nativa + charts (Victory/Skia)
│       ├── hooks/            → +useBiometric, useNotifications, useOtaUpdate
│       ├── contexts/         → AuthContext, ThemeContext
│       ├── config/firebase.js→ Firebase via Expo Constants
│       ├── ai/               → cópia da inferência (compartilhada)
│       ├── constants/        → cópia (compartilhada)
│       └── utils/            → cópia mockData + theme + chartFont
│
├── firmware/climacontrol/    → ░░ FIRMWARE ESP32 ░░
│   ├── climacontrol.ino      → setup/loop principal
│   ├── config.h              → credenciais + pinagem + tempos
│   ├── climate.h             → regra de climatização (porta C++)
│   ├── sensors.{h,cpp}        → DHT + contagem HC-SR04
│   ├── ir_ac.{h,cpp}          → comando IR do A/C
│   ├── platformio.ini        → build (esp32dev / wokwi)
│   ├── wokwi.toml            → simulador
│   └── diagram.json          → esquema de ligações (Wokwi)
│
├── public/                   → estáticos + modelo de IA exportado
│   ├── ai-model/             → model.json, weights.bin, normalization.json
│   ├── manifest.webmanifest  → PWA
│   ├── sw.js                 → service worker (PWA)
│   └── *.svg                 → logos/ícones
│
├── scripts/check-shared-sync.mjs → garante web ↔ mobile idênticos
├── docs/                     → documentação (este arquivo está aqui)
└── .github/workflows/api-ci.yml → CI da API
```

### 5.1. Lógica compartilhada entre web e mobile

Como o Metro (bundler do Expo) não resolve arquivos fora de `mobile/`, cinco módulos de **lógica pura** são mantidos como **cópias byte-a-byte**. O script [`scripts/check-shared-sync.mjs`](../scripts/check-shared-sync.mjs) (`npm run check:sync`) falha (exit 1) se as cópias divergirem:

| Arquivo web | Cópia mobile |
|---|---|
| `src/constants/index.js` | `mobile/src/constants/index.js` |
| `src/utils/mockData.js` | `mobile/src/utils/mockData.js` |
| `src/ai/pureInference.js` | `mobile/src/ai/pureInference.js` |
| `src/ai/modelWeights.js` | `mobile/src/ai/modelWeights.js` |
| `src/ai/climateAI.js` | `mobile/src/ai/climateAI.js` |

<div style="page-break-after: always;"></div>

## 6. Modelo de dados (Firebase Realtime Database)

O Realtime Database é o ponto de encontro de todas as frentes. Estrutura:

```jsonc
{
  "sensores": {                  // SINGLETON — leitura corrente (escrita pelo ESP32 / API)
    "ocupacao": 12,              // nº de pessoas na sala
    "temp_interna": 22.4,        // °C (média dos 2 DHT11 internos)
    "temp_externa": 31.2,        // °C (DHT11 externo)
    "temp_alvo": 21,             // °C calculado (set-point do A/C)
    "umid_interna": 55,          // %
    "umid_externa": 68,          // %
    "ac_ligado": true,
    "modo_manual": false,
    "atualizado_em": 1780179995120,
    "temp_alvo_ia": 21,          // (opcional) alvo sugerido pela IA
    "ia_ativa": true             // (opcional) IA no comando
  },

  "controle": {                  // SINGLETON — intenção do usuário/IA (escrita pelo dashboard/API)
    "ac_ligado": true,
    "modo_manual": false,
    "temp_alvo": 22,
    "ia_ativa": true,
    "atualizado_em": 1780179995120
  },

  "historico": {                 // COLEÇÃO — série temporal (push a cada 60s pelo ESP32)
    "<pushId>": {
      "t": 1714000000000,        // timestamp ms
      "o": 12,                   // ocupação
      "ti": 22.4,                // temp interna
      "te": 31.2,                // temp externa
      "ta": 21,                  // temp alvo
      "ui": 55,                  // umidade interna
      "ue": 68                   // umidade externa
    }
  },

  "eventos": {                   // COLEÇÃO — log de auditoria
    "<pushId>": {
      "type": "ac_ligado_manual",
      "timestamp": 1714000000000,
      "payload": { "temp": 22 },
      "por": "<uid do usuário>"  // quem fez a ação (auditoria)
    }
  },

  "ia": {                        // metadados da IA (escrito pelo dashboard)
    "modelo_versao": "1.0.0",
    "ultimo_ajuste": {
      "timestamp": 1714000000000,
      "inputs": { "pessoas": 12, "temp_interna": 22.4, "temp_externa": 31.2 },
      "output": { "temp_alvo": 21 },
      "regra_fixa_seria": 22,    // o que a regra determinística daria
      "diferenca": -1,
      "confianca": "high"
    }
  }
}
```

### 6.1. Relacionamento entre os nós

```
   ┌──────────────┐   espelham o estado    ┌──────────────┐
   │  /sensores   │═══════ do A/C ═════════ │  /controle   │
   │ (singleton)  │                         │ (singleton)  │
   └──────┬───────┘                         └──────┬───────┘
          │ gera amostras                          │ registra mudanças
          ▼                                        ▼
   ┌──────────────┐                         ┌──────────────┐
   │ /historico   │                         │  /eventos    │
   │  (coleção)   │                         │  (coleção)   │
   └──────────────┘                         └──────┬───────┘
                                                    ▲
                          ┌──────────────┐          │ sugere temp_alvo
                          │     /ia      │ ─────────┘  (auditoria do ajuste)
                          │ (metadados)  │
                          └──────────────┘
```

> Os campos de cada nó estão detalhados no JSON acima. `/sensores` e `/controle` são **singletons** (recurso único); `/historico` e `/eventos` são **coleções** indexadas por `pushId`.

### 6.2. Tipos de evento (`eventos.type`)

| `type` | Significado | Origem |
|---|---|---|
| `ac_ligado_manual` | Usuário ligou o A/C | Dashboard/App |
| `ac_desligado_manual` | Usuário desligou o A/C | Dashboard/App |
| `temp_alvo_manual` | Usuário ajustou a temperatura | Dashboard/App |
| `modo_manual_on` / `modo_manual_off` | Liga/desliga o modo manual | Dashboard/App |
| `ac_ligado` / `ac_desligado` | Mudança comandada pelo firmware | ESP32 |

<div style="page-break-after: always;"></div>

## 7. Regras de climatização

A regra determinística é a **fonte canônica** do comportamento e existe em três lugares idênticos por design: web (`src/constants/index.js`), firmware (`firmware/climacontrol/climate.h`) e o gerador de dataset da IA.

### 7.1. Tabela de regras

| Pessoas | Temp. base | Se externa > 30 °C | Se externa > 35 °C |
|---|---|---|---|
| **0** | Desligado | — | — |
| **1 – 5** | 24 °C | 23 °C | 22 °C |
| **6 – 15** | 22 °C | 21 °C | 20 °C |
| **16 – 30** | 20 °C | 19 °C | 18 °C |
| **31+** | 18 °C | 17 °C | 16 °C |

> Piso absoluto: **`MIN_TARGET_TEMP = 16 °C`**. A IA pode ajustar dentro de **16–28 °C** (`AI_MAX_TARGET_TEMP = 28`).

### 7.2. Algoritmo (`calcTargetTemp`)

```js
function calcTargetTemp(people, externalTemp) {
  if (people <= 0) return 0;                    // sala vazia → desliga
  const rule = CLIMATE_RULES.find(r =>
    people >= r.minPeople && people <= r.maxPeople);
  let target = rule ? rule.baseTemp : 18;
  if (externalTemp > 35)      target = Math.max(16, target - 2);
  else if (externalTemp > 30) target = Math.max(16, target - 1);
  return target;
}
```

### 7.3. Fluxograma

```
              ┌─────────────────────────────┐
              │ Entrada: pessoas, temp_ext  │
              └──────────────┬──────────────┘
                             ▼
                    ┌──────────────────┐
                    │  pessoas <= 0 ?  │
                    └───┬──────────┬───┘
                    Sim │          │ Não
                        ▼          ▼
            ┌───────────────┐  ┌──────────────────────────────┐
            │ alvo = 0      │  │ alvo = base por faixa de      │
            │ (desligado)   │  │ pessoas (24 / 22 / 20 / 18)   │
            └───────┬───────┘  └───────────────┬──────────────┘
                    │                          ▼
                    │              ┌──────────────────────────┐
                    │              │ temp_ext > 35? → alvo -2  │
                    │              │ temp_ext > 30? → alvo -1  │
                    │              │ senão          → sem ajuste│
                    │              └───────────────┬──────────┘
                    │                              ▼
                    │                  ┌────────────────────────┐
                    │                  │ alvo = max(16, alvo)    │
                    │                  └───────────┬────────────┘
                    └─────────────┬────────────────┘
                                  ▼
                      ┌────────────────────────┐
                      │ Saída: temp_alvo (°C)   │
                      └────────────────────────┘
```

<div style="page-break-after: always;"></div>

## 8. Componente A — Firmware ESP32

> Pasta: [`firmware/climacontrol/`](../firmware/climacontrol/). Plataforma: ESP32 DevKit v1, framework Arduino, build via **PlatformIO** (ou Arduino IDE). Simulação no **Wokwi**.

### 8.1. Papel

O ESP32 é o nó de campo. A cada ciclo ele:

1. Conta pessoas (par de sensores ultrassônicos).
2. Lê temperatura/umidade interna e externa (3× DHT11).
3. Decide a temperatura-alvo (regra `climate.h`) — ou obedece ao modo manual/IA vindo do dashboard.
4. Comanda o A/C por **LED infravermelho**.
5. Publica no Firebase: `/sensores` (a cada 5 s), `/historico` (a cada 60 s) e `/eventos` (em mudanças).
6. Escuta `/controle` por **stream** para reagir a comandos do dashboard em tempo real.

### 8.2. Hardware e pinagem

| Componente | Função | Pino ESP32 |
|---|---|---|
| DHT11 externo | Temperatura/umidade externa | GPIO 4 |
| DHT11 interno 1 | Temperatura/umidade perto do A/C | GPIO 16 |
| DHT11 interno 2 | Temperatura/umidade longe do A/C | GPIO 17 |
| HC-SR04 "A" (porta externa) | TRIG / ECHO | GPIO 18 / 19 |
| HC-SR04 "B" (porta interna) | TRIG / ECHO | GPIO 21 / 22 |
| LED IR | Emite comando ao A/C | GPIO 25 |
| LED de status | Indica WiFi/boot | GPIO 2 |

> **Nota de hardware real:** os HC-SR04 alimentados em 5 V geram ECHO em 5 V — use um **divisor resistivo (1 kΩ + 2 kΩ)** para entrar em 3,3 V no ESP32, ou alimente o sensor em 3V3 (menos sensível, porém seguro). No **Wokwi** os sensores são alimentados em 3V3 e o DHT é simulado como **DHT22** (única peça disponível na biblioteca) — a troca DHT11↔DHT22 é automática via `#ifdef WOKWI_SIMULATION`.
>
> **Observação sobre os sensores de presença:** o `README` lista "TCRT5000" no painel de status do dashboard (rótulos cosméticos em `SystemStatus`), mas a **implementação real de contagem no firmware usa um par de HC-SR04** (sensores ultrassônicos direcionais). Esta documentação descreve o que o firmware efetivamente faz.

### 8.3. Contagem direcional de pessoas (máquina de estados)

Dois sensores de feixe (A = externo, B = interno) detectam a direção do movimento. Considera-se o feixe "cortado" quando a distância medida fica abaixo de **`BEAM_DISTANCE_CM = 30`**.

```
                ┌──────┐
        ┌──────►│ IDLE │◄───────┐
        │       └─┬──┬─┘        │
        │  A corta │  │ B corta │
        │ (B livre)│  │(A livre)│
        │          ▼  ▼         │
   timeout 2s  ┌───────┐  ┌───────┐  timeout 2s
   (descarta)  │ SAW_A │  │ SAW_B │  (descarta)
        └──────┤       │  │       ├──────┘
               └───┬───┘  └───┬───┘
       depois vê B │          │ depois vê A
       ENTRADA     │          │ SAÍDA
       (occ++)     ▼          ▼ (occ--)
                  ┌────────────┐
                  │  RELEASE   │
                  └─────┬──────┘
            ambos livres │ por 1,5s
                         ▼
                    (volta a IDLE)
```

**Tabela de transições:**

| Estado | Condição | Próximo | Ação |
|---|---|---|---|
| IDLE | A cortado, B livre | SAW_A | — |
| IDLE | B cortado, A livre | SAW_B | — |
| SAW_A | depois vê B | RELEASE | **ENTRADA** (`occ++`) |
| SAW_A | timeout 2 s | IDLE | descarta (meia-volta) |
| SAW_B | depois vê A | RELEASE | **SAÍDA** (`occ--`) |
| SAW_B | timeout 2 s | IDLE | descarta (meia-volta) |
| RELEASE | ambos livres por 1,5 s | IDLE | — |

- **Timeout** (`BEAM_PAIR_WINDOW_MS = 2000`): se a segunda viga não vier em 2 s, descarta.
- **RELEASE** (`BEAM_RELEASE_MS = 1500`): após contar, ignora novos eventos até ambos os feixes ficarem livres por 1,5 s (evita contar a mesma pessoa duas vezes).
- **Amostragem** (`BEAM_SAMPLE_MS = 60`): ~60 ms entre pulsos do mesmo sensor (evita ecos fantasmas).
- Ocupação saturada em **[0, 999]**.

### 8.4. Leitura ambiental (DHT)

- Três DHT11: 1 externo + 2 internos (perto/longe do A/C). A temperatura interna publicada é a **média dos dois internos**.
- O DHT11 retorna `NaN` com frequência; o firmware mantém um **cache do último valor válido** (`fallback`) para não poluir o dashboard.

### 8.5. Comando IR do A/C

- Biblioteca **IRremoteESP8266** (suporta dezenas de marcas). Protocolo padrão: **Samsung** (LG e Daikin selecionáveis em `config.h`).
- `send(on, temp)`: liga/desliga, define modo **Cool**, ventilação **automática**, e a temperatura **limitada a 16–30 °C**.
- O firmware só transmite IR **quando o estado realmente muda** (on/off ou nova temperatura), porque cada transmissão bloqueia o loop por ~200 ms e travaria o stream do Firebase.

### 8.6. Lógica de decisão (`decideTarget`)

```
modo_manual = true   → respeita temp_alvo recebido do dashboard (/controle)
modo_manual = false  → calcula com climate::calcTargetTemp(pessoas, temp_externa)
```

A IA, quando ativa, escreve `temp_alvo` direto em `/controle` pelo navegador. Como o ESP32 ouve `/controle` via stream, **ele não precisa rodar o modelo** — apenas obedece ao valor recebido.

### 8.7. Loop principal (tempos)

| Tarefa | Período | Constante |
|---|---|---|
| Atualizar máquina de feixes | ~10 ms | (fixo no loop) |
| Ler DHT + decidir + escrever `/sensores` + IR | 5 s | `UPDATE_INTERVAL_MS` |
| Push em `/historico` | 60 s | `HISTORY_APPEND_MS` |

### 8.8. Conectividade

- **WiFi** (`WIFI_SSID`/`WIFI_PASSWORD`; no Wokwi usa `Wokwi-GUEST` aberto).
- **NTP** (`configTime`, UTC-3 Brasília) — essencial para os timestamps de `/historico` e `/eventos` não ficarem em 1970.
- **Firebase** via biblioteca `mobizt/Firebase Arduino Client`: autentica com **email/senha** (usuário criado no Firebase Auth), abre **stream** em `/controle`. Há um *guard* contra placeholders esquecidos em `config.h` (se as credenciais não forem preenchidas, o boot segue só com sensores locais e Serial, sem travar).

### 8.9. Build e simulação

```bash
# Hardware real
pio run -e esp32dev
pio run -e esp32dev -t upload

# Simulador Wokwi (define WOKWI_SIMULATION)
pio run -e wokwi
# depois: abrir diagram.json no VS Code (extensão Wokwi) e clicar Play
```

- `board_build.partitions = huge_app.csv` (3 MB p/ a aplicação — Firebase + WiFi + IR + DHT estouram a partição padrão).
- `lib_ldf_mode = deep+` (resolve includes condicionais das libs).
- Bibliotecas: `Firebase Arduino Client (mobizt)`, `DHT sensor library (Adafruit)`, `Adafruit Unified Sensor`, `IRremoteESP8266 (crankyoldgit)`.

<div style="page-break-after: always;"></div>

## 9. Componente B — API REST

> Pasta: [`api/`](../api/). Node.js + Express. **Gateway/BFF** sobre o Firebase Realtime Database. É o **contrato** do sistema. Em produção no Render: `https://climacontrol-api.onrender.com`.

### 9.1. Por que uma API própria (e não a REST nativa do Firebase)?

A REST automática do Firebase não permite **desenhar** métodos, status codes, versão nem validação de regra de negócio. A API própria demonstra na prática os conceitos de REST e adiciona uma camada de **segurança, validação e auditoria** entre os clientes e o banco.

### 9.2. Recursos e métodos (Nível 2 de Richardson)

| Recurso | GET | PUT | PATCH | POST | DELETE |
|---|---|---|---|---|---|
| `/api/v1/sensores` | leitura atual `200` | ESP32 envia tudo `200` | — | — | — |
| `/api/v1/controle` | estado do A/C `200` | — | liga/ajusta parcial `200` | — | — |
| `/api/v1/historico` | série paginada `200` | — | — | anexa amostra `201` | — |
| `/api/v1/eventos` | log paginado `200` | — | — | registra `201` | remove por id `204` |

**Escolha de verbos (idempotência):**

- `/sensores` usa **PUT** — o ESP32 envia o objeto inteiro a cada ciclo; repetir leva ao mesmo estado (idempotente).
- `/controle` usa **PATCH** — o dashboard muda só alguns campos (ex.: `temp_alvo`); não faria sentido reenviar o recurso todo.
- `/eventos` usa **POST** (cria, não idempotente: dois POST = dois eventos) e **DELETE** (idempotente: remover de novo dá 404, sem efeito colateral).

### 9.3. Endpoints auxiliares

| Rota | Função |
|---|---|
| `GET /health` | Health check: `{ status, firebase: up/down, uptime }` (usado pelo Render) |
| `GET /api/v1` | Índice de recursos (descoberta) |
| `GET /api/docs` | Swagger UI (contrato navegável) |
| `GET /api/openapi.json` / `.yaml` | Contrato bruto |
| `GET /` | Redireciona para `/api/docs` |

### 9.4. Envelope de resposta (contrato)

**Sucesso:**
```jsonc
{ "data": { /* recurso ou array */ },
  "meta": { "version": "v1", "timestamp": 1730000000000,
            "pagination": { "page": 1, "page_size": 50, "total": 120,
                            "total_pages": 3, "has_more": true } } }
```

**Erro — RFC 7807 (`application/problem+json`):**
```jsonc
{ "type": "https://climacontrol-api.onrender.com/problems/validation-error",
  "title": "Dados de entrada inválidos.",
  "status": 400,
  "detail": "Um ou mais campos da requisição são inválidos.",
  "instance": "/api/v1/controle",
  "errors": [ { "campo": "temp_alvo", "mensagem": "temp_alvo deve ser no máximo 28°C" } ] }
```

### 9.5. Tabela completa de status codes

| Código | Quando | Onde |
|---|---|---|
| `200` | Leitura / PATCH / PUT ok | controllers |
| `201` | Recurso criado (+ header `Location`) | `historico`, `eventos` POST |
| `204` | Removido (sem corpo) | `DELETE /eventos/:id` |
| `400` | Validação / regra de negócio (Zod) | `validate.js` |
| `401` | Sem token / token inválido (+ `WWW-Authenticate`) | `auth.js` |
| `404` | Recurso inexistente | `notFound.js` / controllers |
| `429` | Rate limit excedido (+ `Retry-After`, `RateLimit-*`) | `rateLimit.js` |
| `503` | Firebase indisponível / timeout / circuito aberto | `config/firebase.js` |
| `500` | Erro inesperado (detalhe não vaza) | `errorHandler.js` |

Centralizados em [`errorHandler.js`](../api/src/middlewares/errorHandler.js), que mapeia status → `{code, title}` e formata tudo como Problem Details.

### 9.6. Arquitetura interna (pipeline de uma requisição)

```
   Requisição
      │
      ▼  requestLogger ............... log JSON (método, rota, status, ms, uid)
      ▼  helmet + cors + json(100kb) . segurança e parsing
      ▼  apiLimiter .................. 120/min por IP ───────────► 429 (Retry-After) ─┐
      ▼  Cache-Control: no-store ..... LGPD                                           │
      ▼  [é escrita?]                                                                 │
      │     ├── sim → requireAuth (verifyIdToken) ──────────────► 401 (sem/invalid) ──┤
      │     └── leitura ──┐                                                           │
      ▼                   ▼                                                           ▼
      validate (Zod) ......................................► 400 (inválido) ───► errorHandler
      ▼                                                                         (RFC 7807,
      controller                                                                problem+json)
      ▼  dbOp: timeout 5s + circuit breaker ...............► 503 (DB fora) ────────►┘
      ▼
      Firebase RTDB
      ▼  respond → { data, meta }
   Resposta
```

### 9.7. Camadas e arquivos

| Camada | Arquivo | Responsabilidade |
|---|---|---|
| **Bootstrap** | `server.js` | Porta/host (bind `0.0.0.0` p/ o Render), shutdown gracioso (SIGTERM/SIGINT) |
| **App** | `app.js` | Monta middlewares, Swagger, versionamento, carrega o `openapi.yaml` em runtime |
| **Config** | `config/firebase.js` | Admin SDK; `dbOp()` com timeout + circuit breaker; modo degradado |
| **Rotas** | `routes/v1/*.routes.js` | Mapeia método+URL → middleware+controller |
| **Controllers** | `controllers/*.controller.js` | Lógica de cada recurso |
| **Schemas** | `schemas/*.schema.js` | Validação Zod (regras de negócio) |
| **Middlewares** | `middlewares/*` | auth, validate, rateLimit, requestLogger, notFound, errorHandler |
| **Utils** | `utils/*` | respond (envelope/Problem), pagination, timeout |

### 9.8. Segurança da API (mapeada ao OWASP API Top 10)

| Risco OWASP | Mitigação | Arquivo |
|---|---|---|
| **API2 — Broken Authentication** | Escritas exigem **ID token JWT do Firebase**, validado com `verifyIdToken` (assinatura, expiração, `iss`, `aud`). Sem token → `401` + `WWW-Authenticate`. | `auth.js` |
| **API4 — Unrestricted Resource Consumption** | **Rate limit** 120 req/min por IP (`429` + `Retry-After`) e **paginação** com teto de 100 itens. | `rateLimit.js`, `pagination.js` |
| **API3 — BOPLA (mass assignment/overexposure)** | Zod só aceita os campos previstos (extras são ignorados); respostas montam objetos explícitos (não devolvem o documento bruto). | `schemas/`, `controllers/` |
| **API1 — BOLA** | Não há recursos por-usuário (sensores/controle são do prédio); ainda assim registra `por: req.user.uid` para auditoria. | `controle.controller.js` |

**Validação (Zod) — regras notáveis:**

- `temp_alvo` ∈ **[16, 28] °C** (regra de negócio).
- `limit` ∈ [1, **100**] (teto de paginação).
- `period` ∈ `1h/4h/8h/12h/24h`; `sort` ∈ `asc/desc`.
- `PATCH /controle` exige **ao menos 1 campo**.

**LGPD / cache:** todas as rotas de dados emitem **`Cache-Control: no-store`** (a ocupação é potencialmente sensível). O log **não** registra query string nem corpo — só método, caminho, status, latência, IP e uid.

### 9.9. Resiliência

- **Timeout** de 5 s em toda operação de banco (`withTimeout` → `503 DATABASE_TIMEOUT`).
- **Circuit breaker**: após **5 falhas** seguidas, abre o circuito por **30 s** respondendo `503` rápido (em vez de empilhar requisições contra um banco fora).
- **Modo degradado**: a API sobe mesmo sem credenciais do Firebase — as rotas de dados respondem `503`, mas `/health`, validações (`400`) e `404` continuam testáveis.

### 9.10. Contrato e governança

- **OpenAPI 3.1** (`openapi.yaml`) é a **fonte da verdade**, carregada pela aplicação em tempo de execução e servida no Swagger.
- **Spectral** (`.spectral.yaml`) valida o contrato no CI:
  - `operation-operationId` (**error**) — toda operação precisa de id.
  - `path-casing` (**error**) — proíbe camelCase em URL (bloqueia "RPC disfarçado").
  - `errors-use-problem-json` (**warn**) — respostas 4xx/5xx devem usar `problem+json`.
- **Versionamento** por URL (`/api/v1`). Uma mudança incompatível sairia em `/api/v2`, mantendo a `/v1` no ar. A versão também volta em `meta.version`.

### 9.11. Testes (19 casos)

Arquivo [`api/test/api.test.js`](../api/test/api.test.js) — Vitest + Supertest, com um **Firebase fake em memória** (`fakeFirebase.js`). Cobre:

- Infra & contrato: `/health`, `/api/openapi.json` (3.1), 404 em `problem+json`, `Cache-Control: no-store`.
- `sensores`: GET 200; sem dados 404; PUT sem token 401 (+ `WWW-Authenticate`); PUT válido 200; PUT inválido 400.
- `controle`: GET 200; PATCH sem token 401; PATCH `temp_alvo` fora de [16,28] → 400; PATCH válido → 200 **e registra evento de auditoria**.
- `eventos`: GET 200 com `meta.pagination`; POST sem token 401; POST 201 + `Location`; DELETE 204 / 404 (idempotência).
- Paginação: `limit` acima de 100 → 400; `/historico` 200 com paginação.

### 9.12. CI/CD

[`.github/workflows/api-ci.yml`](../.github/workflows/api-ci.yml) roda a cada push/PR que toca `api/`: instala (`npm ci`), faz **lint do contrato** (Spectral) e roda os **testes**. Qualquer falha **bloqueia o merge**.

```
   push / PR em api/
        │
        ▼  GitHub Actions (runs-on: ubuntu)
        ▼  setup Node 22
        ▼  npm ci
        ▼  npm run lint:openapi (Spectral) ──── falha ──► ✗ BLOQUEIA o merge
        ▼  npm test (19 casos, vitest) ───────── falha ──► ✗ BLOQUEIA o merge
        ▼
   tudo verde ──► ✓ merge liberado
```

<div style="page-break-after: always;"></div>

## 10. Componente C — Modelo de Inteligência Artificial

> Pasta: [`src/ai/`](../src/ai/) (treino + inferência) e [`public/ai-model/`](../public/ai-model/) (modelo exportado). Objetivo: prever a **temperatura-alvo ideal** a partir de pessoas + temperatura interna + externa.

### 10.1. Visão geral do pipeline

```
 generateDataset.js          trainModel.js              exportWeights.js
 (5000 amostras       ──►    (TensorFlow.js Node, ──►   (extrai pesos do
  seed 42 + ruído)            200 epochs, Adam)          weights.bin)
        │                          │                          │
        ▼                          ▼                          ▼
   dataset.json            public/ai-model/             modelWeights.js
                           model.json + weights.bin     (pesos em JS puro)
                           + normalization.json               │
                                                              ▼
                                                       pureInference.js
                                                       (forward pass manual,
                                                        sem TensorFlow)
                                                              │
                                                              ▼
                                                         climateAI.js
                                                   (predict + fallback + clamp)
                                                              │
                                                              ▼
                                                  useClimateAI  (web e mobile)
```

### 10.2. Dataset sintético

- **5000 amostras** geradas com PRNG **determinístico** (`mulberry32`, seed **42**) → reprodutível.
- Cenários amostrados por faixa de ocupação (vazio 8%, 1–5 27%, 6–15 30%, 16–30 23%, 31–50 12%).
- `temp_externa` ∈ 15–45 °C, `temp_interna` ∈ 15–40 °C.
- O alvo "ideal" parte da regra base por pessoas, aplica os descontos por calor externo, ajustes finos (corpos extras, *drift* interno–alvo, frio externo) e **ruído gaussiano** (σ=0,35) para o modelo não decorar a regra exata. Resultado arredondado e limitado a **[16, 28]**.

### 10.3. Arquitetura da rede (regressão)

| Camada | Entrada → Saída | Ativação | Inicialização |
|---|---|---|---|
| Dense 1 | 3 → 16 | ReLU | He Normal |
| Dense 2 | 16 → 8 | ReLU | He Normal |
| Dense 3 (saída) | 8 → 1 | Linear | — |

- **Features:** `pessoas`, `temp_interna`, `temp_externa`.
- **Target:** `temp_alvo_ideal`.
- **Normalização min-max** (treino e inferência usam os mesmos `stats`):

| Variável | min | max |
|---|---|---|
| pessoas | 0 | 50 |
| temp_interna | 15 | 40 |
| temp_externa | 15 | 45 |
| temp_alvo_ideal (target) | 0 | 26 |

### 10.4. Treino (`trainModel.js`)

- Backend: **TensorFlow.js Node** (`@tensorflow/tfjs-node`).
- Otimizador **Adam** (lr = 0,005), perda **MSE**, métrica **MAE**.
- **200 epochs**, batch **64**, *validation split* **20%**.
- Ao final, salva o modelo em `public/ai-model/` (`model.json` + `weights.bin`) e o `normalization.json`, e imprime uma checagem de sanidade (predições vs. regra ideal).

```bash
node src/ai/generateDataset.js   # gera src/ai/data/dataset.json
node src/ai/trainModel.js        # treina → public/ai-model/
node src/ai/exportWeights.js     # exporta pesos → src/ai/modelWeights.js
```

### 10.5. Inferência sem TensorFlow (chave do projeto)

Para rodar **no navegador e no celular sem carregar o TensorFlow** (que é pesado), os pesos treinados são exportados (`exportWeights.js`) para um objeto JS (`modelWeights.js`), e `pureInference.js` reimplementa o *forward pass* manualmente:

```js
// normaliza entradas → para cada camada: out = relu(W·x + b) → denormaliza saída
```

`climateAI.js` orquestra:

- `predictTargetTemp(pessoas, tempInt, tempExt)`:
  - `pessoas <= 0` → retorna 0 (desligado).
  - Sem pesos disponíveis ou erro → **fallback** para a regra determinística (`calcTargetTemp`).
  - Sucesso → arredonda e **limita a [16, 28]**.
- `getAIDiagnostics()` expõe: modelo carregado, versão (**1.0.0**), última predição, tempo de inferência, se usou fallback, último erro.

### 10.6. Integração com o cliente (`useClimateAI`)

- Inicializa a IA; estado: `loading → ready` (ou `fallback`).
- **Debounce de recálculo**: quando a ocupação muda, espera `AI_RECALC_DELAY_MS = 15 s` antes de recalcular (feedback visual "recalculando"); intervalo mínimo entre predições `AI_MIN_PREDICT_INTERVAL_MS = 5 s`.
- **Confiança** (`low/medium/high`) classificada pela faixa das entradas (extrapolações → baixa).
- No `useSensorData`, quando a IA está ativa e fora do modo manual, o alvo previsto é escrito em `/controle` (via API/Firebase) com `ia_ativa: true`, registrando o "último ajuste" em `/ia`. Só escreve se a diferença ≥ `AI_UPDATE_THRESHOLD_C = 0.5 °C` (evita escritas redundantes).

<div style="page-break-after: always;"></div>

## 11. Componente D — Dashboard Web (React)

> Pasta: [`src/`](../src/). React 19 + Vite 8. Em produção: `https://movimenteunifecaf.web.app` (Firebase Hosting). É também uma **PWA**.

### 11.1. Funcionalidades

- **Login** (Firebase Auth, email/senha) — desacoplado do modo de dados.
- **Cards de métricas**: pessoas, temp. interna/externa, temp. alvo, umidade, eficiência, IA.
- **5 gráficos** (Recharts, *lazy-loaded*): temperatura, ocupação, umidade, uso do A/C e comparação IA × regra.
- **Painel de controle**: ligar/desligar, ajustar temperatura, alternar modo manual.
- **Log de eventos** em tempo real.
- **Tabela de regras** de climatização.
- **Painel de status do sistema** (sensores/conexão).
- **Painel de IA** (`AIInsightsPanel`): recomendação, confiança, diagnóstico.
- **Seletor de período** (1h/4h/8h/12h) e **tema claro/escuro**.
- **Exportação em PDF** do histórico (jsPDF + autotable, com cabeçalho de marca e *downsampling*).

### 11.2. Hooks principais

| Hook | Papel |
|---|---|
| `useSensorData` | Lê `/sensores` e `/historico` em tempo real (Firebase `onValue`); gera mock quando aplicável; expõe `setAcOn`, `setTargetTemp`, `setManualMode`; escreve via **API REST** quando `VITE_API_URL` está definida, senão direto no Firebase; orquestra a escrita da IA. |
| `useAuth` | Firebase Auth (email/senha); usuário mock quando `VITE_SKIP_AUTH` ou sem config. |
| `useClimateAI` | Inferência da IA com debounce e confiança (ver §10.6). |
| `useEventLog` | Lê e formata o log de `/eventos`. |

### 11.3. Modos de operação (auth × dados são independentes)

| Cenário | `VITE_FIREBASE_*` | `VITE_USE_MOCK_DATA` | Login | Dashboard |
|---|---|---|---|---|
| **Produção** (ESP32 ligado) | preenchido | `false` | Firebase real | Realtime Database |
| **Demo com login real** | preenchido | `true` | Firebase real | Mock local |
| **Demo total** (sem config) | vazio | qualquer | Bypass (auto-login) | Mock local |

> Se as variáveis `VITE_FIREBASE_*` não estiverem preenchidas, o app cai em **modo simulação automaticamente** — `npm run dev` nunca quebra. No modo simulação, o header mostra a pill "Modo simulação" e o painel de controle só atualiza estado local.

### 11.4. Cliente da API (`services/apiClient.js`)

- Ativa-se quando `VITE_API_URL` está definida (`apiEnabled`).
- Anexa automaticamente o **ID token** do usuário logado (`Authorization: Bearer`).
- Trata o envelope `{data}` e os erros RFC 7807 (`type/title/detail/errors`).
- Métodos: `getSensores`, `getControle`, `patchControle`, `getHistorico`, `postEvento`.
- Erro de rede/CORS → `NETWORK_ERROR` tratável.

### 11.5. PWA

- `manifest.webmanifest`: nome, ícones, `display: standalone`, cores de tema.
- `sw.js` (service worker): *cache-first com atualização em rede* para estáticos da própria origem; **ignora** requisições ao Firebase; limpa caches antigos no `activate`.

### 11.6. Build e deploy

```bash
npm install
cp .env.example .env     # preencher
npm run dev              # http://localhost:5173
npm run build            # gera dist/
npx firebase deploy --only hosting
```

`firebase.json`: `public: dist`, rewrites de SPA (tudo → `/index.html`).

<div style="page-break-after: always;"></div>

## 12. Componente E — Aplicativo Mobile (Android)

> Pasta: [`mobile/`](../mobile/). Expo SDK 52 + React Native 0.76.9 (nova arquitetura). Reaproveita **~70%** da lógica do web. Pacote: `com.climacontrol.app`.

### 12.1. Funcionalidades

| Feature | Tecnologia |
|---|---|
| Login Firebase Auth | `firebase/auth` (persistência via AsyncStorage) |
| **Biometria** (digital / Face ID) | `expo-local-authentication` + `expo-secure-store` |
| **Push notifications** | `expo-notifications` (canal "alerts"; alerta de A/C on/off e temp. alta > 32 °C) |
| **Atualizações OTA** | `expo-updates` (canal `production`, `runtimeVersion: appVersion`) |
| Tema claro/escuro/auto | `ThemeContext` persistido em AsyncStorage |
| 4 gráficos animados | Victory Native v41 + Skia |
| Controle manual | Switch + Slider nativo + **Haptics** |
| Pull-to-refresh | nativo |
| Splash + ícone adaptive | `expo-splash-screen`, adaptive icon |

### 12.2. Hooks/contextos específicos do mobile

| Item | Papel |
|---|---|
| `AuthContext` / `ThemeContext` | Estado global de auth e tema (providers em `App.jsx`). |
| `useBiometric` | Detecta hardware/enrolamento; guarda credenciais no SecureStore; autentica com prompt do SO. |
| `useNotifications` | Permissão, canal Android, dispara alertas em mudança de A/C e temperatura alta. |
| `useOtaUpdate` | Checa update ao abrir e ao voltar do background; baixa em background; `apply()` reinicia na nova versão. |

### 12.3. Configuração (Expo)

- Firebase lido de `EXPO_PUBLIC_*` (env) **ou** de `app.json → expo.extra` (fallback). Detecta placeholders (`REPLACE_WITH_*`) e cai em mock.
- Mesma lógica de modos do web (mock × real, skip auth).

### 12.4. Build e atualização

```bash
cd mobile && npm install
npm start                 # QR code (Expo Go)
npm run build:apk         # EAS Build → APK (perfil preview, canal production)
npm run build:aab         # EAS Build → AAB (Play Store)
npm run update -- --message "..."   # publica OTA (sem rebuildar)
eas update:rollback --branch production   # rollback
```

- **Não precisa de Android Studio** — o EAS compila na nuvem.
- **OTA** (mudanças só de JS/assets) chega sem refazer o APK; mudanças nativas (libs, permissões, versão, ícones) exigem novo build.

<div style="page-break-after: always;"></div>

## 13. Fluxos de dados ponta a ponta

### 13.1. Ciclo do sensor (ESP32 → dashboard)

```
 Sensores        ESP32            Firebase RTDB       Dashboard/App
    │              │                    │                   │
    │ dist+temp    │                    │                   │   ── a cada 5s ──
    │─────────────►│                    │                   │
    │              │ conta pessoas      │                   │
    │              │ decideTarget()     │                   │
    │              │ PUT /sensores ────►│                   │
    │ ◄── IR (só se o estado mudou)     │                   │
    │              │                    │                   │   ── a cada 60s ──
    │              │ push /historico ──►│                   │
    │              │                    │ onValue (tempo ──►│  gráficos / cards
    │              │                    │ real)             │
```

### 13.2. Controle manual (dashboard → A/C) via API REST

```
 Usuário   Dashboard/App     API REST         Firebase RTDB    ESP32    A/C
    │           │                │                  │            │       │
    │ clica/    │                │                  │            │       │
    │ ajusta ──►│ PATCH /controle│                  │            │       │
    │           │ (Bearer token)►│ verifyIdToken    │            │       │
    │           │                │ + Zod (16–28°C)  │            │       │
    │           │                │ update /controle►│            │       │
    │           │                │ push /eventos ──►│ (auditoria:│       │
    │           │                │                  │  por=uid)  │       │
    │           │◄── 200 {data}  │                  │            │       │
    │           │                │                  │ stream ───►│ obedece
    │           │                │                  │            │ IR ──►│
```

> Quando `VITE_API_URL` **não** está definida, o dashboard escreve direto em `/controle` e `/eventos` no Firebase (fallback), sem passar pela API.

### 13.3. Ajuste automático pela IA

```
 Cliente (Web/Mobile)    climateAI (local)    Firebase RTDB     ESP32
    │                          │                    │             │
    │ predict(pessoas,         │                    │             │
    │  tInt, tExt) ───────────►│                    │             │
    │◄── temp_alvo (ou regra)  │                    │             │
    │                                               │             │
    │ [se fora do modo manual E diferença ≥ 0,5°C]: │             │
    │ update /controle (temp_alvo, ia_ativa) ──────►│             │
    │ set /ia/ultimo_ajuste (inputs, output, ──────►│             │
    │     confiança)                                │ stream ────►│ obedece
```

<div style="page-break-after: always;"></div>

## 14. Configuração e variáveis de ambiente

O projeto tem **três arquivos `.env` separados** (um por subprojeto). Eles **não** se unificam — cada ferramenta lê o `.env` da própria pasta.

```
┌──────────────────────────────┐ ┌──────────────────────────────┐ ┌──────────────────────────────┐
│ .env (raiz) — WEB · Vite      │ │ mobile/.env — Expo            │ │ api/.env — API (SEGREDO!)     │
│ prefixo VITE_                 │ │ prefixo EXPO_PUBLIC_          │ │ sem prefixo · só no servidor  │
│                               │ │                              │ │                               │
│ • VITE_FIREBASE_* (públicas)  │ │ • EXPO_PUBLIC_FIREBASE_*      │ │ • FIREBASE_SERVICE_ACCOUNT 🔒 │
│ • VITE_USE_MOCK_DATA          │ │ • EXPO_PUBLIC_USE_MOCK_DATA   │ │   (chave admin do Firebase)   │
│ • VITE_SKIP_AUTH              │ │ • EXPO_PUBLIC_SKIP_AUTH       │ │ • FIREBASE_DATABASE_URL       │
│ • VITE_API_URL                │ │                              │ │ • CORS_ORIGIN / PORT          │
│                               │ │                              │ │ • RATE_LIMIT_MAX              │
└───────────────┬──────────────┘ └───────────────┬──────────────┘ └───────────────┬──────────────┘
                └────────────── FIREBASE_DATABASE_URL (a mesma URL nos três) ───────┘
```

### 14.1. Web (`.env` na raiz — prefixo `VITE_`)

| Variável | Descrição |
|---|---|
| `VITE_FIREBASE_API_KEY` | API key Web do Firebase (pública) |
| `VITE_FIREBASE_AUTH_DOMAIN` | `<projeto>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ID do projeto |
| `VITE_FIREBASE_STORAGE_BUCKET` | Bucket de storage |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ID de mensageria |
| `VITE_FIREBASE_APP_ID` | App ID Web |
| `VITE_FIREBASE_MEASUREMENT_ID` | Measurement ID (Analytics) |
| `VITE_FIREBASE_DATABASE_URL` | URL do Realtime Database |
| `VITE_USE_MOCK_DATA` | `false` = banco real; `true` = simulação |
| `VITE_SKIP_AUTH` | `true` pula o login (apenas dev) |
| `VITE_API_URL` | URL da API REST; em branco = escrita direta no Firebase |

> ⚠️ Tudo que começa com `VITE_` é **embutido no bundle público**. Não coloque segredos aqui — quem protege é o Security Rules do Firebase.

### 14.2. Mobile (`mobile/.env` — prefixo `EXPO_PUBLIC_`)

Mesmos valores Firebase com prefixo `EXPO_PUBLIC_FIREBASE_*`, mais `EXPO_PUBLIC_USE_MOCK_DATA` e `EXPO_PUBLIC_SKIP_AUTH`. Alternativa: `app.json → expo.extra`.

### 14.3. API (`api/.env` — sem prefixo, **SEGREDO**)

| Variável | Descrição | Secreto? |
|---|---|---|
| `PORT` | Porta (default 3001) | não |
| `CORS_ORIGIN` | Origens permitidas (vírgula) | não |
| `FIREBASE_DATABASE_URL` | URL do Realtime Database | não |
| `FIREBASE_SERVICE_ACCOUNT` | **JSON inteiro** da conta de serviço (admin) | 🔒 **sim** |
| `GOOGLE_APPLICATION_CREDENTIALS` | Alternativa local: caminho p/ o `.json` | 🔒 |
| `RATE_LIMIT_MAX` | Requisições por minuto por IP (default 120) | não |
| `NODE_VERSION` | `22` (no Render) | não |

> 🔒 A `FIREBASE_SERVICE_ACCOUNT` dá **acesso admin** ao banco (ignora as Security Rules). Nunca versionar `api/serviceAccount.json` nem `api/.env`. **Rotacionar a chave após a entrega.**

<div style="page-break-after: always;"></div>

## 15. Como executar (passo a passo)

### 15.1. Pré-requisitos

- **Node.js 22** (`nvm use` lê o `.nvmrc`).
- Conta Firebase (projeto com Realtime Database + Authentication).
- Para a API: o JSON da **conta de serviço** do Firebase.
- Para o mobile: conta Expo (gratuita); para o APK, `eas-cli`.
- Para o firmware: PlatformIO (ou Arduino IDE) e, opcionalmente, a extensão Wokwi.

### 15.2. Dashboard web

```bash
npm install
cp .env.example .env          # preencher (ou deixar vazio p/ mock total)
npm run dev                   # http://localhost:5173
```

### 15.3. API REST (local)

```bash
cd api
npm install
cp .env.example .env          # FIREBASE_DATABASE_URL + GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
npm run dev                   # http://localhost:3001  (docs em /api/docs)
```

Para o dashboard consumir a API local, defina no `.env` da raiz: `VITE_API_URL=http://localhost:3001`.

### 15.4. App mobile

```bash
cd mobile
npm install
cp .env.example .env          # (opcional — mock funciona sem)
npm start                     # QR code com Expo Go
```

### 15.5. Firmware

1. Preencher `firmware/climacontrol/config.h` (WiFi, Firebase, usuário/senha).
2. `pio run -e wokwi` (simulador) ou `pio run -e esp32dev -t upload` (placa real).

### 15.6. Scripts úteis (raiz)

```bash
npm run lint          # ESLint
npm run test          # Vitest (web)
npm run check:sync    # verifica web ↔ mobile sincronizados
npm run build         # build de produção
```

<div style="page-break-after: always;"></div>

## 16. Deploy / publicação

### 16.1. Dashboard → Firebase Hosting

```bash
nvm use
npm run build
firebase deploy --only hosting   # → movimenteunifecaf.web.app
```

### 16.2. API → Render (plano free)

Via **Blueprint** (`api/render.yaml`) ou Web Service manual:

| Campo | Valor |
|---|---|
| Root Directory | `api` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/health` |
| Node | `22` |

Variáveis no painel do Render: `FIREBASE_DATABASE_URL`, `CORS_ORIGIN`, e **`FIREBASE_SERVICE_ACCOUNT`** (JSON inteiro em uma linha — secreto).

```bash
# gerar o JSON em uma linha para colar:
node -e "console.log(JSON.stringify(require('./api/serviceAccount.json')))"
```

Verificação: `/health` → `{"status":"ok","firebase":"up"}`; `/api/docs` → Swagger; `/api/v1/controle` → 200.

> ⚠️ **Cold start:** o plano free hiberna após ~15 min ocioso; a 1ª requisição depois leva ~50 s. Antes de apresentar, abra `/health` 1–2 min antes para "acordar" o serviço.

### 16.3. App → EAS Build / OTA

```bash
npm install -g eas-cli && eas login
eas build:configure
npm run build:apk        # APK (instalar direto no celular)
npm run build:aab        # AAB (Play Store)
npm run update           # publicar atualização OTA
```

<div style="page-break-after: always;"></div>

## 17. Segurança

### 17.1. Firebase Security Rules (Realtime Database)

Configurar no console (Realtime Database → Rules):

```json
{
  "rules": {
    "sensores":  { ".read": true, ".write": "auth != null && auth.token.admin === true" },
    "historico": { ".read": true, ".write": "auth != null && auth.token.admin === true", ".indexOn": ["t"] },
    "controle":  { ".read": true, ".write": "auth != null" },
    "eventos":   { ".read": true, ".write": "auth != null && auth.token.admin === true", ".indexOn": ["timestamp"] }
  }
}
```

> Leitura pública (dashboard); escrita em `/sensores`, `/historico`, `/eventos` exige identidade autenticada com claim `admin: true` (o ESP32 usa um usuário dedicado). `/controle` aceita qualquer usuário autenticado (controle pelo dashboard).

### 17.2. Camadas de segurança

| Camada | Medida |
|---|---|
| **Transporte** | HTTPS no Hosting, no Render e no Firebase. |
| **Autenticação** | Firebase Auth (email/senha); a API valida o ID token JWT (`verifyIdToken`). |
| **Autorização** | Security Rules por caminho + claim `admin`; escritas na API exigem token. |
| **Validação** | Zod em todo corpo/query da API. |
| **Abuso** | Rate limit (120/min por IP) + paginação com teto. |
| **Segredos** | Service account só no servidor (`api/.env`/Render); nunca no bundle/git. |
| **LGPD** | `Cache-Control: no-store`; logs sem query/corpo (sem PII); ocupação tratada como sensível. |
| **Resiliência** | Timeout + circuit breaker contra falhas do banco. |

### 17.3. Ações pendentes no console (ver `docs/FIREBASE_SETUP.md`)

- **Rotacionar a API key Web** (a antiga foi exposta no histórico do Git) e aplicar restrições de *HTTP referrers* e de APIs.
- Aplicar as **Security Rules** acima.
- Garantir o **Authentication (Email/Password)** habilitado e ao menos um usuário admin.
- **Rotacionar a service account** após a entrega (gera nova chave → atualiza no Render → apaga a antiga).

<div style="page-break-after: always;"></div>

## 18. Testes, qualidade e CI/CD

| Mecanismo | O que faz | Onde |
|---|---|---|
| **Vitest (API)** | 19 testes de integração (Supertest + Firebase fake) | `api/test/api.test.js` |
| **Vitest (web)** | Testes de unidade (constants, mockData, IA: climateAI, dataset, pureInference) | `src/**/*.test.js`, `src/ai/__tests__/` |
| **Spectral** | Lint do contrato OpenAPI (regras anti-RPC, problem+json, operationId) | `api/.spectral.yaml` |
| **ESLint** | Lint do front (React Hooks, refresh) | `eslint.config.js` |
| **Husky + lint-staged** | Hook de pré-commit roda `eslint --fix` nos `*.{js,jsx}` staged | `.husky/` |
| **check:sync** | Garante que os módulos compartilhados web↔mobile não divergem | `scripts/check-shared-sync.mjs` |
| **GitHub Actions** | CI da API (Spectral + testes) bloqueia merge se falhar | `.github/workflows/api-ci.yml` |
| **.gitattributes** | Normaliza fins de linha (LF) | `.gitattributes` |

Comandos:

```bash
# raiz (web)
npm run test            # vitest
npm run lint            # eslint
npm run check:sync      # sincronia web/mobile

# api
cd api
npm test                # 19 casos
npm run lint:openapi    # Spectral
```

<div style="page-break-after: always;"></div>

## 19. Integração multidisciplinar

O projeto integra **quatro áreas**, cada uma com contribuição concreta:

```
                                ClimaControl
        ┌──────────────┬──────────────────┬──────────────────┬──────────────┐
        ▼              ▼                  ▼                  ▼              ▼
  Eletrônica /     IA / Pesquisa     Engenharia de        UX / UI
   Física          Operacional        Software
  • ESP32 +        • Rede neural      • API REST +         • Login
    sensores         (regressão)        OpenAPI            • Painéis e
  • Termodinâmica  • Otimização        • Testes + CI/CD       gráficos
    (ocupação ×      conforto ×        • Dashboard React   • Tema claro/
    calor → alvo)    consumo             + App Expo           escuro
  • Emissão IR     • Fallback                              • PWA + biometria
    ao A/C           determinístico
```

| Área | Contribuição | Evidência |
|---|---|---|
| **Eletrônica / Física aplicada** | Firmware ESP32, leitura de sensores, contagem direcional, emissão IR, termodinâmica da regra | `firmware/climacontrol/` |
| **IA / Pesquisa Operacional** | Modelo que otimiza a temperatura-alvo (conforto × consumo) | `src/ai/` |
| **Engenharia de Software** | API REST versionada/documentada/testada, CI/CD, dashboard e app | `api/`, `src/`, `mobile/` |
| **UX/UI** | Design do dashboard, login, gráficos, tema, PWA, biometria | `src/components/`, `mobile/src/` |

<div style="page-break-after: always;"></div>

## 20. Glossário

| Termo | Significado |
|---|---|
| **BFF / Gateway** | *Backend for Frontend* — camada que concentra auth, validação e formato de dados sob medida para os clientes. |
| **Circuit breaker** | Padrão de resiliência que "abre o circuito" após N falhas, respondendo erro rápido em vez de empilhar requisições. |
| **DHT11** | Sensor digital de temperatura e umidade. |
| **HC-SR04** | Sensor ultrassônico de distância (usado aqui para contagem de pessoas). |
| **Idempotência** | Propriedade em que repetir a mesma operação leva ao mesmo estado (ex.: PUT, DELETE). |
| **OTA** | *Over-the-Air* — atualização do app sem reinstalar o APK (Expo Updates). |
| **PWA** | *Progressive Web App* — site instalável com service worker e manifesto. |
| **RFC 7807 (Problem Details)** | Padrão de corpo de erro HTTP (`application/problem+json`). |
| **RTDB** | Firebase **R**ealtime **D**ata**b**ase. |
| **Singleton (recurso)** | Recurso único, não-coleção (ex.: `/sensores`, `/controle`). |
| **Stream (Firebase)** | Assinatura em tempo real de um nó do banco. |
| **temp_alvo / set-point** | Temperatura desejada do A/C. |

<div style="page-break-after: always;"></div>

## 21. Apêndices

### 21.1. Evidências reais da API (capturadas em produção)

> Para "acordar" o serviço (plano free), acesse `/health` 1–2 min antes.

**Leitura (200, envelope, no-store):**
```bash
curl -i https://climacontrol-api.onrender.com/api/v1/controle
# HTTP/2 200 · cache-control: no-store
# {"data":{"ac_ligado":true,"temp_alvo":22,...},"meta":{"version":"v1",...}}
```

**Health (200):**
```bash
curl https://climacontrol-api.onrender.com/health
# {"status":"ok","firebase":"up","uptime":78.08}
```

**Escrita sem token (401 + RFC 7807):**
```bash
curl -i -X PATCH .../api/v1/controle -H 'Content-Type: application/json' -d '{"temp_alvo":22}'
# HTTP/2 401 · content-type: application/problem+json · www-authenticate: Bearer ...
```

**Recurso inexistente (404):**
```bash
curl .../api/v1/inexistente
# {"type":".../problems/not-found","title":"Recurso não encontrado.","status":404,...}
```

**Rate limit (headers):**
```bash
curl -I .../api/v1/sensores
# ratelimit-limit: 120 · ratelimit-remaining: 118 · ratelimit-reset: 59
```

**Regra de negócio (400) — via Swagger/token:**
```json
{"type":".../problems/validation-error","status":400,
 "errors":[{"campo":"temp_alvo","mensagem":"temp_alvo deve ser no máximo 28°C"}]}
```

### 21.2. Esquema de ligações do firmware (Wokwi `diagram.json`)

```
ESP32        Periférico
─────        ──────────
3V3   ──────► VCC de todos os sensores (DHT x3, HC-SR04 x2)
GND   ──────► GND comum
D4    ──────► DHT externo (SDA)
D16   ──────► DHT interno 1 (perto do A/C)
D17   ──────► DHT interno 2 (longe do A/C)
D18 / D19 ──► HC-SR04 A (TRIG / ECHO)  — porta externa
D21 / D22 ──► HC-SR04 B (TRIG / ECHO)  — porta interna
D25   ──────► LED IR (via resistor) → A/C
D2    ──────► LED de status (via resistor)
```

### 21.3. Constantes-chave do sistema

| Constante | Valor | Onde |
|---|---|---|
| `UPDATE_INTERVAL_MS` | 5000 ms | web/firmware |
| `HISTORY_APPEND_MS` | 60000 ms | web/firmware |
| `HISTORY_MAX_POINTS` | 500 | web |
| `MIN_TARGET_TEMP` | 16 °C | web/firmware/IA |
| `AI_MAX_TARGET_TEMP` | 28 °C | web/IA |
| `AI_RECALC_DELAY_MS` | 15000 ms | web (debounce IA) |
| `AI_UPDATE_THRESHOLD_C` | 0,5 °C | web (escrita IA) |
| `AI_MODEL_VERSION` | 1.0.0 | IA |
| Rate limit | 120 req/min/IP | API |
| Paginação (teto) | 100 itens | API |
| DB timeout | 5000 ms | API |
| Circuit breaker | 5 falhas → 30 s aberto | API |
| `BEAM_DISTANCE_CM` | 30 cm | firmware |
| `BEAM_PAIR_WINDOW_MS` | 2000 ms | firmware |
| `BEAM_RELEASE_MS` | 1500 ms | firmware |

### 21.4. Links

- **Repositório:** https://github.com/JoaoGabriel1601/Projeto-Integrador
- **Dashboard:** https://movimenteunifecaf.web.app
- **API / Swagger:** https://climacontrol-api.onrender.com/api/docs
- **Documentos complementares** (nesta pasta `docs/`):
  - [`AVALIACAO-RESPOSTAS.md`](AVALIACAO-RESPOSTAS.md) — respostas ao guia de avaliação da API.
  - [`ROTEIRO-APRESENTACAO.md`](ROTEIRO-APRESENTACAO.md) — roteiro de demonstração da API.
  - [`PITCH.md`](PITCH.md) — roteiro do vídeo pitch.
  - [`EVIDENCIAS.md`](EVIDENCIAS.md) — evidências reais (curl) da API.
  - [`DEPLOY-RENDER.md`](DEPLOY-RENDER.md) — guia detalhado de deploy no Render.
  - [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md) — ações pendentes no console Firebase.

---

<div align="center"><strong>ClimaControl — UNIFECAF</strong><br/>Climatização autônoma · documentado, testado e no ar.</div>
