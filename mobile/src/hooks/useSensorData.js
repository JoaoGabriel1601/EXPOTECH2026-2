import { useCallback, useEffect, useRef, useState } from "react";
import { useMockData, controlEnabled } from "../config/thingspeak";
import {
  getLatest,
  getHistory,
  sendCommand,
  COMMANDS,
} from "../services/thingspeak";
import { generateHistory, nextLiveSample } from "../utils/mockData";
import {
  UPDATE_INTERVAL_MS,
  HISTORY_APPEND_MS,
  HISTORY_MAX_POINTS,
  AI_UPDATE_THRESHOLD_C,
} from "../constants";
import { useClimateAI } from "./useClimateAI";

// O plano gratuito do ThingSpeak aceita 1 escrita a cada 15s.
const POLL_INTERVAL_MS = 15_000;
const HISTORY_REFRESH_MS = 60_000;

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

  // ---- Modo simulação (mock) --------------------------------------------
  useEffect(() => {
    if (!useMockData) return;
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
  }, []);

  // ---- Modo real: polling do feed ThingSpeak ----------------------------
  useEffect(() => {
    if (useMockData) return;

    let cancelled = false;

    const applyLive = (snapshot) => {
      if (!snapshot) return;
      setLive(snapshot);
      setAcOnState(snapshot.acLigado);
      setManualModeState(snapshot.modoManual);
      if (snapshot.tempAlvo > 0) setManualTarget(snapshot.tempAlvo);
    };

    const poll = async () => {
      try {
        const snapshot = await getLatest();
        if (cancelled) return;
        applyLive(snapshot);
        setConnectionStatus("online");
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setConnectionStatus("offline");
        setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const refreshHistory = async () => {
      try {
        const points = await getHistory();
        if (!cancelled && points.length) {
          setHistory(points.slice(-HISTORY_MAX_POINTS));
        }
      } catch {
        // mantém o histórico anterior em caso de falha pontual
      }
    };

    poll();
    refreshHistory();
    const pollId = setInterval(poll, POLL_INTERVAL_MS);
    const histId = setInterval(refreshHistory, HISTORY_REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      clearInterval(histId);
    };
  }, []);

  // ---- IA no modo simulação (no modo real é só indicativa no card) ------
  useEffect(() => {
    if (!useMockData) return;
    if (!ai.isAIActive || ai.tempAlvoIA === null) return;
    if (manualMode || !live) return;

    const current = live.tempAlvo ?? 0;
    const diff = Math.abs(current - ai.tempAlvoIA);
    if (
      live.tempAlvo === ai.tempAlvoIA &&
      live.tempAlvoIA === ai.tempAlvoIA &&
      live.iaAtiva
    ) {
      return;
    }
    if (diff < AI_UPDATE_THRESHOLD_C && current !== 0 && ai.tempAlvoIA !== 0) return;
    setLive((prev) =>
      prev
        ? { ...prev, tempAlvo: ai.tempAlvoIA, tempAlvoIA: ai.tempAlvoIA, iaAtiva: true }
        : prev
    );
  }, [ai.tempAlvoIA, ai.isAIActive, manualMode, live]);

  useEffect(() => {
    if (useMockData && live && !manualMode) {
      setAcOnState(live.tempAlvo > 0);
    }
  }, [live, manualMode]);

  // ---- Envio de comando de controle (TalkBack) --------------------------
  const sendControl = useCallback(async (command) => {
    if (!controlEnabled) {
      return { ok: false, error: new Error("Controle indisponível (TalkBack)") };
    }
    try {
      await sendCommand(command);
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
          prev ? { ...prev, tempAlvo: on ? manualTargetRef.current : 0 } : prev
        );
        return { ok: true };
      }
      setAcOnState(on);
      setManualModeState(true);
      return sendControl(on ? COMMANDS.acOn : COMMANDS.acOff);
    },
    [sendControl]
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
      setManualTarget(temp);
      setManualModeState(true);
      setAcOnState(true);
      return sendControl(COMMANDS.target(temp));
    },
    [sendControl]
  );

  const setManualMode = useCallback(
    async (manual) => {
      if (useMockData) {
        setManualModeState(manual);
        return { ok: true };
      }
      setManualModeState(manual);
      return sendControl(manual ? COMMANDS.manualOn : COMMANDS.manualOff);
    },
    [sendControl]
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
