/**
 * Cliente REST do ThingSpeak.
 *
 *  Leitura (uplink ESP → dashboard):
 *    - getLatest():  último ponto do canal  → objeto `live`
 *    - getHistory(): série temporal         → array de pontos do gráfico
 *
 *  Escrita / controle (downlink dashboard → ESP) via fila TalkBack:
 *    - sendCommand(): enfileira um comando que o ESP32 consome por polling
 *
 * O ThingSpeak não faz streaming como o Firebase RTDB, então o dashboard
 * faz polling do feed (ver useSensorData) respeitando o intervalo mínimo de
 * 15s do plano gratuito.
 */

import { thingSpeakConfig, controlEnabled } from "../config/thingspeak";

const { baseUrl, channelId, readKey, talkbackId, talkbackKey, results } =
  thingSpeakConfig;

/** Comandos aceitos pela fila TalkBack (o firmware faz o parse igual). */
export const COMMANDS = {
  acOn: "AC_ON",
  acOff: "AC_OFF",
  target: (t) => `TARGET:${Math.round(t)}`,
  manualOn: "MANUAL_ON",
  manualOff: "MANUAL_OFF",
};

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(v) {
  return num(v) >= 1;
}

function hhmm(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

/** Converte um feed bruto do ThingSpeak no objeto `live` que o app espera. */
export function mapFeedToLive(feed) {
  if (!feed) return null;
  const when = feed.created_at ? new Date(feed.created_at) : new Date();
  return {
    time: hhmm(when),
    pessoas: num(feed.field1),
    tempInt: num(feed.field2),
    tempExt: num(feed.field3),
    tempAlvo: num(feed.field4),
    tempAlvoIA: null,
    iaAtiva: false,
    umidInt: num(feed.field5),
    umidExt: num(feed.field6),
    acLigado: bool(feed.field7),
    modoManual: bool(feed.field8),
  };
}

/** Converte um feed bruto num ponto de histórico para os gráficos. */
export function mapFeedToHistory(feed) {
  const ts = feed.created_at ? Date.parse(feed.created_at) : Date.now();
  const when = new Date(ts);
  return {
    timestamp: ts,
    time: when.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    pessoas: num(feed.field1),
    tempInt: num(feed.field2),
    tempExt: num(feed.field3),
    tempAlvo: num(feed.field4),
    umidInt: num(feed.field5),
    umidExt: num(feed.field6),
  };
}

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ThingSpeak HTTP ${res.status}`);
  }
  return res.json();
}

/** Último ponto do canal. Retorna `null` se o canal ainda estiver vazio. */
export async function getLatest() {
  const url = `${baseUrl}/channels/${channelId}/feeds/last.json?api_key=${readKey}`;
  const feed = await getJSON(url);
  // Canal vazio devolve a string "-1" em vez de um objeto.
  if (!feed || typeof feed !== "object") return null;
  return mapFeedToLive(feed);
}

/** Série temporal (mais recentes primeiro no ThingSpeak; devolvemos ordenado). */
export async function getHistory(limit = results) {
  const url = `${baseUrl}/channels/${channelId}/feeds.json?api_key=${readKey}&results=${limit}`;
  const data = await getJSON(url);
  const feeds = Array.isArray(data?.feeds) ? data.feeds : [];
  return feeds
    .map(mapFeedToHistory)
    .filter((p) => Number.isFinite(p.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Enfileira um comando de controle na fila TalkBack. O ESP32 consome via
 * `commands/execute.json` no próximo ciclo de polling.
 *
 * `position: 1` coloca o comando no topo da fila, então a ação mais recente
 * do usuário é a primeira a ser executada.
 */
export async function sendCommand(command) {
  if (!controlEnabled) {
    throw new Error("TalkBack não configurado (VITE_THINGSPEAK_TALKBACK_*)");
  }
  const url = `${baseUrl}/talkbacks/${talkbackId}/commands.json`;
  const body = new URLSearchParams({
    api_key: talkbackKey,
    command_string: command,
    position: "1",
  });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`TalkBack HTTP ${res.status}`);
  }
  return res.json();
}
