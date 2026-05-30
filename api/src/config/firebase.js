import { readFileSync } from "node:fs";
import admin from "firebase-admin";

/**
 * Inicializa o Firebase Admin SDK uma única vez.
 *
 * Aceita a credencial de três formas (nesta ordem de prioridade):
 *   1. FIREBASE_SERVICE_ACCOUNT  → JSON inteiro da conta de serviço (usado no Render).
 *   2. GOOGLE_APPLICATION_CREDENTIALS → caminho para um arquivo .json (cômodo em dev).
 *   3. Nenhuma → modo degradado: a API sobe mas responde 503 nas rotas de dados.
 */
function loadServiceAccount() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inline) {
    try {
      return JSON.parse(inline);
    } catch {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT está definida mas não é um JSON válido. " +
          "Cole o conteúdo do arquivo da conta de serviço em uma única linha."
      );
    }
  }

  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (path) {
    return JSON.parse(readFileSync(path, "utf8"));
  }

  return null;
}

let _db = null;
let _ready = false;
let _initError = null;

try {
  const serviceAccount = loadServiceAccount();
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  if (serviceAccount && databaseURL) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL,
    });
    _db = admin.database();
    _ready = true;
    console.info("[firebase] Admin SDK conectado:", databaseURL);
  } else {
    _initError = new Error(
      "Credenciais do Firebase ausentes (FIREBASE_SERVICE_ACCOUNT/GOOGLE_APPLICATION_CREDENTIALS e/ou FIREBASE_DATABASE_URL)."
    );
    console.warn("[firebase] " + _initError.message + " Rotas de dados responderão 503.");
  }
} catch (err) {
  _initError = err;
  console.error("[firebase] Falha ao inicializar:", err.message);
}

/** Retorna a instância do Realtime Database ou lança 503 se indisponível. */
export function getDb() {
  if (!_ready || !_db) {
    const err = new Error("Banco de dados indisponível no momento.");
    err.status = 503;
    err.code = "DATABASE_UNAVAILABLE";
    if (_initError) err.detail = _initError.message;
    throw err;
  }
  return _db;
}

export const firebaseReady = () => _ready;
