import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("alerts", {
    name: "Alertas do A/C",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: "#3b82f6",
  });
}

export function useNotifications({ live, acOn }) {
  const lastAcStateRef = useRef(acOn);
  const lastTempAlertRef = useRef(0);

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        await Notifications.requestPermissionsAsync();
      }
      await ensureChannel();
    })();
  }, []);

  useEffect(() => {
    if (acOn !== lastAcStateRef.current) {
      lastAcStateRef.current = acOn;
      Notifications.scheduleNotificationAsync({
        content: {
          title: acOn ? "A/C ligado" : "A/C desligado",
          body: acOn
            ? `Climatização iniciada${live ? ` — alvo ${live.tempAlvo}°C` : ""}.`
            : "Sistema entrou em standby.",
        },
        trigger: null,
      });
    }
  }, [acOn, live]);

  useEffect(() => {
    if (!live) return;
    const now = Date.now();
    if (live.tempInt > 32 && now - lastTempAlertRef.current > 10 * 60 * 1000) {
      lastTempAlertRef.current = now;
      Notifications.scheduleNotificationAsync({
        content: {
          title: "Temperatura alta",
          body: `Temperatura interna em ${live.tempInt}°C — verifique o ambiente.`,
        },
        trigger: null,
      });
    }
  }, [live]);
}
