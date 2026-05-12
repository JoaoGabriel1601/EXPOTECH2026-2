import { memo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { radius, spacing, typography } from "../utils/theme";
import { AI_CARD_COLOR } from "../constants";

function formatTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function confidenceLabel(c) {
  if (c === "high") return "Alta";
  if (c === "medium") return "Média";
  return "Baixa";
}

function AIInsightsCardComponent({ ai, live }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const styles = makeStyles(theme);

  if (!ai) return null;

  const {
    tempAlvoIA,
    ruleTempAlvo,
    isAIActive,
    isLoadingAI,
    isFallback,
    isRecalculating,
    lastUpdate,
    confidence,
    diagnostics,
    error,
  } = ai;

  const diff =
    typeof tempAlvoIA === "number" && typeof ruleTempAlvo === "number"
      ? tempAlvoIA - ruleTempAlvo
      : null;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Insights da IA"
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.titleRow}>
          <Ionicons name="sparkles" size={18} color={AI_CARD_COLOR} />
          <Text style={styles.title}>Insights da IA</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.status} numberOfLines={1}>
            {isLoadingAI
              ? "Carregando..."
              : isAIActive
                ? `Ativa · ${confidenceLabel(confidence)}`
                : isFallback
                  ? "Regras fixas"
                  : "Pronta"}
          </Text>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={18}
            color={theme.textMuted}
          />
        </View>
      </Pressable>

      {open && (
        <View style={styles.body}>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Text style={styles.label}>IA</Text>
              <Text style={styles.value}>
                {tempAlvoIA === null
                  ? "—"
                  : tempAlvoIA === 0
                    ? "Off"
                    : `${tempAlvoIA}°C`}
              </Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.label}>Regra</Text>
              <Text style={[styles.value, styles.valueMuted]}>
                {ruleTempAlvo === null
                  ? "—"
                  : ruleTempAlvo === 0
                    ? "Off"
                    : `${ruleTempAlvo}°C`}
              </Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.label}>Δ</Text>
              <Text style={styles.value}>
                {diff === null
                  ? "—"
                  : diff === 0
                    ? "0"
                    : `${diff > 0 ? "+" : ""}${diff}°C`}
              </Text>
            </View>
          </View>

          <View style={styles.meta}>
            <Text style={styles.metaText}>
              Versão: {diagnostics?.modelVersion ?? "—"}
            </Text>
            <Text style={styles.metaText}>
              Atualizado: {formatTime(lastUpdate)}
            </Text>
            <Text style={styles.metaText}>
              Latência:{" "}
              {diagnostics?.inferenceTimeMs != null
                ? `${diagnostics.inferenceTimeMs.toFixed(1)} ms`
                : "—"}
            </Text>
            {isRecalculating && (
              <Text style={[styles.metaText, styles.recalc]}>
                Recalculando após mudança...
              </Text>
            )}
          </View>

          {live && (
            <View style={styles.pillsRow}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>{live.pessoas} pessoas</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillText}>{live.tempInt}°C int</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillText}>{live.tempExt}°C ext</Text>
              </View>
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={14} color="#f97316" />
              <Text style={styles.errorText} numberOfLines={2}>
                {error}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: "hidden",
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: spacing.md,
    },
    pressed: { opacity: 0.8 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    title: { ...typography.bodyStrong, color: AI_CARD_COLOR },
    statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    status: { ...typography.caption, color: theme.textMuted },
    body: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      gap: spacing.md,
    },
    row: { flexDirection: "row", gap: spacing.md },
    cell: { flex: 1 },
    label: {
      ...typography.caption,
      color: theme.textMuted,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    value: { fontSize: 20, fontWeight: "700", color: theme.text },
    valueMuted: { color: theme.textMuted },
    meta: { gap: 4 },
    metaText: { ...typography.caption, color: theme.textMuted },
    recalc: { color: AI_CARD_COLOR },
    pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
    pill: {
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
      borderRadius: 12,
      backgroundColor: `${AI_CARD_COLOR}1a`,
    },
    pillText: { ...typography.caption, color: AI_CARD_COLOR, fontWeight: "600" },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      backgroundColor: "#f9731620",
      padding: spacing.sm,
      borderRadius: radius.sm,
    },
    errorText: { ...typography.caption, color: "#f97316", flex: 1 },
  });

export const AIInsightsCard = memo(AIInsightsCardComponent);
