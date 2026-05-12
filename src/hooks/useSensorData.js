import { useCallback, useEffect, useRef, useState } from "react";
import { ref, onValue, off, update, push, set } from "firebase/database";
import { db, useMockData } from "../config/firebase";
import { generateHistory, nextLiveSample } from "../utils/mockData";
import {
  UPDATE_INTERVAL_MS,
  HISTORY_APPEND_MS,
  HISTORY_MAX_POINTS,
  AI_MODEL_VERSION,
  AI_UPDATE_THRESHOLD_C,
} from "../constants";
import { useClimateAI } from "./useClimateAI";

const CONTROLE_PATH = "controle";
const EVENTOS_PATH = "eventos";
const IA_PATH = "ia";

export function useSensorData() {
  const initialHistory = useMockData ? generateHistory() : [];
  const [history, setHistory] = useState(initialHistory);
  const [live, setLive] = useState(
    initialHistory[initialHistory.length - 1] ?? null
  );
  const [acOn, setAcOnState] = useState(false);
  const [manualMode, setManualModeState] = useState(false);
  const [manualTarget, setManualTarget] = useState(22);
  const [loading, setLoading] = useState(!useMockData);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(
    useMockData ? "mock" : "connecting"
  );

  const acOnRef = useRef(acOn);
  const manualModeRef = useRef(manualMode);
  const manualTargetRef = useRef(manualTarget);
  const lastHistoryAppendRef = useRef(Date.now());
  const lastIAWriteRef = useRef(null);
  acOnRef.current = acOn;
  manualModeRef.current = manualMode;
  manualTargetRef.current = manualTarget;

  const ai = useClimateAI({
    pessoas: live?.pessoas,
    tempInt: live?.tempInt,
    tempExt: live?.tempExt,
    manualMode,
    enabled: Boolean(live),
  });

  useEffect(() => {
    if (useMockData) {
      setLoading(false);
      const interval = setInterval(() => {
        setLive((prev) => {
          if (!prev) return prev;
          const sample = nextLiveSample(prev, {
            manualMode: manualModeRef.current,
            manualAcOn: acOnRef.current,
            manualTarget: manualTargetRef.current,
          });
          if (sample.timestamp - lastHistoryAppendRef.current >= HISTORY_APPEND_MS) {
            lastHistoryAppendRef.current = sample.timestamp;
            setHistory((h) => [...h.slice(-(HISTORY_MAX_POINTS - 1)), sample]);
          }
          return sample;
        });
      }, UPDATE_INTERVAL_MS);
      return () => clearInterval(interval);
    }

    if (!db) {
      setError(new Error("Firebase não inicializado"));
      setConnectionStatus("error");
      return;
    }

    const sensoresRef = ref(db, "sensores");
    const histRef = ref(db, "historico");
    const connRef = ref(db, ".info/connected");

    const unsubConn = onValue(connRef, (snap) => {
      setConnectionStatus(snap.val() ? "online" : "offline");
    });

    const unsubLive = onValue(
      sensoresRef,
      (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const now = new Date();
          setLive({
            time: `${String(now.getHours()).padStart(2, "0")}:${String(
              now.getMinutes()
            ).padStart(2, "0")}`,
            pessoas: val.ocupacao ?? 0,
            tempInt: val.temp_interna ?? 0,
            tempExt: val.temp_externa ?? 0,
            tempAlvo: val.temp_alvo ?? 0,
            tempAlvoIA: val.temp_alvo_ia ?? null,
            iaAtiva: Boolean(val.ia_ativa),
            umidInt: val.umid_interna ?? 0,
            umidExt: val.umid_externa ?? 0,
          });
          setAcOnState(Boolean(val.ac_ligado));
          setManualModeState(Boolean(val.modo_manual));
          if (val.temp_alvo) setManualTarget(val.temp_alvo);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    const unsubHist = onValue(
      histRef,
      (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const entries = Object.values(val)
            .map((e) => ({
              timestamp: e.t,
              time: new Date(e.t).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              pessoas: e.o ?? 0,
              tempInt: e.ti ?? 0,
              tempExt: e.te ?? 0,
              tempAlvo: e.ta ?? 0,
              umidInt: e.ui ?? 0,
              umidExt: e.ue ?? 0,
            }))
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-HISTORY_MAX_POINTS);
          setHistory(entries);
        }
      },
      (err) => setError(err)
    );

    return () => {
      off(sensoresRef, "value", unsubLive);
      off(histRef, "value", unsubHist);
      off(connRef, "value", unsubConn);
    };
  }, []);

  useEffect(() => {
    if (useMockData && live && !manualMode) {
      setAcOnState(live.tempAlvo > 0);
    }
  }, [live, manualMode]);

  useEffect(() => {
    if (!ai.isAIActive || ai.tempAlvoIA === null) return;
    if (manualMode) return;
    if (!live) return;

    const current = live.tempAlvo ?? 0;
    const diff = Math.abs(current - ai.tempAlvoIA);

    if (useMockData) {
      if (diff < AI_UPDATE_THRESHOLD_C && current !== 0 && ai.tempAlvoIA !== 0) return;
      setLive((prev) =>
        prev
          ? { ...prev, tempAlvo: ai.tempAlvoIA, tempAlvoIA: ai.tempAlvoIA, iaAtiva: true }
          : prev
      );
      return;
    }

    if (diff < AI_UPDATE_THRESHOLD_C && current !== 0 && ai.tempAlvoIA !== 0) return;

    const lastWrite = lastIAWriteRef.current;
    if (lastWrite === ai.tempAlvoIA) return;
    lastIAWriteRef.current = ai.tempAlvoIA;

    if (!db) return;
    update(ref(db, CONTROLE_PATH), {
      temp_alvo: ai.tempAlvoIA,
      ac_ligado: ai.tempAlvoIA > 0,
      ia_ativa: true,
      ia_ultimo_calculo: Date.now(),
    }).catch((err) => console.warn("Falha ao escrever IA no /controle:", err));

    set(ref(db, `${IA_PATH}/ultimo_ajuste`), {
      timestamp: Date.now(),
      inputs: {
        pessoas: live.pessoas,
        temp_interna: live.tempInt,
        temp_externa: live.tempExt,
      },
      output: { temp_alvo: ai.tempAlvoIA },
      regra_fixa_seria: ai.ruleTempAlvo,
      diferenca: ai.tempAlvoIA - (ai.ruleTempAlvo ?? 0),
      confianca: ai.confidence,
    }).catch((err) => console.warn("Falha ao registrar IA:", err));

    set(ref(db, `${IA_PATH}/modelo_versao`), AI_MODEL_VERSION).catch(() => {});
  }, [ai.tempAlvoIA, ai.isAIActive, ai.ruleTempAlvo, ai.confidence, manualMode, live]);

  const writeFirebase = useCallback(async (patch, eventType, eventPayload) => {
    if (!db) return { ok: false, error: new Error("Firebase indisponível") };
    try {
      await update(ref(db, CONTROLE_PATH), patch);
      if (eventType) {
        await push(ref(db, EVENTOS_PATH), {
          type: eventType,
          timestamp: Date.now(),
          payload: eventPayload ?? null,
        });
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err };
    }
  }, []);

  const setAcOn = useCallback(
    async (on) => {
      if (useMockData) {
        setAcOnState(on);
        setManualModeState(true);
        setLive((prev) =>
          prev
            ? { ...prev, tempAlvo: on ? manualTargetRef.current : 0 }
            : prev
        );
        return { ok: true };
      }
      return writeFirebase(
        { ac_ligado: on, modo_manual: true },
        on ? "ac_ligado_manual" : "ac_desligado_manual"
      );
    },
    [writeFirebase]
  );

  const setTargetTemp = useCallback(
    async (temp) => {
      if (useMockData) {
        setManualTarget(temp);
        setManualModeState(true);
        setAcOnState(true);
        setLive((prev) => (prev ? { ...prev, tempAlvo: temp } : prev));
        return { ok: true };
      }
      return writeFirebase(
        { temp_alvo: temp, modo_manual: true, ac_ligado: true },
        "temp_alvo_manual",
        { temp }
      );
    },
    [writeFirebase]
  );

  const setManualMode = useCallback(
    async (manual) => {
      if (useMockData) {
        setManualModeState(manual);
        return { ok: true };
      }
      return writeFirebase(
        { modo_manual: manual },
        manual ? "modo_manual_on" : "modo_manual_off"
      );
    },
    [writeFirebase]
  );

  return {
    history,
    live,
    acOn,
    manualMode,
    manualTarget,
    loading,
    error,
    connectionStatus,
    setAcOn,
    setTargetTemp,
    setManualMode,
    ai,
  };
}
