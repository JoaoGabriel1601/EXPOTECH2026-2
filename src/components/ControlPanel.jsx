import { useCallback, useState } from "react";
import { PowerIcon, PlusIcon, MinusIcon } from "./icons";
import { MIN_TARGET_TEMP } from "../constants";

const MAX_TARGET_TEMP = 28;

export function ControlPanel({
  acOn,
  targetTemp,
  manualTarget,
  manualMode,
  onSetAcOn,
  onSetTargetTemp,
  onSetManualMode,
}) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [localTemp, setLocalTemp] = useState(
    manualTarget || targetTemp || 22
  );
  const [prevManualTarget, setPrevManualTarget] = useState(manualTarget);
  if (manualTarget !== prevManualTarget) {
    setPrevManualTarget(manualTarget);
    if (manualTarget) setLocalTemp(manualTarget);
  }

  const announce = useCallback((message, ok = true) => {
    setFeedback({ message, ok });
    setTimeout(() => setFeedback(null), 2500);
  }, []);

  const onTogglePower = useCallback(async () => {
    setBusy(true);
    const result = await onSetAcOn(!acOn);
    setBusy(false);
    if (result.ok) {
      announce(acOn ? "A/C desligado" : "A/C ligado");
    } else {
      announce("Falha ao enviar comando", false);
    }
  }, [acOn, announce, onSetAcOn]);

  const onToggleManual = useCallback(async () => {
    setBusy(true);
    const result = await onSetManualMode(!manualMode);
    setBusy(false);
    if (result.ok) {
      announce(manualMode ? "Modo automático ativado" : "Modo manual ativado");
    } else {
      announce("Falha ao enviar comando", false);
    }
  }, [manualMode, announce, onSetManualMode]);

  const onChangeTemp = useCallback(
    async (delta) => {
      const next = Math.min(
        MAX_TARGET_TEMP,
        Math.max(MIN_TARGET_TEMP, localTemp + delta)
      );
      if (next === localTemp) return;
      setLocalTemp(next);
      setBusy(true);
      const result = await onSetTargetTemp(next);
      setBusy(false);
      if (result.ok) {
        announce(`Alvo ajustado para ${next}°C`);
      } else {
        announce("Falha ao enviar comando", false);
      }
    },
    [localTemp, announce, onSetTargetTemp]
  );

  return (
    <div className="control-panel">
      <div className="control-panel__group">
        <span className="control-panel__group-label">Energia</span>
        <div className="control-panel__buttons">
          <button
            type="button"
            className={`btn ${acOn ? "btn--danger" : "btn--success"}`}
            onClick={onTogglePower}
            disabled={busy}
            aria-label={acOn ? "Desligar A/C" : "Ligar A/C"}
          >
            <PowerIcon /> {acOn ? "Desligar" : "Ligar"}
          </button>
          <button
            type="button"
            className={`btn ${manualMode ? "btn--primary" : ""}`}
            onClick={onToggleManual}
            disabled={busy}
            aria-pressed={manualMode}
          >
            {manualMode ? "Modo manual" : "Modo automático"}
          </button>
        </div>
      </div>

      <div className="control-panel__group">
        <span className="control-panel__group-label">Temperatura alvo</span>
        <div
          className="temp-stepper"
          role="group"
          aria-label="Ajustar temperatura alvo"
        >
          <button
            type="button"
            className="temp-stepper__btn"
            onClick={() => onChangeTemp(-1)}
            disabled={busy || localTemp <= MIN_TARGET_TEMP}
            aria-label="Diminuir 1 grau"
          >
            <MinusIcon width={14} height={14} />
          </button>
          <span className="temp-stepper__value">{localTemp}°C</span>
          <button
            type="button"
            className="temp-stepper__btn"
            onClick={() => onChangeTemp(1)}
            disabled={busy || localTemp >= MAX_TARGET_TEMP}
            aria-label="Aumentar 1 grau"
          >
            <PlusIcon width={14} height={14} />
          </button>
        </div>
        {!manualMode && (
          <p className="metric-card__sub">
            Em modo automático — ajustar o alvo ativa o controle manual.
          </p>
        )}
        {feedback && (
          <p
            className="metric-card__sub"
            role="status"
            style={{ color: feedback.ok ? "var(--success)" : "var(--danger)" }}
          >
            {feedback.message}
          </p>
        )}
      </div>
    </div>
  );
}
