import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SENSORS } from "../constants";
import { useTheme } from "../contexts/ThemeContext";
import { radius, spacing, typography } from "../utils/theme";

function dotColor(status, theme) {
  switch (status) {
    case "online":
      return theme.success;
    case "ativo":
      return theme.accent;
    case "standby":
      return theme.warn;
    default:
      return theme.danger;
  }
}

function SystemStatusComponent({ live, acOn, connectionStatus }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const firebaseOnline =
    connectionStatus === "online" || connectionStatus === "mock";

  return (
    <View style={styles.grid}>
      {SENSORS.map((sensor) => {
        let status = "online";
        let detail = sensor.detail;
        if (sensor.isAcLed) {
          status = acOn ? "ativo" : "standby";
          detail = acOn ? `Emitindo ${live?.tempAlvo ?? 0}°C` : "Aguardando";
        } else if (sensor.id === "firebase") {
          status = firebaseOnline ? "online" : "offline";
          detail = firebaseOnline
            ? connectionStatus === "mock"
              ? "Modo simulação"
              : "Sincronizado"
            : "Sem conexão";
        } else if (sensor.dynamicDetail && live) {
          detail = sensor.dynamicDetail(live);
        }
        return (
          <View key={sensor.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{sensor.label}</Text>
              <Text style={styles.detail}>{detail}</Text>
            </View>
            <View
              style={[styles.dot, { backgroundColor: dotColor(status, theme) }]}
            />
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      width: "48%",
      backgroundColor: theme.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      padding: spacing.md,
      gap: spacing.sm,
    },
    label: { ...typography.bodyStrong, color: theme.text },
    detail: { ...typography.caption, color: theme.textMuted, marginTop: 2 },
    dot: { width: 10, height: 10, borderRadius: 5 },
  });

export const SystemStatus = memo(SystemStatusComponent);
