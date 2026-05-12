import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  initClimateAI,
  predictTargetTemp,
  isAIReady,
  getAIDiagnostics,
  ruleBasedTarget,
} from "../ai/climateAI";
import {
  AI_RECALC_DELAY_MS,
  AI_MIN_PREDICT_INTERVAL_MS,
} from "../constants";

function classifyConfidence(pessoas, tempInt, tempExt) {
  const inRange =
    pessoas >= 0 &&
    pessoas <= 50 &&
    tempInt >= 15 &&
    tempInt <= 40 &&
    tempExt >= 15 &&
    tempExt <= 45;
  if (!inRange) return "low";
  const nearEdge =
    pessoas > 45 || tempInt > 36 || tempInt < 18 || tempExt > 40 || tempExt < 18;
  return nearEdge ? "medium" : "high";
}

export function useClimateAI({ pessoas, tempInt, tempExt, manualMode, enabled = true } = {}) {
  const [aiState, setAiState] = useState(() => ({
    status: enabled ? "loading" : "idle",
    error: null,
  }));
  const [tempAlvoIA, setTempAlvoIA] = useState(null);
  const [ruleTempAlvo, setRuleTempAlvo] = useState(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const prevPessoasRef = useRef(pessoas);
  const recalcTimerRef = useRef(null);
  const lastPredictAtRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return undefined;
    initClimateAI()
      .then((ok) => {
        if (!mountedRef.current) return;
        setAiState({
          status: ok ? "ready" : "fallback",
          error: ok ? null : getAIDiagnostics().lastError,
        });
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        setAiState({ status: "fallback", error: String(err.message ?? err) });
      });
    return () => {
      mountedRef.current = false;
    };
  }, [enabled]);

  const runPrediction = useCallback(
    (force = false) => {
      if (typeof pessoas !== "number") return;
      const now = Date.now();
      if (!force && now - lastPredictAtRef.current < AI_MIN_PREDICT_INTERVAL_MS) return;
      lastPredictAtRef.current = now;
      const iaTemp = predictTargetTemp(pessoas, tempInt ?? 25, tempExt ?? 28);
      const ruleTemp = ruleBasedTarget(pessoas, tempExt ?? 28);
      setTempAlvoIA(iaTemp);
      setRuleTempAlvo(ruleTemp);
      setLastUpdate(now);
      setIsRecalculating(false);
    },
    [pessoas, tempInt, tempExt]
  );

  useEffect(() => {
    if (!enabled) return undefined;
    if (manualMode) return undefined;
    if (typeof pessoas !== "number") return undefined;

    const prev = prevPessoasRef.current;
    const changed = prev !== pessoas;
    prevPessoasRef.current = pessoas;

    if (changed) {
      // Intencional: feedback visual de "recalculando" enquanto o debounce roda.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsRecalculating(true);
      if (recalcTimerRef.current) clearTimeout(recalcTimerRef.current);
      recalcTimerRef.current = setTimeout(() => {
        recalcTimerRef.current = null;
        runPrediction(true);
      }, AI_RECALC_DELAY_MS);
    } else if (tempAlvoIA === null) {
      runPrediction(true);
    } else {
      runPrediction(false);
    }

    return undefined;
  }, [pessoas, tempInt, tempExt, manualMode, enabled, runPrediction, tempAlvoIA]);

  useEffect(() => {
    return () => {
      if (recalcTimerRef.current) {
        clearTimeout(recalcTimerRef.current);
        recalcTimerRef.current = null;
      }
    };
  }, []);

  const confidence = useMemo(() => {
    if (typeof pessoas !== "number") return "low";
    return classifyConfidence(pessoas, tempInt ?? 25, tempExt ?? 28);
  }, [pessoas, tempInt, tempExt]);

  void lastUpdate;
  const diagnostics = getAIDiagnostics();

  return {
    tempAlvoIA,
    ruleTempAlvo,
    isAIActive: aiState.status === "ready" && isAIReady(),
    isLoadingAI: aiState.status === "loading",
    isFallback: aiState.status === "fallback",
    isRecalculating,
    lastUpdate,
    confidence,
    diagnostics,
    error: aiState.error,
    forceRecalc: () => runPrediction(true),
  };
}
