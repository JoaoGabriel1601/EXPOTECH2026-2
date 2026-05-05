import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkTheme, lightTheme } from "../utils/theme";

const STORAGE_KEY = "@climacontrol:theme";

const ThemeContext = createContext({
  theme: darkTheme,
  mode: "auto",
  setMode: () => {},
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState("auto");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === "dark" || v === "light" || v === "auto") setModeState(v);
      })
      .finally(() => setHydrated(true));
  }, []);

  const setMode = useCallback(async (next) => {
    setModeState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => {
    const resolved =
      mode === "auto" ? (systemScheme === "light" ? "light" : "dark") : mode;
    const theme = resolved === "light" ? lightTheme : darkTheme;
    return { theme, mode, resolvedMode: resolved, setMode, hydrated };
  }, [mode, systemScheme, setMode, hydrated]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
