import { useCallback, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth, skipAuth } from "../config/firebase";

const MOCK_USER = { uid: "mock", email: "demo@local", displayName: "Demo" };

export function useAuth() {
  const [user, setUser] = useState(skipAuth ? MOCK_USER : null);
  const [loading, setLoading] = useState(!skipAuth);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (skipAuth || !auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = useCallback(async (email, password) => {
    setError(null);
    if (skipAuth || !auth) return { ok: true, user: MOCK_USER };
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return { ok: true, user: cred.user };
    } catch (err) {
      setError(err);
      return { ok: false, error: err };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (skipAuth || !auth) {
      setUser(null);
      return;
    }
    await firebaseSignOut(auth);
  }, []);

  return { user, loading, error, signIn, signOut };
}
