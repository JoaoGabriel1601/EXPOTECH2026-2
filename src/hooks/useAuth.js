import { useCallback, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth, skipAuth } from "../config/firebase";

const MOCK_USER = { uid: "mock", email: "demo@local", displayName: "Demo" };
const bypassAuth = skipAuth || !auth;

export function useAuth() {
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
    if (bypassAuth) return { ok: true, user: MOCK_USER };
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return { ok: true, user: cred.user };
    } catch (err) {
      setError(err);
      return { ok: false, error: err };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (bypassAuth) {
      setUser(null);
      return;
    }
    await firebaseSignOut(auth);
  }, []);

  return { user, loading, error, signIn, signOut };
}
