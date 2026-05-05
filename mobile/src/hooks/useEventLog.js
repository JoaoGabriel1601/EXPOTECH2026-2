import { useEffect, useState } from "react";
import { ref, onValue, off, query, limitToLast } from "firebase/database";
import { db, useMockData } from "../config/firebase";

const MOCK_EVENTS = [
  { id: "m1", type: "ac_ligado_auto", timestamp: Date.now() - 30 * 60000 },
  {
    id: "m2",
    type: "ocupacao_alta",
    timestamp: Date.now() - 18 * 60000,
    payload: { pessoas: 32 },
  },
  { id: "m3", type: "temp_estabilizada", timestamp: Date.now() - 5 * 60000 },
];

export function useEventLog(limit = 20) {
  const [events, setEvents] = useState(useMockData ? MOCK_EVENTS : []);
  const [loading, setLoading] = useState(!useMockData);

  useEffect(() => {
    if (useMockData || !db) {
      setLoading(false);
      return;
    }
    const eventsQuery = query(ref(db, "eventos"), limitToLast(limit));
    const unsub = onValue(eventsQuery, (snap) => {
      const val = snap.val();
      if (val) {
        const list = Object.entries(val).map(([id, ev]) => ({ id, ...ev }));
        list.sort((a, b) => b.timestamp - a.timestamp);
        setEvents(list);
      } else {
        setEvents([]);
      }
      setLoading(false);
    });
    return () => off(ref(db, "eventos"), "value", unsub);
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
