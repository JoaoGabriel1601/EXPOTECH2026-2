import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth, skipAuth } from "../config/firebase";

const MOCK_USER = { uid: "mock", email: "demo@local", displayName: "Demo" };
const bypassAuth = skipAuth || !auth;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(bypassAuth ? MOCK_USER : null);
  const [loading, setLoading] = useState(!bypassAuth);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (bypassAuth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = useCallback(async (email, password) => {
    setError(null);
    if (bypassAuth) {
      setUser(MOCK_USER);
      return { ok: true, user: MOCK_USER };
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      setUser(cred.user);
      return { ok: true, user: cred.user };
    } catch (err) {
      console.warn("[Auth] signIn failed:", err.code, err.message);
      setError(err);
      return { ok: false, error: err };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (bypassAuth) {
      setUser(null);
      return;
    }
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err) {
      console.warn("[Auth] signOut failed:", err.message);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
