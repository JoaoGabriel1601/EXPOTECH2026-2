import { memo, useState } from "react";
import { BrainIcon, ChevronIcon, AlertIcon } from "./icons";
import { AI_CARD_COLOR } from "../constants";

function formatTime(ts) {
  if (!ts) return "—";
  const date = new Date(ts);
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function confidenceLabel(c) {
  if (c === "high") return "Alta";
  if (c === "medium") return "Média";
  return "Baixa";
}

function AIInsightsPanelComponent({ ai, live }) {
  const [open, setOpen] = useState(false);
  if (!ai) return null;

  const {
    tempAlvoIA,
    ruleTempAlvo,
    isAIActive,
    isLoadingAI,
    isFallback,
    isRecalculating,
    lastUpdate,
    confidence,
    diagnostics,
    error,
  } = ai;

  const diferenca =
    typeof tempAlvoIA === "number" && typeof ruleTempAlvo === "number"
      ? tempAlvoIA - ruleTempAlvo
      : null;

  return (
    <div className="ai-panel" style={{ "--ai-color": AI_CARD_COLOR }}>
      <button
        type="button"
        className="ai-panel__header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="ai-panel__title">
          <BrainIcon /> Insights da IA
        </span>
        <span className="ai-panel__status">
          {isLoadingAI && "Carregando modelo..."}
          {!isLoadingAI && isAIActive && (
            <>
              Ativa · confiança {confidenceLabel(confidence)}
            </>
          )}
          {!isLoadingAI && isFallback && (
            <span className="ai-panel__warn">
              <AlertIcon /> Usando regras fixas
            </span>
          )}
          <ChevronIcon
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0)",
              transition: "transform 0.2s",
            }}
          />
        </span>
      </button>

      {open && (
        <div className="ai-panel__body">
          <div className="ai-panel__row">
            <div>
              <div className="ai-panel__label">IA sugere</div>
              <div className="ai-panel__value">
                {tempAlvoIA === null
                  ? "—"
                  : tempAlvoIA === 0
                    ? "Desligado"
                    : `${tempAlvoIA}°C`}
              </div>
            </div>
            <div>
              <div className="ai-panel__label">Regra fixa</div>
              <div className="ai-panel__value ai-panel__value--muted">
                {ruleTempAlvo === null
                  ? "—"
                  : ruleTempAlvo === 0
                    ? "Desligado"
                    : `${ruleTempAlvo}°C`}
              </div>
            </div>
            <div>
              <div className="ai-panel__label">Diferença</div>
              <div className="ai-panel__value">
                {diferenca === null
                  ? "—"
                  : diferenca === 0
                    ? "Idêntico"
                    : `${diferenca > 0 ? "+" : ""}${diferenca}°C`}
              </div>
            </div>
          </div>

          <div className="ai-panel__meta">
            <div>
              <strong>Versão do modelo:</strong> {diagnostics?.modelVersion ?? "—"}
            </div>
            <div>
              <strong>Último cálculo:</strong> {formatTime(lastUpdate)}
            </div>
            <div>
              <strong>Latência:</strong>{" "}
              {diagnostics?.inferenceTimeMs != null
                ? `${diagnostics.inferenceTimeMs.toFixed(1)} ms`
                : "—"}
            </div>
            {isRecalculating && (
              <div className="ai-panel__recalc">
                Recalculando após mudança de ocupação...
              </div>
            )}
          </div>

          {live && (
            <div className="ai-panel__inputs">
              <div className="ai-panel__label">Entradas do modelo</div>
              <div className="ai-panel__pills">
                <span className="ai-pill">{live.pessoas} pessoas</span>
                <span className="ai-pill">{live.tempInt}°C interna</span>
                <span className="ai-pill">{live.tempExt}°C externa</span>
              </div>
            </div>
          )}

          {error && (
            <div className="ai-panel__error">
              <AlertIcon /> {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const AIInsightsPanel = memo(AIInsightsPanelComponent);
