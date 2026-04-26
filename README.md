# ClimaControl — Dashboard de Climatização Autônoma

<p align="center">
  <img src="public/favicon.svg" width="120" alt="ClimaControl logo" />
</p>

Dashboard React em tempo real para um sistema de climatização autônoma baseado em ESP32 + Firebase. Monitora ocupação, temperatura interna/externa e umidade, e calcula a temperatura alvo do A/C automaticamente conforme a quantidade de pessoas e o calor externo.

> **Projeto Integrador — UNIFECAF**

| Plataforma | Localização | Tech |
|---|---|---|
| 🌐 **Web** (este repo) | `src/` | React 19 + Vite 8 + Recharts |
| 📱 **Android APK** | [`mobile/`](mobile/) | Expo SDK 52 + React Native + Victory Native |

> O app mobile reutiliza ~70% deste código (hooks, constants, mock, regras). Ver [`mobile/README.md`](mobile/README.md) para build do APK.

## Stack

| Camada | Tecnologia |
|---|---|
| UI | React 19 + Vite 8 |
| Gráficos | Recharts 3 |
| Backend | Firebase Realtime Database |
| Hospedagem | Firebase Hosting |
| Hardware | ESP32 + DHT11 + TCRT5000 + LED IR |

## Setup

```bash
npm install
cp .env.example .env
# preencha .env com as credenciais do projeto Firebase
npm run dev
```

### Variáveis de ambiente

| Nome | Descrição |
|---|---|
| `VITE_FIREBASE_API_KEY` | API key do projeto Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | `<projeto>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ID do projeto |
| `VITE_FIREBASE_STORAGE_BUCKET` | Bucket de storage |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ID de mensageria |
| `VITE_FIREBASE_APP_ID` | App ID Web |
| `VITE_FIREBASE_MEASUREMENT_ID` | Measurement ID (Analytics) |
| `VITE_FIREBASE_DATABASE_URL` | URL do Realtime Database |
| `VITE_USE_MOCK_DATA` | `true` para usar dados simulados, `false` para Firebase real |
| `VITE_SKIP_AUTH` | `true` pula a tela de login (use só em dev) |

> Por padrão `VITE_USE_MOCK_DATA=true`. Mude para `false` quando o ESP32 estiver gravando no Realtime Database.

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

```
src/
├── App.jsx                   composição do dashboard
├── main.jsx                  entry point
├── config/
│   └── firebase.js           inicialização (carrega só se !mock)
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
│   ├── icons.jsx             ícones SVG inline
│   └── charts/
│       ├── ChartTemperature.jsx
│       ├── ChartOccupancy.jsx
│       └── ChartHumidity.jsx
├── hooks/
│   ├── useSensorData.js      leitura real-time + fallback mock + ações de controle
│   ├── useEventLog.js        log de eventos
│   └── useAuth.js            autenticação Firebase (email/senha)
├── utils/
│   ├── mockData.js           geração de dados simulados
│   └── csvExport.js          export CSV
├── constants/
│   └── index.js              cores, regras, thresholds, sensores
└── styles/
    ├── theme.css             variáveis CSS (claro/escuro)
    ├── dashboard.css         layout
    └── components.css        cards, botões, etc.
```

## Schema do Realtime Database

```jsonc
{
  "sensores": {
    "ocupacao": 12,
    "temp_interna": 22.4,
    "temp_externa": 31.2,
    "temp_alvo": 21,
    "umid_interna": 55,
    "umid_externa": 68,
    "ac_ligado": true,
    "modo_manual": false
  },
  "controle": {
    "ac_ligado": true,
    "modo_manual": false,
    "temp_alvo": 22
  },
  "historico": {
    "<pushId>": {
      "t": 1714000000000,  // timestamp ms
      "o": 12,             // ocupação
      "ti": 22.4,          // temp interna
      "te": 31.2,          // temp externa
      "ta": 21,            // temp alvo
      "ui": 55,            // umidade interna
      "ue": 68             // umidade externa
    }
  },
  "eventos": {
    "<pushId>": {
      "type": "ac_ligado_manual",
      "timestamp": 1714000000000,
      "payload": null
    }
  }
}
```

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
npm run build
npx firebase deploy --only hosting
```

Há também workflow do GitHub Actions em [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) que faz deploy automático quando há push para `main`. Veja [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md) para os secrets necessários.

## Modo simulação vs. Firebase

O dashboard tem dois modos, controlados por `VITE_USE_MOCK_DATA`:

- **`true`** — gera dados localmente, atualiza a cada 5s. Útil em desenvolvimento e em demonstrações sem hardware ligado.
- **`false`** — conecta ao Realtime Database e ouve `sensores`, `historico` e `.info/connected`.

O ControlPanel, em modo simulação, mostra um aviso e não envia escritas.

## Autenticação

O dashboard requer login (email/senha) via Firebase Auth. Crie usuários no console Firebase em **Authentication → Users → Add user**.

A autenticação é **independente do modo de dados**: você consegue logar e ver mock data, ou logar e ver Firebase real, conforme `VITE_USE_MOCK_DATA`. Para pular o login em desenvolvimento, defina `VITE_SKIP_AUTH=true`.

## Segurança

Veja [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md) para as ações que precisam ser feitas no console Firebase (rotação de API key e Security Rules).
