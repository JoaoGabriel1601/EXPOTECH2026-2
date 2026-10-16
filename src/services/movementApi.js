import { apiConfig } from "../config/api";

const SESSION_KEY = "movement.operator.session";

export function getSessionToken() {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

async function request(path, { token = getSessionToken(), ...options } = {}) {
  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    ...options,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 401 && token) {
      clearSession();
      window.dispatchEvent(new Event("movement:session-expired"));
    }
    throw new Error(response.status === 401 ? "Usuário, senha ou sessão inválidos" : `API Movement: HTTP ${response.status}`);
  }
  return response.json();
}

export async function login(username, password) {
  const result = await request("/auth/login", {
    method: "POST",
    token: null,
    body: JSON.stringify({ username, password }),
  });
  sessionStorage.setItem(SESSION_KEY, result.access_token);
}

export function mapReading(reading) {
  const timestamp = Date.parse(reading.measured_at);
  return {
    timestamp,
    time: new Date(timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    pessoas: reading.occupancy,
    tempInt: reading.temp_inside,
    tempExt: reading.temp_outside,
    tempAlvo: reading.target_temp,
    umidInt: reading.humidity_inside,
    umidExt: reading.humidity_outside,
    acLigado: reading.ac_on,
    modoManual: reading.manual_mode,
    tempAlvoIA: null,
    iaAtiva: false,
  };
}

export async function getLatest() {
  const result = await request(`/rooms/${encodeURIComponent(apiConfig.roomId)}/latest`);
  return result.reading ? { ...mapReading(result.reading), isStale: result.is_stale, ageSeconds: result.age_seconds } : null;
}

export async function getHistory(limit = apiConfig.results) {
  const readings = await request(`/rooms/${encodeURIComponent(apiConfig.roomId)}/history?limit=${limit}`);
  return readings.map(mapReading);
}

export const COMMANDS = {
  acOn: "AC_ON",
  acOff: "AC_OFF",
  manualOn: "MANUAL_ON",
  manualOff: "MANUAL_OFF",
  target: (temp) => `TARGET:${Math.round(temp)}`,
};

export async function sendCommand() {
  throw new Error("Controle pela API será habilitado após implementar confirmação do dispositivo");
}
