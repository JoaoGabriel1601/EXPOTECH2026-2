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
  if (h < 7) return 1;
  if (h < 8) return 5;
  if (h < 9) return 18;
  if (h < 12) return 28;
  if (h === 12) return 10;
  if (h < 16) return 24;
  if (h < 18) return 12;
  return 2;
}

function nextOccupancy(prev, target) {
  const diff = target - prev;
  const lerp = Math.sign(diff) * Math.min(Math.abs(diff), 3);
  const noise = Math.floor(Math.random() * 5 - 2);
  return Math.max(0, prev + lerp + noise);
}

function chooseTarget(people, tempInt, tempExt) {
  if (isAIReady()) {
    return predictTargetTemp(people, tempInt, tempExt);
  }
  return calcTargetTemp(people, tempExt);
}

function buildSample({ timestamp, people, i, prevTempInt }) {
  const externalBase = 28;
  const tempExt = externalBase + Math.sin(i / 12) * 4 + Math.random() * 1.5;
  const tempIntEstimate =
    prevTempInt ?? (people > 0 ? 23 + Math.random() : tempExt - 2 + Math.random());
  const targetTemp = chooseTarget(people, tempIntEstimate, tempExt);
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
  let ta;
  if (manualMode) {
    ta = manualAcOn ? manualTarget : 0;
  } else {
    ta = chooseTarget(p, prev.tempInt ?? te, te);
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
    umidInt: Math.round(45 + Math.random() * 20),
    umidExt: Math.round(55 + Math.random() * 25),
  };
}
