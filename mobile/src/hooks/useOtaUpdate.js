import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";

export function useOtaUpdate() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [downloaded, setDownloaded] = useState(false);
  const inFlight = useRef(false);

  const check = async () => {
    if (inFlight.current) return;
    if (!Updates.isEnabled) {
      setStatus("disabled");
      return;
    }
    inFlight.current = true;
    try {
      setStatus("checking");
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        setStatus("downloading");
        await Updates.fetchUpdateAsync();
        setDownloaded(true);
        setStatus("ready");
      } else {
        setStatus("up-to-date");
      }
    } catch (err) {
      setError(err);
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  };

  useEffect(() => {
    check();
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") check();
    });
    return () => sub.remove();
  }, []);

  const apply = () => Updates.reloadAsync();

  return { status, error, downloaded, check, apply };
}
