import { memo, useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { radius, spacing, typography } from "../utils/theme";

function MetricCardComponent({ icon, label, value, unit, sub, color }) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.08,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [value, scale]);

  const styles = makeStyles(theme);
  return (
    <View style={styles.card}>
      <View style={[styles.bar, { backgroundColor: color }]} />
      <View style={styles.head}>
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: `${color}22` }]}>
            <Ionicons name={icon} size={16} color={color} />
          </View>
        ) : null}
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={styles.valueRow}>
        <Animated.Text
          style={[styles.value, { transform: [{ scale }] }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Animated.Text>
        {unit ? (
          <Text style={styles.unit} numberOfLines={1}>
            {unit}
          </Text>
        ) : null}
      </View>
      {sub ? (
        <Text style={styles.sub} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: "hidden",
      justifyContent: "space-between",
    },
    bar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 3,
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: 4,
    },
    iconWrap: {
      width: 28,
      height: 28,
      borderRadius: radius.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      ...typography.caption,
      color: theme.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      flex: 1,
    },
    valueRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
    value: { fontSize: 28, fontWeight: "700", color: theme.text, flexShrink: 1 },
    unit: { fontSize: 14, color: theme.textMuted, fontWeight: "600" },
    sub: { ...typography.caption, color: theme.textMuted },
  });

export const MetricCard = memo(MetricCardComponent);
