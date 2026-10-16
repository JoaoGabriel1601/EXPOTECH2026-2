const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export const apiConfig = {
  baseUrl,
  roomId: import.meta.env.VITE_ROOM_ID || "sala-01",
  results: 2000,
};

export const useMockData = import.meta.env.VITE_USE_MOCK_DATA === "true" || !baseUrl;
// Primeiro marco: telemetria. Controle entra com confirmação pelo ESP32.
export const controlEnabled = false;
