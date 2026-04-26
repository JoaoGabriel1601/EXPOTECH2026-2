import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

function pick(envKey, extraKey) {
  const env = process.env?.[envKey];
  if (env && env.length) return env;
  return extra[extraKey];
}

const firebaseConfig = {
  apiKey: pick("EXPO_PUBLIC_FIREBASE_API_KEY", "firebaseApiKey"),
  authDomain: pick("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN", "firebaseAuthDomain"),
  projectId: pick("EXPO_PUBLIC_FIREBASE_PROJECT_ID", "firebaseProjectId"),
  storageBucket: pick(
    "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "firebaseStorageBucket"
  ),
  messagingSenderId: pick(
    "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "firebaseMessagingSenderId"
  ),
  appId: pick("EXPO_PUBLIC_FIREBASE_APP_ID", "firebaseAppId"),
  measurementId: pick(
    "EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID",
    "firebaseMeasurementId"
  ),
  databaseURL: pick(
    "EXPO_PUBLIC_FIREBASE_DATABASE_URL",
    "firebaseDatabaseUrl"
  ),
};

const useMockFlag = pick("EXPO_PUBLIC_USE_MOCK_DATA", "useMockData");
const skipAuthFlag = pick("EXPO_PUBLIC_SKIP_AUTH", "skipAuth");

export const useMockData =
  useMockFlag === true || useMockFlag === "true" || !firebaseConfig.apiKey;
export const skipAuth = skipAuthFlag === true || skipAuthFlag === "true";

let _app = null;
let _auth = null;
let _db = null;

if (firebaseConfig.apiKey) {
  _app = initializeApp(firebaseConfig);
  _auth = initializeAuth(_app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  if (!useMockData) {
    _db = getDatabase(_app);
  }
}

export const app = _app;
export const auth = _auth;
export const db = _db;
