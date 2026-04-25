import { memo } from "react";

function MetricCardComponent({ label, value, unit, sub, color, icon: Icon }) {
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
        <span className="metric-card__value">{value}</span>
        {unit && <span className="metric-card__unit">{unit}</span>}
      </div>
      {sub && <div className="metric-card__sub">{sub}</div>}
    </div>
  );
}

export const MetricCard = memo(MetricCardComponent);
