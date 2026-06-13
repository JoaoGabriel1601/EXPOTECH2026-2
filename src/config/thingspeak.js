/**
 * Configuração do ThingSpeak para o dashboard Moviment.
 *
 * Substitui o antigo src/config/firebase.js. O ESP32 (firmware Wokwi) publica
 * as leituras num canal ThingSpeak; o dashboard lê o feed por polling e envia
 * comandos de controle pela fila TalkBack.
 *
 * Variáveis de ambiente (.env — Vite expõe só as com prefixo VITE_):
 *   VITE_THINGSPEAK_CHANNEL_ID   id numérico do canal de dados
 *   VITE_THINGSPEAK_READ_KEY     Read API Key do canal
 *   VITE_THINGSPEAK_TALKBACK_ID  id da fila TalkBack (controle)
 *   VITE_THINGSPEAK_TALKBACK_KEY TalkBack API Key
 *   VITE_THINGSPEAK_RESULTS      nº de pontos do histórico (default 200)
 *   VITE_USE_MOCK_DATA           "true" força o modo simulação
 */

const TS_BASE = "https://api.thingspeak.com";

export const thingSpeakConfig = {
  baseUrl: TS_BASE,
  channelId: import.meta.env.VITE_THINGSPEAK_CHANNEL_ID,
  readKey: import.meta.env.VITE_THINGSPEAK_READ_KEY,
  talkbackId: import.meta.env.VITE_THINGSPEAK_TALKBACK_ID,
  talkbackKey: import.meta.env.VITE_THINGSPEAK_TALKBACK_KEY,
  results: Number(import.meta.env.VITE_THINGSPEAK_RESULTS) || 200,
};

/**
 * Mapeamento field<n> → grandeza. É a fonte da verdade compartilhada com o
 * firmware (firmware/climacontrol/sketch.ino escreve nos mesmos 8 fields).
 */
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

const hasConfig = Boolean(
  thingSpeakConfig.channelId && thingSpeakConfig.readKey
);
const mockFlag = import.meta.env.VITE_USE_MOCK_DATA === "true";

export const useMockData = mockFlag || !hasConfig;
export const mockReason = mockFlag
  ? "flag"
  : !hasConfig
    ? "missing-config"
    : null;

/** TalkBack permite escrita (controle)? Precisa do id + key da fila. */
export const controlEnabled = Boolean(
  thingSpeakConfig.talkbackId && thingSpeakConfig.talkbackKey
);

if (typeof window !== "undefined" && import.meta.env.DEV) {
  if (useMockData) {
    console.info(
      mockReason === "flag"
        ? "[Moviment] VITE_USE_MOCK_DATA=true — modo simulação ativo."
        : "[Moviment] ThingSpeak não configurado — modo simulação ativo."
    );
  } else {
    console.info(
      `[Moviment] Lendo canal ThingSpeak ${thingSpeakConfig.channelId}` +
        (controlEnabled
          ? " (controle via TalkBack ativo)."
          : " (sem TalkBack — controle desativado).")
    );
  }
}
