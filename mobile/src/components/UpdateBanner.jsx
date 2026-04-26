import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useOtaUpdate } from "../hooks/useOtaUpdate";
import { radius, spacing, typography } from "../utils/theme";

export function UpdateBanner() {
  const { theme } = useTheme();
  const { downloaded, apply } = useOtaUpdate();

  if (!downloaded) return null;

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: theme.surface, borderColor: theme.accent },
      ]}
    >
      <Ionicons name="cloud-download" size={18} color={theme.accent} />
      <Text style={[styles.text, { color: theme.text }]} numberOfLines={2}>
        Atualização disponível
      </Text>
      <Pressable
        onPress={apply}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: theme.accent },
          pressed && { opacity: 0.8 },
        ]}
        hitSlop={8}
      >
        <Text style={styles.btnText}>Aplicar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 50,
  },
  text: { ...typography.body, flex: 1, fontWeight: "600" },
  btn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
