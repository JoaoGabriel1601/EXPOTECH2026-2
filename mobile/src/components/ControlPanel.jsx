import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { MIN_TARGET_TEMP } from "../constants";
import { useTheme } from "../contexts/ThemeContext";
import { radius, spacing, typography } from "../utils/theme";

const MAX_TARGET_TEMP = 28;

export function ControlPanel({
  acOn,
  manualTarget,
  manualMode,
  onSetAcOn,
  onSetTargetTemp,
  onSetManualMode,
}) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [localTemp, setLocalTemp] = useState(manualTarget || 22);
  const [prevManualTarget, setPrevManualTarget] = useState(manualTarget);

  if (manualTarget !== prevManualTarget) {
    setPrevManualTarget(manualTarget);
    if (manualTarget) setLocalTemp(manualTarget);
  }

  const announce = useCallback((message, ok = true) => {
    setFeedback({ message, ok });
    setTimeout(() => setFeedback(null), 2500);
  }, []);

  const handleTogglePower = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setBusy(true);
    const result = await onSetAcOn(!acOn);
    setBusy(false);
    if (result.ok) announce(acOn ? "A/C desligado" : "A/C ligado");
    else announce("Falha ao enviar comando", false);
  }, [acOn, announce, onSetAcOn]);

  const handleToggleManual = useCallback(
    async (next) => {
      Haptics.selectionAsync().catch(() => {});
      setBusy(true);
      const result = await onSetManualMode(next);
      setBusy(false);
      if (result.ok)
        announce(next ? "Modo manual ativado" : "Modo automático ativado");
      else announce("Falha ao enviar comando", false);
    },
    [announce, onSetManualMode]
  );

  const handleCommitTemp = useCallback(
    async (next) => {
      const t = Math.round(next);
      Haptics.selectionAsync().catch(() => {});
      setBusy(true);
      const result = await onSetTargetTemp(t);
      setBusy(false);
      if (result.ok) announce(`Alvo ajustado para ${t}°C`);
      else announce("Falha ao enviar comando", false);
    },
    [announce, onSetTargetTemp]
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>Energia</Text>
          <Text style={styles.rowSub}>
            {acOn ? "Sistema ativo" : "Sistema em standby"}
          </Text>
        </View>
        <Pressable
          onPress={handleTogglePower}
          disabled={busy}
          style={[
            styles.powerBtn,
            { backgroundColor: acOn ? theme.dangerSoft : theme.successSoft },
          ]}
        >
          <Ionicons
            name="power"
            size={18}
            color={acOn ? theme.danger : theme.success}
          />
          <Text
            style={[
              styles.powerText,
              { color: acOn ? theme.danger : theme.success },
            ]}
          >
            {acOn ? "Desligar" : "Ligar"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>Modo manual</Text>
          <Text style={styles.rowSub}>
            {manualMode ? "Você está no controle" : "Climatização automática"}
          </Text>
        </View>
        <Switch
          value={manualMode}
          onValueChange={handleToggleManual}
          disabled={busy}
          trackColor={{ false: theme.surfaceMuted, true: theme.accent }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.divider} />

      <View>
        <View style={styles.tempHeader}>
          <Text style={styles.rowLabel}>Temperatura alvo</Text>
          <Text style={styles.tempValue}>{localTemp}°C</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={MIN_TARGET_TEMP}
          maximumValue={MAX_TARGET_TEMP}
          step={1}
          value={localTemp}
          onValueChange={(v) => setLocalTemp(Math.round(v))}
          onSlidingComplete={handleCommitTemp}
          minimumTrackTintColor={theme.accent}
          maximumTrackTintColor={theme.surfaceMuted}
          thumbTintColor={theme.accent}
          disabled={busy}
        />
        <View style={styles.tempScale}>
          <Text style={styles.tempScaleText}>{MIN_TARGET_TEMP}°</Text>
          <Text style={styles.tempScaleText}>{MAX_TARGET_TEMP}°</Text>
        </View>
        {!manualMode && (
          <Text style={styles.helper}>
            Ajustar o alvo ativa o controle manual.
          </Text>
        )}
        {feedback && (
          <Text
            style={[
              styles.helper,
              { color: feedback.ok ? theme.success : theme.danger },
            ]}
          >
            {feedback.message}
          </Text>
        )}
      </View>
    </View>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    container: { gap: spacing.sm },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    rowText: { flex: 1 },
    rowLabel: { ...typography.bodyStrong, color: theme.text },
    rowSub: { ...typography.caption, color: theme.textMuted, marginTop: 2 },
    powerBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderRadius: radius.md,
    },
    powerText: { fontWeight: "700", fontSize: 14 },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: spacing.sm,
    },
    tempHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
    },
    tempValue: { fontSize: 28, fontWeight: "700", color: theme.accent },
    slider: { width: "100%", height: 40 },
    tempScale: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: -spacing.xs,
    },
    tempScaleText: { ...typography.caption, color: theme.textDim },
    helper: { ...typography.caption, color: theme.textMuted, marginTop: spacing.sm },
  });
