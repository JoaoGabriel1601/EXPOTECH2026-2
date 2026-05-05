import { useCallback, useEffect, useState } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const STORE_KEY = "@climacontrol:biometric-cred";
const ENABLED_KEY = "@climacontrol:biometric-enabled";

export function useBiometric() {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [type, setType] = useState("biometria");

  useEffect(() => {
    (async () => {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      setAvailable(hasHw && enrolled);
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setType("Face ID");
      } else if (
        types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
      ) {
        setType("digital");
      }
      const en = await SecureStore.getItemAsync(ENABLED_KEY);
      setEnabled(en === "1");
    })();
  }, []);

  const enable = useCallback(async (email, password) => {
    await SecureStore.setItemAsync(
      STORE_KEY,
      JSON.stringify({ email, password })
    );
    await SecureStore.setItemAsync(ENABLED_KEY, "1");
    setEnabled(true);
  }, []);

  const disable = useCallback(async () => {
    await SecureStore.deleteItemAsync(STORE_KEY);
    await SecureStore.setItemAsync(ENABLED_KEY, "0");
    setEnabled(false);
  }, []);

  const authenticate = useCallback(async () => {
    if (!available) return { ok: false, error: "Biometria indisponível" };
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Acesse o ClimaControl",
      cancelLabel: "Cancelar",
      disableDeviceFallback: false,
    });
    if (!result.success) return { ok: false, error: result.error };
    const stored = await SecureStore.getItemAsync(STORE_KEY);
    if (!stored) return { ok: false, error: "Sem credenciais salvas" };
    return { ok: true, credentials: JSON.parse(stored) };
  }, [available]);

  return { available, enabled, type, enable, disable, authenticate };
}
