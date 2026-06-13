<div align="center">

<br/><br/><br/>

# Movement

## Documentação Técnica Completa

### Sistema de Climatização Autônoma
#### ESP32 · IA · ThingSpeak · Dashboard Web · App Android

<br/>

**Projeto Integrador — UNIFECAF**

<br/><br/>

| | |
|---|---|
| **Nome do projeto** | Movement |
| **Instituição** | UNIFECAF |
| **Versão deste documento** | 2.0 (migração para ThingSpeak) |
| **Repositório** | https://github.com/JoaoGabriel1601/Projeto-Integrador |
| **Dashboard** | SPA estática (`npm run build` → `dist/`), publicável em qualquer host estático |
| **Backend de dados** | ThingSpeak (canal + fila TalkBack) |
| **Integrantes** | Juliana Kelly da Silva — 46684<br>Gabriel Bezerra Teixeira — 40365<br>Thiago Nunes da Silva — 38650<br>Kayc Balbino Rodrigues Siqueira — 66593<br>Luis Henrique Nunes Brito — 62379<br>Vinicius Matos Alves — 123418<br>Nathan Nascimento — 120341<br>Larry Kristian — 40231<br>Joao Gabriel Felix Fernandes — 95536<br>Vitor Hugo da Costa Santos — 93829<br>Rafael Amorim Delgado da Silva — 93994<br>Ygor Rodrigues Araujo dos Santos — 62119<br>Raissa Maria Moreira Cabral — 59049 |
| **Vídeo pitch** | https://youtu.be/oI2Qdm9fJbQ |

<br/><br/><br/>

</div>

<div style="page-break-after: always;"></div>

## Sumário

1. [Resumo executivo](#1-resumo-executivo)
2. [Contexto, problema e objetivos](#2-contexto-problema-e-objetivos)
3. [Visão geral da arquitetura](#3-visão-geral-da-arquitetura)
4. [Stack tecnológica](#4-stack-tecnológica)
5. [Estrutura do monorepo](#5-estrutura-do-monorepo)
6. [Modelo de dados (ThingSpeak)](#6-modelo-de-dados-thingspeak)
7. [Regras de climatização](#7-regras-de-climatização)
8. [Componente A — Firmware ESP32](#8-componente-a--firmware-esp32)
9. [Componente B — Backend ThingSpeak](#9-componente-b--backend-thingspeak)
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

> **Nota de versão (2026-06-08):** este sistema foi migrado do **Firebase Realtime Database + API REST própria** para o **ThingSpeak**. O ESP32 (simulado no Wokwi) publica num canal ThingSpeak; o dashboard e o app leem o feed por *polling* e controlam o A/C pela fila **TalkBack**. O login foi removido (o ThingSpeak não tem autenticação de usuário). Esta documentação descreve a arquitetura **atual**.

<div style="page-break-after: always;"></div>

## 1. Resumo executivo

O **Movement** é um sistema de **climatização autônoma** para ambientes coletivos (salas de aula, escritórios). Ele mede em tempo real a **ocupação** (número de pessoas), a **temperatura interna e externa** e a **umidade**, e calcula automaticamente a **temperatura-alvo ideal** do ar-condicionado conforme a quantidade de pessoas e o calor externo — economizando energia ao evitar que o A/C opere no mesmo set-point com 2 ou com 40 pessoas.

O projeto é um **monorepo** com **quatro frentes** que se comunicam através do **ThingSpeak**:

| Frente | O que faz | Tecnologia | Pasta |
|---|---|---|---|
| 🔌 **Firmware** | Lê sensores, conta pessoas, comanda o A/C por IR e publica os dados | ESP32 + Arduino/PlatformIO | `firmware/` |
| 🧠 **IA** | Rede neural que prevê a temperatura-alvo ideal | TensorFlow.js (treino) + JS puro (inferência) | `src/ai/` |
| 💻 **Dashboard Web** | Monitoramento, controle manual, gráficos, PDF | React 19 + Vite | `src/` |
| 📱 **App Android** | Mesmo dashboard, nativo, com push e OTA | Expo + React Native | `mobile/` |

**Backend (SaaS):** o **ThingSpeak** (MathWorks) é a nuvem que armazena a série temporal. O ESP32 publica nos *fields* do canal; os clientes leem o feed; o controle do A/C vai pela fila **TalkBack**.

**Conceito central:** o ESP32 é a fonte da verdade dos dados; o ThingSpeak é o barramento entre o campo (ESP32) e os clientes (web/mobile); a IA roda **dentro** do cliente (inferência local).

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
- **Transparência:** dashboard com leituras ao vivo, histórico e log de eventos.
- **Boas práticas de engenharia:** lógica compartilhada web↔mobile com verificação de sincronia, testes, lint e simulação reproduzível (Wokwi).
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
            publica 8 fields (HTTP) │            │ polling TalkBack (comandos)
            a cada ~20s             ▼            ▲
                         ┌──────────────────────────────┐
                         │        ThingSpeak (SaaS)      │
                         │  Canal de dados (field1..8)   │
                         │  Fila TalkBack (comandos)     │
                         └───▲────────────────────┬──────┘
        polling do feed      │                    │ enfileira comando
        (~15s)               │                    │
                  ┌──────────┴─────────┐          │
        ┌─────────┴─────────┐          │     ┌────┴───────────────┐
        │ Dashboard Web      │ ─────────┴────►│  TalkBack          │
        │ (React, src/)      │   AC_ON/OFF,   │  (commands.json)   │
        ├────────────────────┤   TARGET:n,    └────────────────────┘
        │ App Android         │   MANUAL_ON/OFF
        │ (Expo, mobile/)     │
        └─────────────────────┘
        (a IA roda dentro do cliente Web/Mobile — inferência local)
```

**Resumo dos fluxos:**

| Origem | Destino | O que trafega |
|---|---|---|
| ESP32 | ThingSpeak | publica os 8 *fields* em `/update` (a cada ~20 s) |
| ESP32 | ThingSpeak | faz *polling* da fila TalkBack (`commands/execute.json`) |
| Dashboard/App | ThingSpeak | leitura do feed por *polling* (`feeds.json` / `feeds/last.json`) |
| Dashboard/App | ThingSpeak | enfileira comandos de controle no TalkBack (`commands.json`) |
| IA | — | roda **dentro** do cliente Web/Mobile (inferência local) |

### 3.2. Princípios de design

- **Uplink x downlink separados:** o ThingSpeak é ótimo para *uplink* (ESP → nuvem → cliente lê o feed). Como ele **não tem stream bidirecional** como o Firebase, o *downlink* (cliente → ESP) usa a fila **TalkBack** (o ESP consome comandos por polling).
- **Sem login:** o ThingSpeak não autentica usuários finais; o dashboard abre direto. As chaves de leitura/TalkBack ficam embutidas no cliente (limitação conhecida de apps client-side; ver §17).
- **Modo simulação:** sem chaves do ThingSpeak (ou com `USE_MOCK_DATA=true`), o app cai em mock local — `npm run dev` nunca quebra.
- **Lógica compartilhada:** regra de climatização, mock e IA existem em uma forma canônica e são replicados (web ↔ mobile) com verificação automática de sincronia.

<div style="page-break-after: always;"></div>

## 4. Stack tecnológica

### 4.1. Por camada

| Camada | Tecnologia | Versão | Onde |
|---|---|---|---|
| **Hardware** | ESP32 DevKit v1, DHT11, HC-SR04, LED IR | — | `firmware/` |
| **Firmware** | Arduino framework, PlatformIO, Wokwi (simulação) | Espressif32 | `firmware/climacontrol/` |
| **Backend de dados** | ThingSpeak (canal + TalkBack) | — | Cloud (MathWorks) |
| **Cliente HTTP (firmware)** | `HTTPClient` + `WiFi` (core ESP32) | — | `firmware/climacontrol/climacontrol.ino` |
| **IA (treino)** | TensorFlow.js Node | 4.22 | `src/ai/trainModel.js` |
| **IA (inferência)** | JavaScript puro (sem dependência em runtime) | — | `src/ai/pureInference.js` |
| **Web** | React + Vite | React 19.2, Vite 8 | `src/` |
| **Gráficos web** | Recharts | 3.8 | `src/components/charts/` |
| **PDF** | jsPDF + jspdf-autotable | 4.2 / 5.0 | `src/utils/pdfExport.js` |
| **Mobile** | Expo SDK + React Native | SDK 52, RN 0.76.9 | `mobile/` |
| **Gráficos mobile** | Victory Native + Skia | 41 / 1.5 | `mobile/src/components/charts/` |
| **Hospedagem web** | Host estático (build `dist/`) | — | Vercel/Netlify/Pages/etc. |
| **Build mobile** | EAS Build + Updates (OTA) | — | `mobile/eas.json` |
| **Lint** | ESLint 9 | — | `eslint.config.js` |
| **Git hooks** | Husky + lint-staged | 9.1 / 16.4 | `.husky/` |
| **Testes** | Vitest | 2.1 | `src/**/*.test.js` |

> **Firebase Hosting:** continua sendo usado apenas como **CDN estático** para servir o bundle do dashboard — é um produto independente do Realtime Database, que foi removido. O backend de dados é o ThingSpeak.

### 4.2. Versão do Node

O arquivo [`.nvmrc`](../.nvmrc) fixa **Node 22**. Use `nvm use` antes de buildar o web.

<div style="page-break-after: always;"></div>

## 5. Estrutura do monorepo

```
Projeto Integrador/
├── README.md                 → visão geral (web)
├── package.json              → web (React + Vite)
├── vite.config.js            → bundler (sourcemap on)
├── eslint.config.js          → lint (ignora mobile/)
├── index.html                → entry HTML do dashboard
├── firebase.json             → Firebase Hosting (public: dist, SPA rewrites)
├── .firebaserc               → projeto de hosting: movimenteunifecaf
├── .nvmrc                    → Node 22
├── .gitattributes            → normaliza fins de linha (LF)
├── .env.example              → variáveis do WEB (prefixo VITE_)
│
├── src/                      → ░░ DASHBOARD WEB (React 19) ░░
│   ├── main.jsx              → entry point
│   ├── App.jsx               → composição do dashboard
│   ├── config/thingspeak.js  → config do canal + flags (mock, controle)
│   ├── services/thingspeak.js→ cliente REST (getLatest/getHistory/sendCommand)
│   ├── components/           → UI (cards, header, painéis…)
│   │   └── charts/           → 5 gráficos Recharts
│   ├── hooks/                → useSensorData, useClimateAI, useEventLog
│   ├── ai/                   → pipeline de IA (treino + inferência)
│   ├── utils/                → mockData, pdfExport
│   ├── constants/index.js    → regras, cores, thresholds (CANÔNICO)
│   └── styles/               → CSS (tema claro/escuro)
│
├── mobile/                   → ░░ APP ANDROID (Expo) ░░
│   ├── App.jsx               → providers globais (tema)
│   ├── app.json              → config Expo (ícones, permissões, OTA, extra)
│   ├── eas.json              → perfis de build (apk/aab)
│   ├── .env.example          → variáveis do mobile (prefixo EXPO_PUBLIC_)
│   └── src/
│       ├── navigation/       → stack (abre direto no Dashboard)
│       ├── screens/          → DashboardScreen
│       ├── components/       → UI nativa + charts (Victory/Skia)
│       ├── hooks/            → useNotifications, useOtaUpdate, useSensorData…
│       ├── contexts/         → ThemeContext
│       ├── config/thingspeak.js → config via Expo Constants/env
│       ├── services/thingspeak.js → cliente REST
│       ├── ai/               → cópia da inferência (compartilhada)
│       ├── constants/        → cópia (compartilhada)
│       └── utils/            → cópia mockData + theme + chartFont
│
├── firmware/climacontrol/    → ░░ FIRMWARE ESP32 ░░
│   ├── climacontrol.ino      → setup/loop (publica + polling TalkBack)
│   ├── config.h              → credenciais ThingSpeak + pinagem + tempos
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
└── docs/                     → documentação (este arquivo + THINGSPEAK_SETUP.md)
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

## 6. Modelo de dados (ThingSpeak)

O ThingSpeak organiza os dados num **canal** com até 8 *fields* numéricos. O ESP32 publica os 8 *fields* a cada ciclo; **cada publicação vira uma entrada (`feed`) com timestamp do servidor** (`created_at`) — é assim que o histórico é formado, sem o ESP precisar enviar timestamp nem rodar NTP.

### 6.1. Mapeamento dos *fields* (`FIELD_MAP`)

Fonte da verdade: [`src/config/thingspeak.js`](../src/config/thingspeak.js).

| Field | Grandeza | Tipo / observação |
|---|---|---|
| `field1` | `ocupacao` | inteiro (nº de pessoas) |
| `field2` | `temp_interna` | °C (média dos 2 DHT11 internos) |
| `field3` | `temp_externa` | °C (DHT11 externo) |
| `field4` | `temp_alvo` | °C (**0 = A/C desligado**) |
| `field5` | `umid_interna` | % |
| `field6` | `umid_externa` | % |
| `field7` | `ac_ligado` | 0/1 |
| `field8` | `modo_manual` | 0/1 |

### 6.2. Endpoints do ThingSpeak usados

| Operação | Endpoint | Quem usa |
|---|---|---|
| **Publicar** leitura | `GET /update?api_key=<WRITE>&field1=…&field8=…` | ESP32 |
| **Última leitura** | `GET /channels/<id>/feeds/last.json?api_key=<READ>` | dashboard/app (live) |
| **Histórico** | `GET /channels/<id>/feeds.json?api_key=<READ>&results=N` | dashboard/app (gráficos) |
| **Enfileirar comando** | `POST /talkbacks/<id>/commands.json` (`command_string`, `position=1`) | dashboard/app |
| **Consumir comando** | `POST /talkbacks/<id>/commands/execute.json` | ESP32 (polling) |

### 6.3. Comandos de controle (fila TalkBack)

O TalkBack substitui o antigo nó `/controle` + stream do Firebase. O cliente enfileira um `command_string`; o ESP32 executa um por ciclo de *polling*.

| Comando | Efeito no firmware |
|---|---|
| `AC_ON` / `AC_OFF` | liga/desliga o A/C (entra em **modo manual**) |
| `MANUAL_ON` / `MANUAL_OFF` | alterna o modo manual |
| `TARGET:<n>` | define a temperatura alvo (entra em **modo manual**) |

### 6.4. Eventos (derivados no cliente)

O ThingSpeak **não tem** um conceito de "eventos" como o antigo `/eventos`. O log de eventos do dashboard é **derivado no cliente** varrendo o histórico do canal e detectando transições — ver [`src/hooks/useEventLog.js`](../src/hooks/useEventLog.js):

| `type` | Como é detectado |
|---|---|
| `ac_ligado_auto` | `temp_alvo` foi de 0 para > 0 entre dois pontos |
| `ac_desligado_auto` | `temp_alvo` foi de > 0 para 0 |
| `ocupacao_alta` | ocupação cruzou o limiar alto (`OCCUPANCY_THRESHOLDS.high`) |
| `temp_estabilizada` | `\|temp_interna − temp_alvo\| < 1.5` com A/C ligado |

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
3. Decide a temperatura-alvo (regra `climate.h`) — ou obedece ao modo manual vindo do dashboard via TalkBack.
4. Comanda o A/C por **LED infravermelho**.
5. Publica no ThingSpeak os 8 *fields* (a cada ~20 s — respeitando o rate limit de 15 s do plano gratuito).
6. Faz *polling* da fila **TalkBack** (a cada ~15 s) para reagir a comandos do dashboard.

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
- O firmware só transmite IR **quando o estado realmente muda** (on/off ou nova temperatura), porque cada transmissão bloqueia o loop por ~200 ms.

### 8.6. Lógica de decisão (`decideTarget`)

```
modo_manual = true   → respeita targetTempC recebido via TalkBack
modo_manual = false  → calcula com climate::calcTargetTemp(pessoas, temp_externa)
```

No modo real, a IA é **apenas indicativa** no dashboard; quem decide o alvo é o firmware (regra fixa) ou o usuário (controle manual via TalkBack). Por isso o firmware **não roda o modelo** nem recebe comandos de IA na fila.

### 8.7. Loop principal (tempos)

| Tarefa | Período | Constante |
|---|---|---|
| Atualizar máquina de feixes | ~10 ms | (fixo no loop) |
| Polling da fila TalkBack | 15 s | `TALKBACK_POLL_MS` |
| Ler DHT + decidir + IR + guardar leitura | 5 s | `UPDATE_INTERVAL_MS` |
| Publicar os 8 *fields* no ThingSpeak | 20 s | `THINGSPEAK_UPDATE_MS` |

### 8.8. Conectividade

- **WiFi** (`WIFI_SSID`/`WIFI_PASSWORD`; no Wokwi usa `Wokwi-GUEST` aberto).
- **HTTP simples** (porta 80) ao `http://api.thingspeak.com` via `HTTPClient` do core ESP32 — no Wokwi evita o overhead de TLS, e o ThingSpeak aceita `/update` e TalkBack sem HTTPS.
- **Sem NTP / sem biblioteca Firebase:** os timestamps são do servidor ThingSpeak (`created_at`), então o firmware não precisa sincronizar relógio nem depender de SDK externo.
- **Parsing do TalkBack:** a resposta de `commands/execute.json` traz `command_string`; o firmware extrai o valor e o aplica (`AC_ON`, `TARGET:24`, …).

### 8.9. Build e simulação

```bash
# Hardware real
pio run -e esp32dev
pio run -e esp32dev -t upload

# Simulador Wokwi (define WOKWI_SIMULATION)
pio run -e wokwi
# depois: abrir diagram.json no VS Code (extensão Wokwi) e clicar Play
```

- `board_build.partitions = huge_app.csv` (3 MB p/ a aplicação — IR + WiFi + DHT estouram a partição padrão).
- `lib_ldf_mode = deep+` (resolve includes condicionais das libs).
- Bibliotecas: `DHT sensor library (Adafruit)`, `Adafruit Unified Sensor`, `IRremoteESP8266 (crankyoldgit)`. **`HTTPClient` e `WiFi` vêm no core ESP32** — a integração ThingSpeak não precisa de biblioteca externa.

<div style="page-break-after: always;"></div>

## 9. Componente B — Backend ThingSpeak

> O **ThingSpeak** (MathWorks) é o backend de dados (SaaS), no lugar do antigo Firebase Realtime Database + API REST própria. Guia de configuração: [`docs/THINGSPEAK_SETUP.md`](THINGSPEAK_SETUP.md).

### 9.1. Por que ThingSpeak

O projeto passou a usar o ThingSpeak para que a simulação rodasse no **Wokwi** publicando dados reais numa nuvem de IoT, sem manter banco/servidor próprios. O ThingSpeak oferece:

- **Canal de série temporal** com 8 *fields* e timestamps do servidor — o histórico sai "de graça" (cada publicação é um ponto).
- **API REST de leitura** simples (`feeds.json`) consumível por qualquer cliente.
- **TalkBack**, uma fila de comandos que resolve o *downlink* (cliente → dispositivo) sem precisar de stream bidirecional.

### 9.2. Canal de dados (uplink)

- O ESP32 publica em `GET /update` os 8 *fields* (ver §6.1) a cada ~20 s.
- Cada publicação cria uma entrada (`feed`) com `created_at` (horário do servidor) e `entry_id`.
- O dashboard lê o **último ponto** (`feeds/last.json`) para o estado ao vivo e a **série** (`feeds.json?results=N`) para os gráficos.

### 9.3. Controle (downlink) via TalkBack

Como o ThingSpeak não tem stream, o controle do A/C usa a fila **TalkBack**:

```
 Usuário   Dashboard/App        ThingSpeak (TalkBack)        ESP32      A/C
    │           │                       │                      │         │
    │ clica ───►│ POST commands.json    │                      │         │
    │           │  command_string=      │ enfileira (position1)│         │
    │           │  AC_ON / TARGET:n ───►│                      │         │
    │           │                       │ ◄── execute.json ────│ polling │
    │           │                       │ (entrega + remove)   │ aplica  │
    │           │                       │                      │ IR ────►│
```

- O cliente usa `position: 1` ao enfileirar para que a **ação mais recente** seja a primeira a ser executada.
- O ESP consome **um comando por ciclo de polling** (`commands/execute.json` entrega e remove o próximo da fila).

### 9.4. Cliente REST (web e mobile)

Tanto o web quanto o mobile têm um `services/thingspeak.js` com a mesma superfície:

| Função | O que faz |
|---|---|
| `getLatest()` | `feeds/last.json` → objeto `live` (mapeia `field1..8`) |
| `getHistory(N)` | `feeds.json?results=N` → array de pontos ordenados por tempo |
| `sendCommand(cmd)` | `POST commands.json` (enfileira no TalkBack) |
| `COMMANDS` | helpers: `acOn`, `acOff`, `target(n)`, `manualOn`, `manualOff` |

### 9.5. Limites do plano gratuito

- **Escrita:** 1 a cada **15 s** por canal. O firmware publica a cada 20 s (folga).
- **Leitura:** o dashboard faz *polling* do feed a cada ~15 s (live) e recarrega o histórico a cada ~60 s.
- **Chaves expostas:** Read Key e TalkBack Key vão embutidas no bundle/APK (ver §17).

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
- O alvo "ideal" parte da regra base por pessoas, aplica os descontos por calor externo, ajustes finos e **ruído gaussiano** (σ=0,35) para o modelo não decorar a regra exata. Resultado arredondado e limitado a **[16, 28]**.

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
- Ao final, salva o modelo em `public/ai-model/` e o `normalization.json`, e imprime uma checagem de sanidade.

```bash
node src/ai/generateDataset.js   # gera src/ai/data/dataset.json
node src/ai/trainModel.js        # treina → public/ai-model/
node src/ai/exportWeights.js     # exporta pesos → src/ai/modelWeights.js
```

### 10.5. Inferência sem TensorFlow (chave do projeto)

Para rodar **no navegador e no celular sem carregar o TensorFlow** (que é pesado), os pesos treinados são exportados (`exportWeights.js`) para um objeto JS (`modelWeights.js`), e `pureInference.js` reimplementa o *forward pass* manualmente.

`climateAI.js` orquestra:

- `predictTargetTemp(pessoas, tempInt, tempExt)`:
  - `pessoas <= 0` → retorna 0 (desligado).
  - Sem pesos ou erro → **fallback** para a regra determinística (`calcTargetTemp`).
  - Sucesso → arredonda e **limita a [16, 28]**.
- `getAIDiagnostics()` expõe: modelo carregado, versão (**1.0.0**), última predição, tempo de inferência, fallback, último erro.

### 10.6. Integração com o cliente (`useClimateAI`)

- Inicializa a IA; estado: `loading → ready` (ou `fallback`).
- **Debounce de recálculo**: ao mudar a ocupação, espera `AI_RECALC_DELAY_MS = 15 s`; intervalo mínimo entre predições `AI_MIN_PREDICT_INTERVAL_MS = 5 s`.
- **Confiança** (`low/medium/high`) pela faixa das entradas.
- **No modo real**, a IA é **apenas indicativa**: o card "IA Clima" mostra `tempAlvoIA`, mas o app **não enfileira comandos de IA** no TalkBack (para não poluir a fila de controle). O alvo efetivo vem do firmware (regra) ou do usuário (manual). **No modo simulação (mock)**, a IA ajusta o estado local diretamente para demonstração.

<div style="page-break-after: always;"></div>

## 11. Componente D — Dashboard Web (React)

> Pasta: [`src/`](../src/). React 19 + Vite 8. Em produção: `https://movimenteunifecaf.web.app` (Firebase Hosting, só CDN estático). É também uma **PWA**.

### 11.1. Funcionalidades

- **Abre direto** (sem login — o ThingSpeak não autentica usuários).
- **Cards de métricas**: pessoas, temp. interna/externa, temp. alvo, umidade, eficiência, IA.
- **5 gráficos** (Recharts, *lazy-loaded*): temperatura, ocupação, umidade, uso do A/C e comparação IA × regra.
- **Painel de controle**: ligar/desligar, ajustar temperatura, alternar modo manual (via TalkBack).
- **Log de eventos** (derivado das transições do feed).
- **Tabela de regras** de climatização.
- **Painel de status do sistema** (sensores/conexão).
- **Painel de IA** (`AIInsightsPanel`): recomendação, confiança, diagnóstico.
- **Seletor de período** (1h/4h/8h/12h) e **tema claro/escuro**.
- **Exportação em PDF** do histórico (jsPDF + autotable).

### 11.2. Hooks principais

| Hook | Papel |
|---|---|
| `useSensorData` | Faz *polling* do feed ThingSpeak (live ~15 s, histórico ~60 s); gera mock quando aplicável; expõe `setAcOn`, `setTargetTemp`, `setManualMode` que enfileiram comandos **TalkBack** (com atualização otimista do estado local). |
| `useClimateAI` | Inferência da IA com debounce e confiança (ver §10.6). |
| `useEventLog` | Deriva o log de eventos varrendo o histórico do canal. |

### 11.3. Modos de operação

| Cenário | `VITE_THINGSPEAK_*` | `VITE_USE_MOCK_DATA` | Dashboard |
|---|---|---|---|
| **Produção** (ESP32 publicando) | preenchido | `false` | lê o canal real (*polling*) |
| **Demo** | qualquer | `true` | Mock local |
| **Sem config** | vazio | qualquer | cai em mock automaticamente |

> Se `VITE_THINGSPEAK_CHANNEL_ID`/`READ_KEY` não estiverem preenchidas, o app cai em **modo simulação automaticamente** — `npm run dev` nunca quebra. Sem `VITE_THINGSPEAK_TALKBACK_*`, o controle do A/C fica desabilitado (dashboard só de leitura). No modo simulação, o header mostra a pill "Modo simulação".

### 11.4. Cliente do ThingSpeak (`services/thingspeak.js`)

- `getLatest()` / `getHistory()` para leitura; `sendCommand()` para controle (TalkBack).
- Mapeia `field1..8` → objeto `live` e pontos de histórico (`mapFeedToLive` / `mapFeedToHistory`).
- `controlEnabled` (de `config/thingspeak.js`) sinaliza se o TalkBack está configurado.

### 11.5. PWA

- `manifest.webmanifest`: nome, ícones, `display: standalone`, cores de tema.
- `sw.js` (service worker): *cache-first com atualização em rede* para estáticos da própria origem; **ignora** as requisições à API do ThingSpeak; limpa caches antigos no `activate`.

### 11.6. Build e deploy

```bash
npm install
cp .env.example .env     # preencher as chaves do ThingSpeak
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
| **Abre direto** (sem login) | — |
| **Push notifications** | `expo-notifications` (canal "alerts"; alerta de A/C on/off e temp. alta > 32 °C) |
| **Atualizações OTA** | `expo-updates` (canal `production`, `runtimeVersion: appVersion`) |
| Tema claro/escuro/auto | `ThemeContext` persistido em AsyncStorage |
| 4 gráficos animados | Victory Native v41 + Skia |
| Controle manual | Switch + Slider nativo + **Haptics** (via TalkBack) |
| Pull-to-refresh | nativo |
| Splash + ícone adaptive | `expo-splash-screen`, adaptive icon |

### 12.2. Hooks/contextos específicos do mobile

| Item | Papel |
|---|---|
| `ThemeContext` | Estado global de tema (provider em `App.jsx`). |
| `useSensorData` / `useEventLog` | Mesma lógica do web (polling + TalkBack + eventos derivados). |
| `useNotifications` | Permissão, canal Android, alertas em mudança de A/C e temperatura alta. |
| `useOtaUpdate` | Checa update ao abrir e ao voltar do background; `apply()` reinicia na nova versão. |

### 12.3. Configuração (Expo)

- ThingSpeak lido de `EXPO_PUBLIC_THINGSPEAK_*` (env) **ou** de `app.json → expo.extra` (`thingspeakChannelId`, `thingspeakReadKey`, `thingspeakTalkbackId`, `thingspeakTalkbackKey`, `thingspeakResults`). Detecta placeholders (`REPLACE_WITH_*`) e cai em mock.
- Mesma lógica de modos do web (mock × real).

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
 Sensores        ESP32            ThingSpeak          Dashboard/App
    │              │                    │                   │
    │ dist+temp    │                    │                   │   ── tick 5s ──
    │─────────────►│                    │                   │
    │              │ conta pessoas      │                   │
    │              │ decideTarget()     │                   │
    │ ◄── IR (só se o estado mudou)     │                   │
    │              │                    │                   │   ── publish 20s ──
    │              │ GET /update ──────►│ (feed +           │
    │              │ (8 fields)         │  created_at)      │
    │              │                    │ ◄── polling 15s ──│  cards / gráficos
    │              │                    │ feeds/last.json   │
```

### 13.2. Controle manual (dashboard → A/C) via TalkBack

```
 Usuário   Dashboard/App     ThingSpeak (TalkBack)    ESP32    A/C
    │           │                    │                  │       │
    │ clica/    │                    │                  │       │
    │ ajusta ──►│ POST commands.json │                  │       │
    │           │ command_string=    │ enfileira        │       │
    │           │ AC_ON / TARGET:n ─►│ (position 1)     │       │
    │           │ (atualização       │                  │       │
    │           │  otimista local)   │ ◄── execute.json─│ polling
    │           │                    │ (entrega+remove) │ aplica
    │           │                    │                  │ IR ──►│
```

> Sem `VITE_THINGSPEAK_TALKBACK_*` (ou `EXPO_PUBLIC_…`), `sendCommand` falha de forma controlada e o controle fica desabilitado.

### 13.3. Ajuste automático pela IA

```
 Cliente (Web/Mobile)    climateAI (local)
    │                          │
    │ predict(pessoas,         │
    │  tInt, tExt) ───────────►│
    │◄── temp_alvo (ou regra)  │
    │
    │ Modo real: apenas exibe no card "IA Clima" (indicativo).
    │ Modo mock: ajusta o estado local para demonstração.
    │ (O firmware decide o alvo real pela regra fixa; o usuário, pelo manual.)
```

<div style="page-break-after: always;"></div>

## 14. Configuração e variáveis de ambiente

O projeto tem **dois arquivos `.env` separados** (web e mobile). Eles **não** se unificam — cada ferramenta lê o `.env` da própria pasta. As mesmas chaves de leitura/TalkBack do ThingSpeak são usadas nos dois.

```
┌──────────────────────────────────────┐ ┌──────────────────────────────────────┐
│ .env (raiz) — WEB · Vite              │ │ mobile/.env — Expo                    │
│ prefixo VITE_                         │ │ prefixo EXPO_PUBLIC_                  │
│                                       │ │                                       │
│ • VITE_THINGSPEAK_CHANNEL_ID          │ │ • EXPO_PUBLIC_THINGSPEAK_CHANNEL_ID   │
│ • VITE_THINGSPEAK_READ_KEY            │ │ • EXPO_PUBLIC_THINGSPEAK_READ_KEY     │
│ • VITE_THINGSPEAK_TALKBACK_ID         │ │ • EXPO_PUBLIC_THINGSPEAK_TALKBACK_ID  │
│ • VITE_THINGSPEAK_TALKBACK_KEY        │ │ • EXPO_PUBLIC_THINGSPEAK_TALKBACK_KEY │
│ • VITE_THINGSPEAK_RESULTS             │ │ • EXPO_PUBLIC_THINGSPEAK_RESULTS      │
│ • VITE_USE_MOCK_DATA                  │ │ • EXPO_PUBLIC_USE_MOCK_DATA           │
└──────────────────────────────────────┘ └──────────────────────────────────────┘
        (mobile também aceita os valores em app.json → expo.extra)
```

### 14.1. Web (`.env` na raiz — prefixo `VITE_`)

| Variável | Descrição |
|---|---|
| `VITE_THINGSPEAK_CHANNEL_ID` | ID numérico do canal de dados |
| `VITE_THINGSPEAK_READ_KEY` | Read API Key do canal |
| `VITE_THINGSPEAK_TALKBACK_ID` | ID da fila TalkBack (controle) |
| `VITE_THINGSPEAK_TALKBACK_KEY` | TalkBack API Key |
| `VITE_THINGSPEAK_RESULTS` | Nº de pontos do histórico (default 200) |
| `VITE_USE_MOCK_DATA` | `false` = canal real; `true` = simulação |

> ⚠️ Tudo que começa com `VITE_` é **embutido no bundle público**. As chaves do ThingSpeak ficam expostas — ver §17.

### 14.2. Mobile (`mobile/.env` — prefixo `EXPO_PUBLIC_`)

Mesmos valores com prefixo `EXPO_PUBLIC_THINGSPEAK_*`, mais `EXPO_PUBLIC_USE_MOCK_DATA`. Alternativa para builds EAS: `app.json → expo.extra` (`thingspeakChannelId`, etc.).

### 14.3. Firmware (`firmware/climacontrol/config.h`)

| Macro | Descrição |
|---|---|
| `WIFI_SSID` / `WIFI_PASSWORD` | rede WiFi (no Wokwi, `Wokwi-GUEST` aberto via `WOKWI_SIMULATION`) |
| `THINGSPEAK_WRITE_KEY` | Write API Key do canal (publica os *fields*) |
| `THINGSPEAK_TALKBACK_ID` / `THINGSPEAK_TALKBACK_KEY` | fila de comandos (controle) |
| `THINGSPEAK_UPDATE_MS` | intervalo de publicação (20 s) |
| `TALKBACK_POLL_MS` | intervalo de polling do TalkBack (15 s) |

<div style="page-break-after: always;"></div>

## 15. Como executar (passo a passo)

### 15.1. Pré-requisitos

- **Node.js 22** (`nvm use` lê o `.nvmrc`).
- Conta **ThingSpeak** (gratuita) com um canal de 8 *fields* + uma fila TalkBack (ver [`docs/THINGSPEAK_SETUP.md`](THINGSPEAK_SETUP.md)).
- Para o mobile: conta Expo (gratuita); para o APK, `eas-cli`.
- Para o firmware: PlatformIO (ou Arduino IDE) e, opcionalmente, a extensão Wokwi.

### 15.2. Dashboard web

```bash
npm install
cp .env.example .env          # preencher as chaves do ThingSpeak (ou deixar vazio p/ mock)
npm run dev                   # http://localhost:5173
```

### 15.3. App mobile

```bash
cd mobile
npm install
cp .env.example .env          # (opcional — mock funciona sem)
npm start                     # QR code com Expo Go
```

### 15.4. Firmware

1. Preencher `firmware/climacontrol/config.h` (WiFi, `THINGSPEAK_WRITE_KEY`, `THINGSPEAK_TALKBACK_ID/KEY`).
2. `pio run -e wokwi` (simulador) ou `pio run -e esp32dev -t upload` (placa real).

### 15.5. Scripts úteis (raiz)

```bash
npm run lint          # ESLint
npm run test          # Vitest (web)
npm run check:sync    # verifica web ↔ mobile sincronizados
npm run build         # build de produção
```

<div style="page-break-after: always;"></div>

## 16. Deploy / publicação

### 16.1. Dashboard → Firebase Hosting

O Firebase Hosting é usado apenas como CDN estático (não há mais Realtime Database).

```bash
nvm use
npm run build
firebase deploy --only hosting   # → movimenteunifecaf.web.app
```

> As chaves do ThingSpeak vão embutidas no build. Para um build de produção conectado ao canal real, defina-as no ambiente de build e use `VITE_USE_MOCK_DATA=false`.

### 16.2. App → EAS Build / OTA

```bash
npm install -g eas-cli && eas login
eas build:configure
npm run build:apk        # APK (instalar direto no celular)
npm run build:aab        # AAB (Play Store)
npm run update           # publicar atualização OTA
```

### 16.3. Firmware → Wokwi / placa

- **Wokwi:** `pio run -e wokwi`, abrir `diagram.json` e clicar Play (a gateway do Wokwi dá internet real ao ESP32, que publica no ThingSpeak).
- **Placa real:** `pio run -e esp32dev -t upload`.

<div style="page-break-after: always;"></div>

## 17. Segurança

### 17.1. Modelo de exposição (apps client-side no ThingSpeak)

O dashboard web e o app mobile são clientes públicos. As chaves do ThingSpeak embutidas neles ficam **visíveis** para quem inspecionar o bundle/APK:

| Chave | Onde vai | Risco |
|---|---|---|
| **Read API Key** | web + mobile | leitura do canal (dados de ocupação/temperatura) |
| **TalkBack API Key** | web + mobile | enfileirar comandos de controle do A/C |
| **Write API Key** | só no firmware (`config.h`) | publicar leituras no canal |

É uma **limitação conhecida** de aplicações client-side no ThingSpeak — não há um backend próprio para esconder as chaves (esse era o papel da antiga API REST, removida). Para um projeto acadêmico é aceitável; em produção real, colocaria-se um proxy/backend para guardar as chaves.

### 17.2. Boas práticas adotadas

| Camada | Medida |
|---|---|
| **Transporte** | HTTPS no Hosting e nas leituras do dashboard ao ThingSpeak. (O firmware usa HTTP no Wokwi por simplicidade do simulador.) |
| **Escopo das chaves** | A Write Key (publicação) fica **só** no firmware; o cliente nunca publica leituras, só lê e enfileira comandos. |
| **Mínima superfície** | Sem login/credenciais de usuário para vazar; o app não guarda dados pessoais. |
| **Rotação** | Se uma chave vazar, basta **regenerá-la** na aba *API Keys* (web/mobile) ou na config do TalkBack. |
| **PWA** | O service worker ignora as requisições ao ThingSpeak (não cacheia dados sensíveis). |

### 17.3. Ações recomendadas

- Manter o canal **privado** (ou ciente de que, se público, qualquer um lê o feed).
- **Regenerar** as chaves do ThingSpeak após a entrega/demonstração, se tiverem sido expostas em vídeo/repo.
- Não reaproveitar as chaves do ThingSpeak em nenhum outro serviço sensível.

<div style="page-break-after: always;"></div>

## 18. Testes, qualidade e CI/CD

| Mecanismo | O que faz | Onde |
|---|---|---|
| **Vitest (web)** | Testes de unidade (constants, mockData, IA: climateAI, dataset, pureInference) | `src/**/*.test.js`, `src/ai/__tests__/` |
| **ESLint** | Lint do front (React Hooks, refresh) | `eslint.config.js` |
| **Husky + lint-staged** | Hook de pré-commit roda `eslint --fix` nos `*.{js,jsx}` staged | `.husky/` |
| **check:sync** | Garante que os módulos compartilhados web↔mobile não divergem | `scripts/check-shared-sync.mjs` |
| **.gitattributes** | Normaliza fins de linha (LF) | `.gitattributes` |

Comandos:

```bash
npm run test            # vitest (32 casos)
npm run lint            # eslint
npm run check:sync      # sincronia web/mobile
```

> O mobile não tem suíte de testes própria nem é coberto pelo ESLint da raiz (é ignorado na config). As validações de lógica pura compartilhada (IA, regras, mock) rodam via Vitest na web e valem para o mobile por causa do `check:sync`.

<div style="page-break-after: always;"></div>

## 19. Integração multidisciplinar

O projeto integra **quatro áreas**, cada uma com contribuição concreta:

```
                                Movement
        ┌──────────────┬──────────────────┬──────────────────┬──────────────┐
        ▼              ▼                  ▼                  ▼              ▼
  Eletrônica /     IA / Pesquisa     Engenharia de        UX / UI
   Física          Operacional        Software
  • ESP32 +        • Rede neural      • Integração IoT     • Painéis e
    sensores         (regressão)        (ThingSpeak +        gráficos
  • Termodinâmica  • Otimização        TalkBack, polling)  • Tema claro/
    (ocupação ×      conforto ×        • Lógica compart.      escuro
    calor → alvo)    consumo             web↔mobile + IA    • PWA
  • Emissão IR     • Fallback          • Dashboard React
    ao A/C           determinístico      + App Expo
```

| Área | Contribuição | Evidência |
|---|---|---|
| **Eletrônica / Física aplicada** | Firmware ESP32, leitura de sensores, contagem direcional, emissão IR, termodinâmica da regra | `firmware/climacontrol/` |
| **IA / Pesquisa Operacional** | Modelo que otimiza a temperatura-alvo (conforto × consumo) | `src/ai/` |
| **Engenharia de Software** | Integração IoT via ThingSpeak/TalkBack, lógica compartilhada com verificação de sincronia, dashboard e app | `src/`, `mobile/` |
| **UX/UI** | Design do dashboard, gráficos, tema, PWA | `src/components/`, `mobile/src/` |

<div style="page-break-after: always;"></div>

## 20. Glossário

| Termo | Significado |
|---|---|
| **ThingSpeak** | Plataforma de IoT da MathWorks; canais de série temporal com até 8 *fields*, API REST de leitura e fila TalkBack. |
| **Field** | Cada uma das 8 colunas numéricas de um canal ThingSpeak. |
| **Feed** | Uma entrada (linha) do canal, com `created_at` e os *fields*. |
| **TalkBack** | Fila de comandos do ThingSpeak; resolve o *downlink* (cliente → dispositivo) sem stream. |
| **Polling** | Consultar periodicamente um endpoint (em vez de receber *push*/stream). |
| **DHT11** | Sensor digital de temperatura e umidade. |
| **HC-SR04** | Sensor ultrassônico de distância (usado aqui para contagem de pessoas). |
| **OTA** | *Over-the-Air* — atualização do app sem reinstalar o APK (Expo Updates). |
| **PWA** | *Progressive Web App* — site instalável com service worker e manifesto. |
| **Rate limit** | Limite de requisições; no plano free do ThingSpeak, 1 escrita a cada 15 s. |
| **temp_alvo / set-point** | Temperatura desejada do A/C. |
| **Wokwi** | Simulador online de ESP32 (com internet real) usado para rodar o firmware. |

<div style="page-break-after: always;"></div>

## 21. Apêndices

### 21.1. Exemplos de requisições ao ThingSpeak

**Publicar leitura (firmware):**
```bash
curl "http://api.thingspeak.com/update?api_key=WRITE_KEY&field1=12&field2=22.4&field3=31.2&field4=21&field5=55&field6=68&field7=1&field8=0"
# resposta: o entry_id (>0) em sucesso, ou 0 se rejeitado (rate limit)
```

**Última leitura (dashboard live):**
```bash
curl "https://api.thingspeak.com/channels/CHANNEL_ID/feeds/last.json?api_key=READ_KEY"
# {"created_at":"...","entry_id":42,"field1":"12","field2":"22.4",...}
```

**Histórico (gráficos):**
```bash
curl "https://api.thingspeak.com/channels/CHANNEL_ID/feeds.json?api_key=READ_KEY&results=200"
# {"channel":{...},"feeds":[{...},{...}]}
```

**Enfileirar comando (controle):**
```bash
curl -X POST "https://api.thingspeak.com/talkbacks/TALKBACK_ID/commands.json" \
  -d "api_key=TALKBACK_KEY&command_string=TARGET:24&position=1"
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
| `UPDATE_INTERVAL_MS` | 5000 ms | web/firmware (tick local) |
| `THINGSPEAK_UPDATE_MS` | 20000 ms | firmware (publicação) |
| `TALKBACK_POLL_MS` | 15000 ms | firmware (polling controle) |
| `POLL_INTERVAL_MS` | 15000 ms | web/mobile (leitura do feed) |
| `HISTORY_REFRESH_MS` | 60000 ms | web/mobile (recarga do histórico) |
| `HISTORY_MAX_POINTS` | 500 | web |
| `MIN_TARGET_TEMP` | 16 °C | web/firmware/IA |
| `AI_MAX_TARGET_TEMP` | 28 °C | web/IA |
| `AI_RECALC_DELAY_MS` | 15000 ms | web (debounce IA) |
| `AI_MODEL_VERSION` | 1.0.0 | IA |
| `BEAM_DISTANCE_CM` | 30 cm | firmware |
| `BEAM_PAIR_WINDOW_MS` | 2000 ms | firmware |
| `BEAM_RELEASE_MS` | 1500 ms | firmware |

### 21.4. Links

- **Repositório:** https://github.com/JoaoGabriel1601/Projeto-Integrador
- **Dashboard:** https://movimenteunifecaf.web.app
- **ThingSpeak:** https://thingspeak.com
- **Documentos complementares** (nesta pasta `docs/`):
  - [`THINGSPEAK_SETUP.md`](THINGSPEAK_SETUP.md) — como criar o canal e a fila TalkBack e preencher as chaves.

---

<div align="center"><strong>Movement — UNIFECAF</strong><br/>Climatização autônoma · ESP32 + ThingSpeak + React/Expo.</div>
