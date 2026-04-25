import {
  HISTORY_HOURS,
  HISTORY_SAMPLES_PER_HOUR,
  calcTargetTemp,
} from "../constants";

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function buildSample({ time, people, externalBase, i }) {
  const tempExt = externalBase + Math.sin(i / 12) * 4 + Math.random() * 1.5;
  const targetTemp = calcTargetTemp(people, tempExt);
  const tempInt =
    people > 0
      ? targetTemp + Math.random() * 2 - 0.5
      : tempExt - 2 + Math.random();
  return {
    time,
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
  const now = new Date();
  now.setHours(8, 0, 0, 0);
  let people = 0;

  const totalSamples = hours * HISTORY_SAMPLES_PER_HOUR;
  for (let i = 0; i < totalSamples; i++) {
    const time = new Date(now.getTime() + i * 10 * 60000);
    const h = time.getHours();
    const m = time.getMinutes();

    if (h === 8 && m === 0) people = 0;
    else if (h === 8 && m >= 20)
      people = Math.min(people + Math.floor(Math.random() * 8 + 2), 35);
    else if (h >= 9 && h < 12)
      people = Math.max(15, Math.min(38, people + Math.floor(Math.random() * 5 - 2)));
    else if (h === 12)
      people = Math.max(0, people - Math.floor(Math.random() * 10 + 5));
    else if (h >= 13 && h < 16)
      people = Math.max(10, Math.min(32, people + Math.floor(Math.random() * 5 - 2)));
    else people = Math.max(0, people - Math.floor(Math.random() * 5));

    data.push(
      buildSample({
        time: formatTime(time),
        people,
        externalBase: 28,
        i,
      })
    );
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
    ta = calcTargetTemp(p, te);
  }
  const ti =
    ta > 0 ? ta + Math.random() * 1.5 - 0.3 : te - 1 + Math.random();
  const now = new Date();
  return {
    time: formatTime(now),
    pessoas: p,
    tempInt: Math.round(ti * 10) / 10,
    tempExt: Math.round(te * 10) / 10,
    tempAlvo: ta,
    umidInt: Math.round(45 + Math.random() * 20),
    umidExt: Math.round(55 + Math.random() * 25),
  };
}
