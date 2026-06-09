import { useEffect, useState } from "react";
import { useMockData } from "../config/thingspeak";
import { getHistory } from "../services/thingspeak";
import { OCCUPANCY_THRESHOLDS } from "../constants";

const MOCK_EVENTS = [
  { id: "m1", type: "ac_ligado_auto", timestamp: Date.now() - 30 * 60000 },
  { id: "m2", type: "ocupacao_alta", timestamp: Date.now() - 18 * 60000, payload: { pessoas: 32 } },
  { id: "m3", type: "temp_estabilizada", timestamp: Date.now() - 5 * 60000 },
];

const POLL_MS = 60_000;

/**
 * O ThingSpeak não tem um conceito de "eventos" como o Firebase /eventos.
 * Em vez disso derivamos os eventos no cliente varrendo o histórico do canal
 * e detectando transições relevantes (A/C ligou/desligou, ocupação alta,
 * temperatura estabilizada).
 */
function deriveEvents(history) {
  const events = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const cur = history[i];

    // A/C: temp_alvo cruzando 0 indica liga/desliga.
    if (prev.tempAlvo === 0 && cur.tempAlvo > 0) {
      events.push({
        id: `ac_on-${cur.timestamp}`,
        type: "ac_ligado_auto",
        timestamp: cur.timestamp,
        payload: { temp: cur.tempAlvo },
      });
    } else if (prev.tempAlvo > 0 && cur.tempAlvo === 0) {
      events.push({
        id: `ac_off-${cur.timestamp}`,
        type: "ac_desligado_auto",
        timestamp: cur.timestamp,
      });
    }

    // Ocupação cruzando o limiar alto.
    if (
      prev.pessoas <= OCCUPANCY_THRESHOLDS.high &&
      cur.pessoas > OCCUPANCY_THRESHOLDS.high
    ) {
      events.push({
        id: `ocup-${cur.timestamp}`,
        type: "ocupacao_alta",
        timestamp: cur.timestamp,
        payload: { pessoas: cur.pessoas },
      });
    }

    // Temperatura estabilizada (entra na faixa de conforto com A/C ligado).
    const prevStable = prev.tempAlvo > 0 && Math.abs(prev.tempInt - prev.tempAlvo) < 1.5;
    const curStable = cur.tempAlvo > 0 && Math.abs(cur.tempInt - cur.tempAlvo) < 1.5;
    if (!prevStable && curStable) {
      events.push({
        id: `stab-${cur.timestamp}`,
        type: "temp_estabilizada",
        timestamp: cur.timestamp,
      });
    }
  }
  return events.sort((a, b) => b.timestamp - a.timestamp);
}

export function useEventLog(limit = 20) {
  const [events, setEvents] = useState(useMockData ? MOCK_EVENTS : []);
  const [loading, setLoading] = useState(!useMockData);

  useEffect(() => {
    if (useMockData) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      try {
        const history = await getHistory();
        if (cancelled) return;
        setEvents(deriveEvents(history).slice(0, limit));
      } catch {
        // mantém os eventos anteriores
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [limit]);

  return { events, loading };
}

export const EVENT_LABELS = {
  ac_ligado_auto: "A/C ligado automaticamente",
  ac_desligado_auto: "A/C desligado automaticamente",
  ac_ligado_manual: "A/C ligado manualmente",
  ac_desligado_manual: "A/C desligado manualmente",
  temp_alvo_manual: "Temperatura alvo ajustada",
  modo_manual_on: "Modo manual ativado",
  modo_manual_off: "Modo manual desativado",
  ocupacao_alta: "Ocupação alta detectada",
  temp_estabilizada: "Temperatura estabilizada",
};
