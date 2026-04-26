import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { PERIOD_OPTIONS } from "../constants";
import { useTheme } from "../contexts/ThemeContext";
import { radius, spacing, typography } from "../utils/theme";

function PeriodSelectorComponent({ value, onChange }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const press = (id) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(id);
  };

  return (
    <View style={styles.row}>
      {PERIOD_OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => press(opt.id)}
            style={[styles.btn, active && styles.btnActive]}
          >
            <Text style={[styles.txt, active && styles.txtActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      backgroundColor: theme.surfaceMuted,
      borderRadius: radius.pill,
      padding: 3,
      borderWidth: 1,
      borderColor: theme.border,
    },
    btn: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.pill,
    },
    btnActive: { backgroundColor: theme.accent },
    txt: { ...typography.caption, color: theme.textMuted, fontWeight: "600" },
    txtActive: { color: "#fff" },
  });

export const PeriodSelector = memo(PeriodSelectorComponent);
