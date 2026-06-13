# ClimaControl — Dashboard de Climatização Autônoma

<p align="center">
  <img src="public/favicon.svg" width="120" alt="ClimaControl logo" />
</p>

Dashboard React para um sistema de climatização autônoma baseado em ESP32 + ThingSpeak. Monitora ocupação, temperatura interna/externa e umidade, e calcula a temperatura alvo do A/C automaticamente conforme a quantidade de pessoas e o calor externo. O ESP32 (simulado no Wokwi) publica as leituras num canal ThingSpeak; o dashboard lê o feed por polling e controla o A/C pela fila TalkBack.

> **Projeto Integrador — UNIFECAF**

| Plataforma | Localização | Tech |
|---|---|---|
| 🌐 **Web** (este repo) | `src/` | React 19 + Vite 8 + Recharts |
| 📱 **Android APK** | [`mobile/`](mobile/) | Expo SDK 52 + React Native + Victory Native |
| **Contrato API** | https://projeto-integrador-ten-steel.vercel.app/api-docs/  |

> O app mobile reutiliza ~70% deste código (hooks, constants, mock, regras). Ver [`mobile/README.md`](mobile/README.md) para build do APK.

## Stack

| Camada | Tecnologia |
|---|---|
| UI | React 19 + Vite 8 |
| Gráficos | Recharts 3 |
| Backend | ThingSpeak (canal de dados + TalkBack para controle) |
| Hospedagem | Host estático (build `dist/` — Vercel/Netlify/GitHub Pages/etc.) |
| Hardware | ESP32 + DHT22 + motion-sensor + LED IR |

## Setup

```bash
npm install
cp .env.example .env
# preencha .env com as chaves do seu canal ThingSpeak
npm run dev
```

### Variáveis de ambiente

| Nome | Descrição |
|---|---|
| `VITE_THINGSPEAK_CHANNEL_ID` | ID numérico do canal de dados |
| `VITE_THINGSPEAK_READ_KEY` | Read API Key do canal |
| `VITE_THINGSPEAK_TALKBACK_ID` | ID da fila TalkBack (controle) |
| `VITE_THINGSPEAK_TALKBACK_KEY` | TalkBack API Key |
| `VITE_THINGSPEAK_RESULTS` | Nº de pontos do histórico (default 200) |
| `VITE_USE_MOCK_DATA` | `false` (default) lê o canal real; `true` força dados simulados |

> Se `VITE_THINGSPEAK_CHANNEL_ID`/`READ_KEY` não estiverem preenchidas, o app cai em modo simulação automaticamente. Para uma demo sem o ESP32, defina `VITE_USE_MOCK_DATA=true`. Sem `VITE_THINGSPEAK_TALKBACK_*`, o controle do A/C fica desabilitado (dashboard só de leitura).
>
> ⚠️ Tudo com prefixo `VITE_` é embutido no bundle público — as chaves do ThingSpeak ficam expostas no navegador (limitação conhecida de apps client-side; aceitável para o projeto acadêmico). Não reaproveite essas chaves em nada sensível.

## Scripts

```bash
npm run dev       # servidor local (http://localhost:5173)
npm run build     # build de produção em dist/
npm run preview   # serve dist/ localmente
npm run lint      # ESLint
npm run test      # Vitest (uma execução)
npm run test:watch
```

## Arquitetura

Monorepo com três frentes:

```
.
├── src/          dashboard web (React 19 + Vite)
├── mobile/       app Android (Expo + React Native)
├── firmware/     ESP32 (Arduino/PlatformIO + Wokwi)
├── public/       estáticos + modelo de IA exportado (ai-model/)
└── docs/         documentação de apresentação e deploy
```

### `src/` (web)

```
src/
├── App.jsx                   composição do dashboard
├── main.jsx                  entry point
├── config/
│   └── thingspeak.js         config do canal + flags (mock, controle)
├── components/
│   ├── Header.jsx
│   ├── MetricCard.jsx
│   ├── StatusPill.jsx
│   ├── SectionTitle.jsx
│   ├── CustomTooltip.jsx
│   ├── PeriodSelector.jsx
│   ├── ThemeToggle.jsx
│   ├── ControlPanel.jsx
│   ├── EventLog.jsx
│   ├── RulesTable.jsx
│   ├── SystemStatus.jsx
│   ├── AIInsightsPanel.jsx   recomendações do modelo de IA
│   ├── icons.jsx             ícones SVG inline
│   └── charts/
│       ├── index.js
│       ├── ChartTemperature.jsx
│       ├── ChartOccupancy.jsx
│       ├── ChartHumidity.jsx
│       ├── ChartAcUsage.jsx
│       └── ChartAIComparison.jsx
├── hooks/
│   ├── useSensorData.js      polling do feed + fallback mock + ações de controle (TalkBack)
│   ├── useEventLog.js        eventos derivados das transições do feed
│   └── useClimateAI.js       inferência do modelo de IA
├── services/
│   └── thingspeak.js         cliente REST (getLatest, getHistory, sendCommand)
├── ai/                       pipeline de IA (treino + inferência, ver abaixo)
│   ├── generateDataset.js    gera dataset sintético
│   ├── trainModel.js         treina o modelo (tfjs-node)
│   ├── exportWeights.js      exporta pesos para modelWeights.js
│   ├── climateAI.js          carrega o modelo (tfjs)
│   ├── pureInference.js      inferência sem tfjs (usada no mobile)
│   ├── modelWeights.js       pesos gerados (não editar à mão)
│   └── data/dataset.json
├── utils/
│   ├── mockData.js           geração de dados simulados
│   └── pdfExport.js          export PDF (jsPDF)
├── constants/
│   └── index.js              cores, regras, thresholds, sensores
└── styles/
    ├── theme.css             variáveis CSS (claro/escuro)
    ├── dashboard.css         layout
    └── components.css        cards, botões, etc.
```

### Pipeline de IA

O modelo (rede neural que prevê a temperatura-alvo ideal) é treinado offline e
embarcado no app. Para regenerar:

```bash
node src/ai/generateDataset.js   # gera src/ai/data/dataset.json
node src/ai/trainModel.js        # treina → public/ai-model/
node src/ai/exportWeights.js     # exporta pesos → src/ai/modelWeights.js
```

## Mapeamento do canal ThingSpeak

O ESP32 publica em `https://api.thingspeak.com/update` os 8 fields do canal.
Cada publicação vira um ponto no histórico (o dashboard lê o feed). Fonte da
verdade do mapeamento: [`src/config/thingspeak.js`](src/config/thingspeak.js) (`FIELD_MAP`).

| Field | Grandeza | Observação |
|---|---|---|
| `field1` | ocupação | inteiro |
| `field2` | temp_interna | média do DHT interno |
| `field3` | temp_externa | DHT externo |
| `field4` | temp_alvo | 0 = A/C desligado |
| `field5` | umid_interna | % |
| `field6` | umid_externa | % |
| `field7` | ac_ligado | 0/1 |
| `field8` | modo_manual | 0/1 |

### Controle via TalkBack

O dashboard enfileira comandos em `/talkbacks/<id>/commands/execute`; o ESP32
consome em `/talkbacks/<id>/commands/execute.json` por polling:

| Comando | Efeito |
|---|---|
| `AC_ON` / `AC_OFF` | liga/desliga o A/C (entra em modo manual) |
| `MANUAL_ON` / `MANUAL_OFF` | alterna o modo manual |
| `TARGET:<n>` | define a temperatura alvo (entra em modo manual) |

> Os "eventos recentes" não existem como armazenamento no ThingSpeak — são
> derivados no cliente varrendo as transições do feed (A/C ligou/desligou,
> ocupação alta, temperatura estabilizada). Ver [`src/hooks/useEventLog.js`](src/hooks/useEventLog.js).

## Regras de climatização

| Pessoas | Temp. base | Se ext > 30°C | Se ext > 35°C |
|---|---|---|---|
| 0 | Desligado | — | — |
| 1–5 | 24°C | 23°C | 22°C |
| 6–15 | 22°C | 21°C | 20°C |
| 16–30 | 20°C | 19°C | 18°C |
| 30+ | 18°C | 17°C | 16°C |

Implementação canônica em [`src/constants/index.js`](src/constants/index.js) (`calcTargetTemp`).

## Deploy

```bash
npm run build       # gera dist/ (SPA estática)
npm run preview     # serve dist/ localmente para conferir
```

O `dist/` é uma SPA estática — publique em qualquer host estático (Vercel,
Netlify, GitHub Pages, Cloudflare Pages, etc.). As chaves do ThingSpeak vão
embutidas no build; configure-as no ambiente de build antes do `npm run build`.

## Modo simulação vs. ThingSpeak

| Cenário | `VITE_THINGSPEAK_*` | `VITE_USE_MOCK_DATA` | Dashboard |
|---|---|---|---|
| **Produção** (ESP32 publicando) | preenchido | `false` | lê o canal real (polling) |
| **Demo** | qualquer | `true` | Mock local |
| **Sem config** | vazio | qualquer | cai em mock automaticamente |

Quando o modo simulação está ativo, o header mostra a pill "Modo simulação" em laranja, e o ControlPanel apenas atualiza estado local (não envia comandos TalkBack). Se as variáveis `VITE_THINGSPEAK_*` não estiverem preenchidas, o app cai em modo simulação automaticamente — `npm run dev` nunca quebra.

O dashboard abre direto, sem tela de login (a autenticação por Firebase Auth foi removida na migração para o ThingSpeak).
