import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusPill } from "./StatusPill";
import { useTheme } from "../contexts/ThemeContext";
import { Logo } from "./Logo";
import { radius, spacing, typography } from "../utils/theme";
import { useMockData } from "../config/thingspeak";

function HeaderComponent({
  acOn,
  manualMode,
  connectionStatus,
  user,
  onSignOut,
  onToggleTheme,
}) {
  const { theme, resolvedMode } = useTheme();
  const styles = makeStyles(theme);

  const isMock = useMockData || connectionStatus === "mock";
  const liveLabel = isMock
    ? "Modo simulação"
    : connectionStatus === "online"
      ? "Ao vivo"
      : connectionStatus === "connecting"
        ? "Conectando..."
        : "Offline";
  const liveDot = isMock
    ? theme.warn
    : connectionStatus === "online"
      ? theme.success
      : connectionStatus === "connecting"
        ? theme.warn
        : theme.danger;

  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <Logo size={64} withBackground />
        <View style={styles.brandText}>
          <Text style={styles.subtitle} numberOfLines={1}>
            {user?.email
              ? `Olá, ${user.displayName || user.email}`
              : "Climatização autônoma"}
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={onToggleTheme}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            hitSlop={6}
          >
            <Ionicons
              name={resolvedMode === "light" ? "moon" : "sunny"}
              size={18}
              color={theme.text}
            />
          </Pressable>
          {onSignOut && (
            <Pressable
              onPress={onSignOut}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.pressed,
              ]}
              hitSlop={6}
            >
              <Ionicons name="log-out-outline" size={20} color={theme.text} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.statusRow}>
        <StatusPill on={acOn} label={acOn ? "A/C ligado" : "A/C desligado"} />
        {manualMode && <StatusPill on label="Modo manual" />}
        <View style={[styles.livePill, { backgroundColor: theme.surfaceMuted }]}>
          <View style={[styles.liveDot, { backgroundColor: liveDot }]} />
          <Text style={[styles.liveText, { color: theme.textMuted }]}>
            {liveLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.bg,
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    brandText: { flex: 1 },
    subtitle: { ...typography.caption, color: theme.textMuted, marginTop: 2 },
    actions: { flexDirection: "row", gap: spacing.sm },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.border,
    },
    pressed: { opacity: 0.7 },
    statusRow: {
      marginTop: spacing.md,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    livePill: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.pill,
      gap: 6,
    },
    liveDot: { width: 7, height: 7, borderRadius: 4 },
    liveText: { ...typography.caption, fontWeight: "600" },
  });

export const Header = memo(HeaderComponent);
