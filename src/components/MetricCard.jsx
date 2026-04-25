import { memo, useState } from "react";

function MetricCardComponent({ label, value, unit, sub, color, icon: Icon }) {
  const [prevValue, setPrevValue] = useState(value);
  const [pulseKey, setPulseKey] = useState(0);

  if (value !== prevValue) {
    setPrevValue(value);
    setPulseKey((k) => k + 1);
  }

  return (
    <div className="metric-card" role="group" aria-label={label}>
      <div className="metric-card__bar" style={{ background: color }} />
      <div className="metric-card__head">
        {Icon && (
          <span className="metric-card__icon" style={{ color }}>
            <Icon />
          </span>
        )}
        <span className="metric-card__label">{label}</span>
      </div>
      <div className="metric-card__value-row">
        <span
          key={pulseKey}
          className={`metric-card__value${
            pulseKey > 0 ? " metric-card__value--changed" : ""
          }`}
          aria-live="polite"
        >
          {value}
        </span>
        {unit && <span className="metric-card__unit">{unit}</span>}
      </div>
      {sub && <div className="metric-card__sub">{sub}</div>}
    </div>
  );
}

export const MetricCard = memo(MetricCardComponent);
