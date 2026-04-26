import { useCallback, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { ThemeProvider, useTheme } from "./src/contexts/ThemeContext";
import { AuthProvider } from "./src/contexts/AuthContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { UpdateBanner } from "./src/components/UpdateBanner";

SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedShell() {
  const { theme, hydrated, resolvedMode } = useTheme();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.bg).catch(() => {});
  }, [theme.bg]);

  const onLayout = useCallback(async () => {
    if (hydrated) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [hydrated]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.bg }} onLayout={onLayout}>
      <SafeAreaProvider>
        <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />
        <AppNavigator />
        <UpdateBanner />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemedShell />
      </AuthProvider>
    </ThemeProvider>
  );
}
