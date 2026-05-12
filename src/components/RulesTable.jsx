import { memo, useEffect, useState } from "react";
import { CLIMATE_RULES, EXT_TEMP_THRESHOLDS, MIN_TARGET_TEMP } from "../constants";
import { initClimateAI, predictTargetTemp, isAIReady } from "../ai/climateAI";

function formatBase(temp) {
  return temp === 0 ? "Desligado" : `${temp}°C`;
}

function formatAdjusted(temp, delta) {
  if (temp === 0) return "—";
  return `${Math.max(MIN_TARGET_TEMP, temp - delta)}°C`;
}

function midPeople(rule) {
  if (rule.maxPeople === Infinity) return Math.max(rule.minPeople, 35);
  return Math.round((rule.minPeople + rule.maxPeople) / 2);
}

function formatAI(value) {
  if (value === null || value === undefined) return "—";
  if (value === 0) return "Desligado";
  return `${value}°C`;
}

function RulesTableComponent() {
  const [aiReady, setAiReady] = useState(isAIReady());

  useEffect(() => {
    let cancel = false;
    initClimateAI().then((ok) => {
      if (!cancel) setAiReady(Boolean(ok));
    });
    return () => {
      cancel = true;
    };
  }, []);

  const iaSuggestions = aiReady
    ? CLIMATE_RULES.map((rule) => {
        const people = midPeople(rule);
        if (people === 0) return 0;
        return predictTargetTemp(people, 25, 28);
      })
    : null;

  return (
    <table className="rules-table" aria-label="Regras de climatização">
      <thead>
        <tr>
          <th>Pessoas</th>
          <th>Temp. base</th>
          <th>Se ext &gt; {EXT_TEMP_THRESHOLDS.hot}°C</th>
          <th>Se ext &gt; {EXT_TEMP_THRESHOLDS.veryHot}°C</th>
          {aiReady && <th>IA sugere</th>}
        </tr>
      </thead>
      <tbody>
        {CLIMATE_RULES.map((rule, idx) => {
          const iaValue = iaSuggestions ? iaSuggestions[idx] : null;
          const divergent =
            iaValue !== null && iaValue !== rule.baseTemp && rule.baseTemp !== 0;
          return (
            <tr key={rule.label}>
              <td>{rule.label}</td>
              <td>{formatBase(rule.baseTemp)}</td>
              <td>{formatAdjusted(rule.baseTemp, 1)}</td>
              <td>{formatAdjusted(rule.baseTemp, 2)}</td>
              {aiReady && (
                <td className={divergent ? "rules-table__ia-divergent" : undefined}>
                  {formatAI(iaValue)}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export const RulesTable = memo(RulesTableComponent);
