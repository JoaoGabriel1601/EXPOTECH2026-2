/**
 * Configuração do ThingSpeak para o app mobile (Expo).
 *
 * Substitui o antigo mobile/src/config/firebase.js. O ESP32 (firmware Wokwi)
 * publica as leituras num canal ThingSpeak; o app lê o feed por polling e
 * envia comandos de controle pela fila TalkBack.
 *
 * Os valores vêm de duas fontes (env tem prioridade):
 *   - process.env.EXPO_PUBLIC_THINGSPEAK_*  (mobile/.env)
 *   - Constants.expoConfig.extra.*           (app.json → builds EAS)
 */

import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

// IMPORTANTE: o Metro só inlina EXPO_PUBLIC_* quando o acesso é ESTÁTICO
// (process.env.EXPO_PUBLIC_FOO escrito literalmente). Por isso passamos o
// VALOR já resolvido aqui — acesso dinâmico (process.env[chave]) não é
// substituído no bundle e cairia sempre no fallback do app.json.
function pick(envValue, extraKey) {
  if (envValue && envValue.length) return envValue;
  return extra[extraKey];
}

function isPlaceholder(value) {
  if (!value || typeof value !== "string") return true;
  return value.startsWith("REPLACE_WITH_");
}

const TS_BASE = "https://api.thingspeak.com";

export const thingSpeakConfig = {
  baseUrl: TS_BASE,
  channelId: pick(process.env.EXPO_PUBLIC_THINGSPEAK_CHANNEL_ID, "thingspeakChannelId"),
  readKey: pick(process.env.EXPO_PUBLIC_THINGSPEAK_READ_KEY, "thingspeakReadKey"),
  talkbackId: pick(process.env.EXPO_PUBLIC_THINGSPEAK_TALKBACK_ID, "thingspeakTalkbackId"),
  talkbackKey: pick(process.env.EXPO_PUBLIC_THINGSPEAK_TALKBACK_KEY, "thingspeakTalkbackKey"),
  results: Number(pick(process.env.EXPO_PUBLIC_THINGSPEAK_RESULTS, "thingspeakResults")) || 200,
};

/** Mapeamento field<n> → grandeza (espelha o firmware e a web). */
export const FIELD_MAP = {
  field1: "ocupacao",
  field2: "temp_interna",
  field3: "temp_externa",
  field4: "temp_alvo",
  field5: "umid_interna",
  field6: "umid_externa",
  field7: "ac_ligado", // 0/1
  field8: "modo_manual", // 0/1
};

const useMockFlag = pick(process.env.EXPO_PUBLIC_USE_MOCK_DATA, "useMockData");
const mockFlag = useMockFlag === true || useMockFlag === "true";

const hasConfig =
  !isPlaceholder(thingSpeakConfig.channelId) &&
  !isPlaceholder(thingSpeakConfig.readKey);

export const useMockData = mockFlag || !hasConfig;
export const mockReason = mockFlag
  ? "flag"
  : !hasConfig
    ? "missing-config"
    : null;

/** TalkBack permite escrita (controle)? Precisa do id + key da fila. */
export const controlEnabled =
  !isPlaceholder(thingSpeakConfig.talkbackId) &&
  !isPlaceholder(thingSpeakConfig.talkbackKey);

if (__DEV__) {
  if (useMockData) {
    console.info(
      mockReason === "flag"
        ? "[Movement] EXPO_PUBLIC_USE_MOCK_DATA=true — modo simulação ativo."
        : "[Movement] ThingSpeak não configurado — modo simulação ativo."
    );
  } else {
    console.info(
      `[Movement] Lendo canal ThingSpeak ${thingSpeakConfig.channelId}` +
        (controlEnabled ? " (controle via TalkBack ativo)." : " (sem TalkBack).")
    );
  }
}
