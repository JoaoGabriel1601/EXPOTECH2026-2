import {
  HISTORY_HOURS,
  HISTORY_SAMPLES_PER_HOUR,
  HISTORY_INTERVAL_MS,
  calcTargetTemp,
} from "../constants";
import { predictTargetTemp, isAIReady } from "../ai/climateAI";

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function targetOccupancy(date) {
  const h = date.getHours();
  if (h < 6) return 2;
  if (h < 7) return 4;
  if (h < 8) return 8;
  if (h < 9) return 18;
  if (h < 12) return 28;
  if (h === 12) return 12;
  if (h < 16) return 24;
  if (h < 18) return 14;
  if (h < 20) return 8;
  if (h < 22) return 4;
  return 2;
}

function nextOccupancy(prev, target) {
  const diff = target - prev;
  const lerp = Math.sign(diff) * Math.min(Math.abs(diff), 3);
  const noiseRange = Math.max(1, Math.min(3, Math.floor(target * 0.25)));
  const noise = Math.floor(Math.random() * (noiseRange * 2 + 1)) - noiseRange;
  return Math.max(1, prev + lerp + noise);
}

function buildSample({ timestamp, people, i, prevTempInt }) {
  const externalBase = 28;
  const tempExt = externalBase + Math.sin(i / 12) * 4 + Math.random() * 1.5;
  const tempIntEstimate =
    prevTempInt ?? (people > 0 ? 23 + Math.random() : tempExt - 2 + Math.random());
  const rawIA = predictTargetTemp(people, tempIntEstimate, tempExt);
  const rawRegra = calcTargetTemp(people, tempExt);
  const targetTemp = isAIReady() ? rawIA : rawRegra;
  const tempInt =
    people > 0
      ? targetTemp + Math.random() * 2 - 0.5
      : tempExt - 2 + Math.random();
  return {
    timestamp,
    time: formatTime(new Date(timestamp)),
    pessoas: Math.max(0, people),
    tempInt: Math.round(tempInt * 10) / 10,
    tempExt: Math.round(tempExt * 10) / 10,
    tempAlvo: targetTemp,
    tempAlvoIA: rawIA > 0 ? rawIA : null,
    tempAlvoRegra: rawRegra > 0 ? rawRegra : null,
    umidInt: Math.round(45 + Math.random() * 20),
    umidExt: Math.round(55 + Math.random() * 25),
  };
}

export function generateHistory(hours = HISTORY_HOURS) {
  const data = [];
  const now = Date.now();
  const total = hours * HISTORY_SAMPLES_PER_HOUR;
  const startDate = new Date(now - (total - 1) * HISTORY_INTERVAL_MS);
  let people = targetOccupancy(startDate);
  let prevTempInt = null;

  for (let i = 0; i < total; i++) {
    const timestamp = now - (total - 1 - i) * HISTORY_INTERVAL_MS;
    const date = new Date(timestamp);
    const target = targetOccupancy(date);
    people = nextOccupancy(people, target);
    const sample = buildSample({ timestamp, people, i, prevTempInt });
    prevTempInt = sample.tempInt;
    data.push(sample);
  }
  return data;
}

export function nextLiveSample(prev, override = {}) {
  const { manualMode = false, manualAcOn = true, manualTarget = 22 } = override;
  const p = Math.max(0, prev.pessoas + Math.floor(Math.random() * 3 - 1));
  const te = prev.tempExt + (Math.random() - 0.48) * 0.3;
  const rawIA = predictTargetTemp(p, prev.tempInt ?? te, te);
  const rawRegra = calcTargetTemp(p, te);
  let ta;
  if (manualMode) {
    ta = manualAcOn ? manualTarget : 0;
  } else {
    ta = isAIReady() ? rawIA : rawRegra;
  }
  const ti =
    ta > 0 ? ta + Math.random() * 1.5 - 0.3 : te - 1 + Math.random();
  const now = new Date();
  return {
    timestamp: now.getTime(),
    time: formatTime(now),
    pessoas: p,
    tempInt: Math.round(ti * 10) / 10,
    tempExt: Math.round(te * 10) / 10,
    tempAlvo: ta,
    tempAlvoIA: rawIA > 0 ? rawIA : null,
    tempAlvoRegra: rawRegra > 0 ? rawRegra : null,
    umidInt: Math.round(45 + Math.random() * 20),
    umidExt: Math.round(55 + Math.random() * 25),
  };
}
