import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { radius, spacing, typography } from "../utils/theme";

function StatusPillComponent({ on, label }) {
  const { theme } = useTheme();
  const color = on ? theme.success : theme.textMuted;
  const bg = on ? theme.successSoft : theme.surfaceMuted;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { ...typography.caption, fontWeight: "600" },
});

export const StatusPill = memo(StatusPillComponent);
