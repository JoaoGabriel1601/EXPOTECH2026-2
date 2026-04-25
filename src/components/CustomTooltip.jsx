function unitFor(name) {
  if (name.includes("Umid")) return "%";
  if (name.includes("Temp") || name.includes("Alvo")) return "°C";
  return "";
}

export function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tooltip" role="tooltip">
      <div className="tooltip__label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="tooltip__row">
          <span className="tooltip__swatch" style={{ background: p.color }} />
          <span className="tooltip__name">{p.name}:</span>
          <span className="tooltip__value">
            {p.value}
            {unitFor(p.name)}
          </span>
        </div>
      ))}
    </div>
  );
}
