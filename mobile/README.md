# 📱 ClimaControl Mobile

App Android nativo do **ClimaControl** — dashboard de climatização autônoma — feito em **React Native + Expo**, reutilizando ~70% da lógica do dashboard web (hooks, constants, utils).

> Lê os dados de um canal **ThingSpeak** (uplink do ESP32) e controla o A/C pela fila **TalkBack**. Se as chaves não estiverem preenchidas (`app.json` → `expo.extra` ainda com placeholders), cai em modo mock automaticamente — você pode testar agora mesmo sem configurar nada. O app abre direto, sem tela de login.

---

## 🛠️ Pré-requisitos

| Ferramenta | Versão | Notas |
|---|---|---|
| Node.js | ≥ 20 | já tem (24.14.1) |
| npm | ≥ 10 | já tem (11.11.0) |
| Conta Expo | gratuita | [expo.dev/signup](https://expo.dev/signup) |
| Expo Go (Android) | última | Para testar via QR code antes do APK |

> **Não precisa** de Android Studio. O EAS Build compila na nuvem.

---

## 🚀 Instalação

```bash
cd mobile
npm install
```

### 1) Gerar os ícones (PNG)

**Recomendado:** salve seu PNG original (qualidade fotográfica do design) como `assets/logo.png`. O script vai usá-lo automaticamente como fonte:

```bash
# 1. Salve a logo original em mobile/assets/logo.png (idealmente 1024×1024)
# 2. Gere todas as variantes
npm run generate:icons
```

Isso cria `icon.png`, `adaptive-icon.png`, `splash.png`, `favicon.png` e `notification-icon.png` a partir do PNG original — fidelidade visual perfeita.

**Fallback:** se não houver `logo.png`, o script usa `logo.svg` (versão vetorial aproximada — ainda funciona, mas o PNG original fica melhor).

### 2) Configurar variáveis (opcional — modo mock funciona sem)

Caminho recomendado: copie `.env.example` → `.env` e preencha (o `.env` é gitignored):

```bash
cp .env.example .env
```

```env
EXPO_PUBLIC_THINGSPEAK_CHANNEL_ID=...
EXPO_PUBLIC_THINGSPEAK_READ_KEY=...
EXPO_PUBLIC_THINGSPEAK_TALKBACK_ID=...
EXPO_PUBLIC_THINGSPEAK_TALKBACK_KEY=...
EXPO_PUBLIC_THINGSPEAK_RESULTS=200
EXPO_PUBLIC_USE_MOCK_DATA=true   # true = dashboard mock; false = canal real
```

Alternativa: editar [app.json](app.json) → `expo.extra` (`thingspeakChannelId`, `thingspeakReadKey`, `thingspeakTalkbackId`, `thingspeakTalkbackKey`, `thingspeakResults`) — vai pro git, então só faça se quiser comprometer as chaves. Guia completo: [`../docs/THINGSPEAK_SETUP.md`](../docs/THINGSPEAK_SETUP.md).

> **Dashboard real:** preencha as chaves e use `EXPO_PUBLIC_USE_MOCK_DATA=false`. Exige o ESP32 publicando no canal. Sem `EXPO_PUBLIC_THINGSPEAK_TALKBACK_*`, o controle do A/C fica desabilitado (só leitura).
>
> **Sem chaves:** o app cai em mock automaticamente — útil pra rodar sem configurar nada.

---

## 💻 Desenvolvimento

```bash
# Servidor de dev — escaneia QR code com Expo Go
npm start

# Atalhos
npm run android   # Abre no emulador / dispositivo conectado
npm run ios       # iOS (precisa de Mac)
```

---

## 📦 Build do APK

### Setup inicial (uma vez só)

```bash
npm install -g eas-cli
eas login
eas build:configure   # gera credenciais Android no projeto Expo
```

### Gerar APK para instalar direto no celular

```bash
npm run build:apk
```

Sai um link tipo `expo.dev/.../build/abc123` — baixe o `.apk`, transfira para o celular (Drive / WhatsApp / cabo) e instale.

> Habilite "Fontes desconhecidas" nas configurações do Android antes de instalar.

### Gerar AAB para Play Store (futuro)

```bash
npm run build:aab
```

---

## 🔄 Atualizações OTA (sem rebuildar o APK)

Toda mudança que mexe **só em JS / assets / imagens** pode ir pro celular sem refazer o APK. O app vem com `expo-updates` e checa atualização ao abrir e ao voltar do background. Quando há um update novo, ele baixa em background e mostra um banner "Aplicar" — tocar reinicia o app na nova versão.

> Mudanças que **exigem novo APK**: novas dependências nativas, mudança de versão (`version` no `app.json`), permissões, plugins do Expo, Kotlin/Gradle config, ícones/splash gerados. JS, JSX, CSS, hooks, mock data, regras, gráficos → vão por OTA.

### Como o canal está configurado

Tanto o APK do `npm run build:apk` quanto o AAB do `npm run build:aab` ouvem o canal **`production`**. Isso simplifica: você publica uma vez e atinge os dois.

### Publicar uma atualização (caso comum)

```bash
cd mobile
npm run update -- --message "ajuste no painel de controle"
```

O comando empacota o JS atual, sobe pra Expo e qualquer APK/AAB instalado baixa o update no próximo open. Você recebe um link `expo.dev/.../updates/abc123` pra acompanhar.

### Canal `preview` (opcional)

Se quiser testar um update sem afetar o APK em uso, primeiro builda um APK no profile `development` (que ouve `development`) ou crie um profile `staging` apontando pro canal `preview`. Pra publicar nesse canal de teste:

```bash
npm run update:preview -- --message "teste isolado"
```

### Como funciona o `runtimeVersion`

`runtimeVersion` está em `appVersion` policy: o cliente só aceita updates da mesma `version` do `app.json` em que foi compilado. Isso evita que um update OTA com código incompatível (ex: nova lib nativa) seja entregue. Quando você bumpa `version` (ex: 1.0.0 → 1.1.0), faz um build novo — updates em 1.0.0 continuam servindo só pra 1.0.0.

### Rollback rápido

Se a atualização quebrou algo:

```bash
eas update:rollback --branch production
```

---

## 🧩 Estrutura

```
mobile/
├── App.jsx                      # Entry — providers globais
├── app.json                     # Config Expo (nome, ícones, extra)
├── eas.json                     # Perfis de build (apk / aab)
├── assets/
│   ├── logo.svg                 # Fonte do logo (substituível)
│   ├── icon.png                 # 1024×1024 (gerado)
│   ├── adaptive-icon.png        # 1024×1024 Android (gerado)
│   ├── splash.png               # 1242×2436 (gerado)
│   ├── favicon.png              # 48×48 web (gerado)
│   └── notification-icon.png    # 96×96 (gerado)
├── scripts/
│   └── generate-icons.mjs       # Converte SVG → PNGs
└── src/
    ├── navigation/
    │   └── AppNavigator.jsx     # Stack: abre direto no Dashboard
    ├── screens/
    │   └── DashboardScreen.jsx
    ├── components/
    │   ├── Logo.jsx             # SVG vetorial in-app
    │   ├── Header.jsx
    │   ├── MetricCard.jsx       # Animado (pulse on change)
    │   ├── StatusPill.jsx
    │   ├── SectionTitle.jsx
    │   ├── Panel.jsx
    │   ├── PeriodSelector.jsx   # Segmented control
    │   ├── ControlPanel.jsx     # Switch + Slider nativo + Haptics
    │   ├── EventLog.jsx
    │   ├── RulesTable.jsx
    │   ├── SystemStatus.jsx
    │   └── charts/
    │       ├── TemperatureChart.jsx   # Victory Native + Skia
    │       ├── OccupancyChart.jsx
    │       ├── HumidityChart.jsx
    │       └── AcUsageChart.jsx
    ├── hooks/
    │   ├── useSensorData.js     # polling do feed ThingSpeak + mock + TalkBack
    │   ├── useEventLog.js       # eventos derivados das transições do feed
    │   └── useNotifications.js  # FCM via expo-notifications
    ├── contexts/
    │   └── ThemeContext.jsx     # Dark/light/auto + persist
    ├── config/
    │   └── thingspeak.js        # config do canal (Expo Constants/env)
    ├── services/
    │   └── thingspeak.js        # cliente REST (getLatest/getHistory/sendCommand)
    ├── constants/
    │   └── index.js             # ← copy do web (inalterado)
    ├── utils/
    │   ├── theme.js             # Tokens de design
    │   ├── chartFont.js         # Font Skia para gráficos
    │   └── mockData.js          # ← copy do web (inalterado)
    └── styles/                  # (StyleSheet inline nos componentes)
```

---

## ✨ Features

| Feature | Status |
|---|---|
| Backend ThingSpeak (canal + TalkBack) | ✅ leitura por polling + controle |
| Abre direto (sem login) | ✅ |
| Dashboard responsivo | ✅ |
| 4 gráficos animados (Skia) | ✅ Victory Native v41 |
| Controle manual A/C | ✅ Slider + Switch + Haptics |
| Push Notifications | ✅ via `expo-notifications` (FCM gratuito) |
| Pull-to-refresh | ✅ |
| Dark mode (auto/dark/light) | ✅ persistente em AsyncStorage |
| Splash screen + ícone adaptive | ✅ |

---

## 🐛 Troubleshooting

**`Unable to resolve "@shopify/react-native-skia"`** — Reinstale com `npm install` e limpe cache: `npx expo start -c`.

**APK build falha em "Resolving Android SDK"** — Rode `eas build:configure` antes do primeiro build.

**Dashboard vazio com canal real** — Verifique `app.json` → `expo.extra.thingspeakChannelId`/`thingspeakReadKey` (ou as `EXPO_PUBLIC_THINGSPEAK_*`). Se vazios/placeholders, o app cai em modo mock automaticamente. Confirme também que o ESP32 está publicando no canal.

**Gráficos em branco no Android** — Skia precisa do hermes engine; já vem habilitado no Expo SDK 52.
