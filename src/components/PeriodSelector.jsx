import { memo } from "react";
import { PERIOD_OPTIONS } from "../constants";

function PeriodSelectorComponent({ value, onChange }) {
  return (
    <div className="period-selector" role="group" aria-label="Selecionar período">
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className="period-selector__btn"
          aria-pressed={value === opt.id}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export const PeriodSelector = memo(PeriodSelectorComponent);
