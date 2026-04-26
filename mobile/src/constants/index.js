export const CHART_COLORS = {
  tempInt: "#3b82f6",
  tempExt: "#f97316",
  tempAlvo: "#22c55e",
  pessoas: "#8b5cf6",
  umidInt: "#06b6d4",
  umidExt: "#f59e0b",
};

export const CARD_COLORS = {
  pessoas: "#8b5cf6",
  tempInt: "#3b82f6",
  tempExt: "#f97316",
  tempAlvo: "#22c55e",
  umidInt: "#06b6d4",
};

export const UPDATE_INTERVAL_MS = 5000;
export const HISTORY_HOURS = 12;
export const HISTORY_SAMPLES_PER_HOUR = 6;
export const HISTORY_INTERVAL_MS = 10 * 60 * 1000;
export const HISTORY_APPEND_MS = 60 * 1000;
export const HISTORY_MAX_POINTS = 500;

export const CLIMATE_RULES = [
  { minPeople: 0, maxPeople: 0, baseTemp: 0, label: "Desligado" },
  { minPeople: 1, maxPeople: 5, baseTemp: 24, label: "1 – 5" },
  { minPeople: 6, maxPeople: 15, baseTemp: 22, label: "6 – 15" },
  { minPeople: 16, maxPeople: 30, baseTemp: 20, label: "16 – 30" },
  { minPeople: 31, maxPeople: Infinity, baseTemp: 18, label: "30+" },
];

export const EXT_TEMP_THRESHOLDS = {
  hot: 30,
  veryHot: 35,
};

export const MIN_TARGET_TEMP = 16;

export function calcTargetTemp(people, externalTemp) {
  if (people <= 0) return 0;
  const rule = CLIMATE_RULES.find(
    (r) => people >= r.minPeople && people <= r.maxPeople
  );
  let target = rule ? rule.baseTemp : 18;
  if (externalTemp > EXT_TEMP_THRESHOLDS.veryHot) {
    target = Math.max(MIN_TARGET_TEMP, target - 2);
  } else if (externalTemp > EXT_TEMP_THRESHOLDS.hot) {
    target = Math.max(MIN_TARGET_TEMP, target - 1);
  }
  return target;
}

export const OCCUPANCY_THRESHOLDS = {
  high: 30,
  medium: 15,
};

export const HUMIDITY_THRESHOLDS = {
  high: 65,
  comfortable: 40,
};

export const SENSORS = [
  { id: "tcrt-a", label: "TCRT5000 A", detail: "Sensor externo" },
  { id: "tcrt-b", label: "TCRT5000 B", detail: "Sensor interno" },
  { id: "dht-ext", label: "DHT11 externo", dynamicDetail: (live) => `${live.tempExt}°C` },
  { id: "dht-int-1", label: "DHT11 int. 1", detail: "Perto do A/C" },
  { id: "dht-int-2", label: "DHT11 int. 2", detail: "Longe do A/C" },
  { id: "led-ir", label: "LED IR", isAcLed: true },
  { id: "wifi", label: "WiFi", detail: "Conectado" },
  { id: "firebase", label: "Firebase", detail: "Sincronizado" },
];

export const CARD_COLORS_EFFICIENCY = "#f43f5e";

export function computeAcUsage(history) {
  if (!history || history.length < 2) {
    return { hoursOn: 0, totalHours: 0, percent: 0 };
  }
  let onMs = 0;
  for (let i = 0; i < history.length - 1; i++) {
    const cur = history[i];
    const next = history[i + 1];
    if (
      typeof cur.timestamp !== "number" ||
      typeof next.timestamp !== "number"
    )
      continue;
    const delta = next.timestamp - cur.timestamp;
    if (delta <= 0) continue;
    if (cur.tempAlvo > 0) onMs += delta;
  }
  const first = history[0].timestamp;
  const last = history[history.length - 1].timestamp;
  const totalMs = Math.max(0, last - first);
  return {
    hoursOn: onMs / 3600000,
    totalHours: totalMs / 3600000,
    percent: totalMs > 0 ? (onMs / totalMs) * 100 : 0,
  };
}

export const PERIOD_OPTIONS = [
  { id: "1h", label: "1h", hours: 1 },
  { id: "4h", label: "4h", hours: 4 },
  { id: "8h", label: "8h", hours: 8 },
  { id: "12h", label: "12h", hours: 12 },
];
