# Configuração do ThingSpeak — ClimaControl

Guia para criar o canal e a fila TalkBack que o firmware (ESP32/Wokwi), o
dashboard web e o app mobile usam. Substitui o antigo `FIREBASE_SETUP.md`.

## 1. Criar a conta e o canal de dados

1. Crie uma conta gratuita em <https://thingspeak.com> (MathWorks).
2. **Channels → New Channel**. Dê um nome (ex.: `ClimaControl`) e habilite os
   **8 fields**, nesta ordem exata (é o `FIELD_MAP` em `src/config/thingspeak.js`):

   | Field | Nome sugerido | Conteúdo |
   |---|---|---|
   | Field 1 | ocupacao | nº de pessoas |
   | Field 2 | temp_interna | °C |
   | Field 3 | temp_externa | °C |
   | Field 4 | temp_alvo | °C (0 = A/C desligado) |
   | Field 5 | umid_interna | % |
   | Field 6 | umid_externa | % |
   | Field 7 | ac_ligado | 0/1 |
   | Field 8 | modo_manual | 0/1 |

3. Salve. Anote o **Channel ID** (aparece no topo do canal).

## 2. Pegar as API Keys do canal

Na aba **API Keys** do canal:

- **Write API Key** → vai no firmware (`config.h` → `THINGSPEAK_WRITE_KEY`).
- **Read API Key** → vai no dashboard web e no mobile.

> Se quiser que o canal seja público, marque "Make Public" em *Channel Settings*;
> mesmo público, a Read Key continua funcionando.

## 3. Criar a fila TalkBack (controle do A/C)

O TalkBack é a fila de comandos que o dashboard usa para controlar o A/C
(o ThingSpeak não tem stream bidirecional como o Firebase).

1. **Apps → TalkBack → Add a new TalkBack**. Dê um nome e salve.
2. Anote o **TalkBack ID** e a **TalkBack API Key**.
3. Não precisa pré-cadastrar comandos — o dashboard os enfileira em runtime.
   O firmware executa, por polling, um destes `command_string`:

   | Comando | Efeito |
   |---|---|
   | `AC_ON` / `AC_OFF` | liga/desliga o A/C (entra em modo manual) |
   | `MANUAL_ON` / `MANUAL_OFF` | alterna o modo manual |
   | `TARGET:<n>` | define a temperatura alvo (entra em modo manual) |

## 4. Preencher as credenciais nos 3 lugares

| Onde | Variáveis |
|---|---|
| `.env` (web) | `VITE_THINGSPEAK_CHANNEL_ID`, `VITE_THINGSPEAK_READ_KEY`, `VITE_THINGSPEAK_TALKBACK_ID`, `VITE_THINGSPEAK_TALKBACK_KEY` + `VITE_USE_MOCK_DATA=false` |
| `mobile/.env` (ou `mobile/app.json → extra` para builds EAS) | `EXPO_PUBLIC_THINGSPEAK_*` (mesmos valores) + `EXPO_PUBLIC_USE_MOCK_DATA=false` |
| `firmware/climacontrol/config.h` | `THINGSPEAK_WRITE_KEY`, `THINGSPEAK_TALKBACK_ID`, `THINGSPEAK_TALKBACK_KEY` |

## 5. Limites e segurança

- **Rate limit (plano gratuito):** 1 escrita a cada **15 s**. O firmware publica a
  cada 20 s (`THINGSPEAK_UPDATE_MS`) com folga; o dashboard faz polling de leitura
  a cada 15 s.
- **Chaves expostas:** as chaves Read e TalkBack vão embutidas no bundle web e no
  APK (prefixos `VITE_`/`EXPO_PUBLIC_`). É uma limitação conhecida de apps
  client-side no ThingSpeak — aceitável para um projeto acadêmico. Não reaproveite
  essas chaves em nada sensível e, se vazarem, regenere-as na aba *API Keys*.
