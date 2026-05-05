import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  CLIMATE_RULES,
  EXT_TEMP_THRESHOLDS,
  MIN_TARGET_TEMP,
} from "../constants";
import { useTheme } from "../contexts/ThemeContext";
import { spacing, typography } from "../utils/theme";

function formatBase(t) {
  return t === 0 ? "Off" : `${t}°C`;
}
function formatAdjusted(t, delta) {
  if (t === 0) return "—";
  return `${Math.max(MIN_TARGET_TEMP, t - delta)}°C`;
}

function RulesTableComponent() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <View>
      <View style={[styles.row, styles.head]}>
        <Text style={[styles.cell, styles.headCell, { flex: 1.4 }]}>Pessoas</Text>
        <Text style={[styles.cell, styles.headCell]}>Base</Text>
        <Text style={[styles.cell, styles.headCell]}>
          {">"}{EXT_TEMP_THRESHOLDS.hot}°
        </Text>
        <Text style={[styles.cell, styles.headCell]}>
          {">"}{EXT_TEMP_THRESHOLDS.veryHot}°
        </Text>
      </View>
      {CLIMATE_RULES.map((rule, i) => (
        <View
          key={rule.label}
          style={[
            styles.row,
            i % 2 === 1 && { backgroundColor: theme.surfaceMuted },
          ]}
        >
          <Text style={[styles.cell, { flex: 1.4, color: theme.text }]}>
            {rule.label}
          </Text>
          <Text style={[styles.cell, { color: theme.text }]}>
            {formatBase(rule.baseTemp)}
          </Text>
          <Text style={[styles.cell, { color: theme.textMuted }]}>
            {formatAdjusted(rule.baseTemp, 1)}
          </Text>
          <Text style={[styles.cell, { color: theme.textMuted }]}>
            {formatAdjusted(rule.baseTemp, 2)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      paddingVertical: 10,
      paddingHorizontal: spacing.sm,
      alignItems: "center",
    },
    head: {
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    cell: {
      flex: 1,
      ...typography.body,
      textAlign: "center",
    },
    headCell: {
      ...typography.caption,
      color: theme.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
  });

export const RulesTable = memo(RulesTableComponent);
