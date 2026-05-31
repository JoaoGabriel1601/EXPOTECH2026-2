// Mock em memória do config/firebase.js — permite testar a API sem Firebase real.
// Expõe a mesma interface usada pela app: dbOp, getFirebaseAuth, firebaseReady.

let store = {};

export function __setStore(s) {
  store = structuredClone(s);
}
export function __reset() {
  store = {};
}

export const firebaseReady = () => true;

export function getFirebaseAuth() {
  return {
    // "valid-token" simula um ID token válido; qualquer outro é rejeitado.
    async verifyIdToken(token) {
      if (token === "valid-token") return { uid: "test-uid", email: "tester@climacontrol.local" };
      throw new Error("token inválido");
    },
  };
}

// ── Fake do Realtime Database ──
function getByPath(path) {
  return path.split("/").reduce((o, k) => (o == null ? undefined : o[k]), store);
}
function setByPath(path, val) {
  const keys = path.split("/");
  let o = store;
  for (let i = 0; i < keys.length - 1; i++) {
    o[keys[i]] ??= {};
    o = o[keys[i]];
  }
  const last = keys[keys.length - 1];
  if (val === undefined) delete o[last];
  else o[last] = val;
}

let counter = 0;
function makeRef(path) {
  const ref = {
    async get() {
      const v = getByPath(path);
      return { exists: () => v !== undefined && v !== null, val: () => v };
    },
    async set(v) {
      setByPath(path, v);
    },
    async update(patch) {
      setByPath(path, { ...(getByPath(path) || {}), ...patch });
    },
    async remove() {
      setByPath(path, undefined);
    },
    push(v) {
      const key = `gen_${++counter}`;
      setByPath(`${path}/${key}`, v);
      return Promise.resolve({ key });
    },
    orderByChild() {
      return ref;
    },
    startAt() {
      return ref;
    },
    limitToLast() {
      return ref;
    },
  };
  return ref;
}

export async function dbOp(fn) {
  const db = { ref: (p) => makeRef(p) };
  return fn(db);
}

export function getDb() {
  return { ref: (p) => makeRef(p) };
}
