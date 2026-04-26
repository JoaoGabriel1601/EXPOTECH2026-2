import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey && firebaseConfig.databaseURL
);
const mockFlag = import.meta.env.VITE_USE_MOCK_DATA === "true";

export const useMockData = mockFlag || !hasFirebaseConfig;
export const mockReason = mockFlag
  ? "flag"
  : !hasFirebaseConfig
    ? "missing-config"
    : null;
export const skipAuth = import.meta.env.VITE_SKIP_AUTH === "true";

let _app = null;
let _auth = null;
let _db = null;

if (hasFirebaseConfig) {
  _app = initializeApp(firebaseConfig);
  _auth = getAuth(_app);
  if (!useMockData) {
    _db = getDatabase(_app);
  }
}

export const app = _app;
export const auth = _auth;
export const db = _db;

if (typeof window !== "undefined" && import.meta.env.DEV) {
  if (useMockData) {
    console.info(
      mockReason === "flag"
        ? "[ClimaControl] VITE_USE_MOCK_DATA=true — modo simulação ativo."
        : "[ClimaControl] Firebase não configurado — modo simulação ativo."
    );
  } else {
    console.info(
      "[ClimaControl] Conectado ao Realtime Database:",
      firebaseConfig.databaseURL
    );
  }
}
