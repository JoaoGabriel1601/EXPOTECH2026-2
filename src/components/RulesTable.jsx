import { memo } from "react";
import { CLIMATE_RULES, EXT_TEMP_THRESHOLDS, MIN_TARGET_TEMP } from "../constants";

function formatBase(temp) {
  return temp === 0 ? "Desligado" : `${temp}°C`;
}

function formatAdjusted(temp, delta) {
  if (temp === 0) return "—";
  return `${Math.max(MIN_TARGET_TEMP, temp - delta)}°C`;
}

function RulesTableComponent() {
  return (
    <table className="rules-table" aria-label="Regras de climatização">
      <thead>
        <tr>
          <th>Pessoas</th>
          <th>Temp. base</th>
          <th>Se ext &gt; {EXT_TEMP_THRESHOLDS.hot}°C</th>
          <th>Se ext &gt; {EXT_TEMP_THRESHOLDS.veryHot}°C</th>
        </tr>
      </thead>
      <tbody>
        {CLIMATE_RULES.map((rule) => (
          <tr key={rule.label}>
            <td>{rule.label}</td>
            <td>{formatBase(rule.baseTemp)}</td>
            <td>{formatAdjusted(rule.baseTemp, 1)}</td>
            <td>{formatAdjusted(rule.baseTemp, 2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const RulesTable = memo(RulesTableComponent);
