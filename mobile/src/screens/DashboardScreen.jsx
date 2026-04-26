import { useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../components/Header";
import { MetricCard } from "../components/MetricCard";
import { SectionTitle } from "../components/SectionTitle";
import { Panel } from "../components/Panel";
import { PeriodSelector } from "../components/PeriodSelector";
import { ControlPanel } from "../components/ControlPanel";
import { SystemStatus } from "../components/SystemStatus";
import { RulesTable } from "../components/RulesTable";
import { EventLog } from "../components/EventLog";
import { TemperatureChart } from "../components/charts/TemperatureChart";
import { OccupancyChart } from "../components/charts/OccupancyChart";
import { HumidityChart } from "../components/charts/HumidityChart";
import { AcUsageChart } from "../components/charts/AcUsageChart";
import { useSensorData } from "../hooks/useSensorData";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../hooks/useNotifications";
import { useTheme } from "../contexts/ThemeContext";
import {
  CARD_COLORS,
  CARD_COLORS_EFFICIENCY,
  HUMIDITY_THRESHOLDS,
  OCCUPANCY_THRESHOLDS,
  PERIOD_OPTIONS,
  computeAcUsage,
} from "../constants";
import { spacing, typography } from "../utils/theme";

function describeOccupancy(p) {
  if (p > OCCUPANCY_THRESHOLDS.high) return "Lotação alta";
  if (p > OCCUPANCY_THRESHOLDS.medium) return "Meia lotação";
  if (p > 0) return "Baixa ocupação";
  return "Sala vazia";
}
function describeHumidity(h) {
  if (h > HUMIDITY_THRESHOLDS.high) return "Alta";
  if (h > HUMIDITY_THRESHOLDS.comfortable) return "Confortável";
  return "Baixa";
}
function describeExternalTemp(t) {
  if (t > 32) return "Muito quente";
  if (t > 26) return "Quente";
  return "Agradável";
}
function describeTempStatus(live) {
  if (!live || live.tempAlvo === 0) return "A/C desligado";
  const diff = live.tempInt - live.tempAlvo;
  if (Math.abs(diff) < 1.5) return "Estabilizada";
  return diff > 0 ? "Resfriando..." : "Aquecendo...";
}

export function DashboardScreen() {
  const { theme, mode, setMode, resolvedMode } = useTheme();
  const { user, signOut } = useAuth();
  const {
    history,
    live,
    acOn,
    manualMode,
    manualTarget,
    loading,
    error,
    connectionStatus,
    setAcOn,
    setTargetTemp,
    setManualMode,
  } = useSensorData();

  useNotifications({ live, acOn });

  const [periodId, setPeriodId] = useState("8h");
  const [refreshing, setRefreshing] = useState(false);

  const acUsage = useMemo(() => computeAcUsage(history), [history]);

  const filteredHistory = useMemo(() => {
    const period = PERIOD_OPTIONS.find((p) => p.id === periodId);
    if (!period) return history;
    const latestTs = history[history.length - 1]?.timestamp;
    if (typeof latestTs !== "number") return history;
    const cutoff = latestTs - period.hours * 60 * 60 * 1000;
    return history.filter(
      (s) => typeof s.timestamp === "number" && s.timestamp >= cutoff
    );
  }, [history, periodId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const toggleTheme = useCallback(() => {
    const next =
      mode === "auto"
        ? resolvedMode === "dark"
          ? "light"
          : "dark"
        : mode === "dark"
          ? "light"
          : "dark";
    setMode(next);
  }, [mode, resolvedMode, setMode]);

  const styles = makeStyles(theme);

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Header
          acOn={false}
          manualMode={false}
          connectionStatus={connectionStatus}
          user={user}
          onSignOut={signOut}
          onToggleTheme={toggleTheme}
        />
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Erro ao carregar dados</Text>
          <Text style={styles.errorMsg}>{error.message}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || !live) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Header
          acOn={false}
          manualMode={false}
          connectionStatus={connectionStatus}
          user={user}
          onSignOut={signOut}
          onToggleTheme={toggleTheme}
        />
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Sincronizando sensores...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header
        acOn={acOn}
        manualMode={manualMode}
        connectionStatus={connectionStatus}
        user={user}
        onSignOut={signOut}
        onToggleTheme={toggleTheme}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metricGrid}>
          <MetricCard
            icon="people"
            label="Ocupação"
            value={live.pessoas}
            unit="pessoas"
            sub={describeOccupancy(live.pessoas)}
            color={CARD_COLORS.pessoas}
          />
          <MetricCard
            icon="snow"
            label="Temp. interna"
            value={live.tempInt}
            unit="°C"
            sub={describeTempStatus(live)}
            color={CARD_COLORS.tempInt}
          />
          <MetricCard
            icon="thermometer"
            label="Temp. externa"
            value={live.tempExt}
            unit="°C"
            sub={describeExternalTemp(live.tempExt)}
            color={CARD_COLORS.tempExt}
          />
          <MetricCard
            icon="locate"
            label="Temp. alvo"
            value={live.tempAlvo > 0 ? live.tempAlvo : "—"}
            unit={live.tempAlvo > 0 ? "°C" : ""}
            sub={live.tempAlvo > 0 ? "Controle ativo" : "Sem alvo"}
            color={CARD_COLORS.tempAlvo}
          />
          <MetricCard
            icon="water"
            label="Umid. interna"
            value={live.umidInt}
            unit="%"
            sub={describeHumidity(live.umidInt)}
            color={CARD_COLORS.umidInt}
          />
          <MetricCard
            icon="flash"
            label="Uso A/C"
            value={Math.round(acUsage.percent)}
            unit="%"
            sub={
              acUsage.totalHours > 0
                ? `${acUsage.hoursOn.toFixed(1)}h em ${acUsage.totalHours.toFixed(1)}h`
                : "Coletando..."
            }
            color={CARD_COLORS_EFFICIENCY}
          />
        </View>

        <SectionTitle
          action={<PeriodSelector value={periodId} onChange={setPeriodId} />}
        >
          Temperatura
        </SectionTitle>
        <Panel>
          <TemperatureChart data={filteredHistory} />
        </Panel>

        <SectionTitle>Ocupação da sala</SectionTitle>
        <Panel>
          <OccupancyChart data={filteredHistory} />
        </Panel>

        <SectionTitle>Umidade relativa</SectionTitle>
        <Panel>
          <HumidityChart data={filteredHistory} />
        </Panel>

        <SectionTitle>Uso do A/C ao longo do tempo</SectionTitle>
        <Panel>
          <AcUsageChart data={filteredHistory} />
        </Panel>

        <SectionTitle>Controle manual</SectionTitle>
        <Panel>
          <ControlPanel
            acOn={acOn}
            manualTarget={manualTarget}
            manualMode={manualMode}
            onSetAcOn={setAcOn}
            onSetTargetTemp={setTargetTemp}
            onSetManualMode={setManualMode}
          />
        </Panel>

        <SectionTitle>Regras de climatização</SectionTitle>
        <Panel padded={false}>
          <RulesTable />
        </Panel>

        <SectionTitle>Status do sistema</SectionTitle>
        <SystemStatus
          live={live}
          acOn={acOn}
          connectionStatus={connectionStatus}
        />

        <SectionTitle>Eventos recentes</SectionTitle>
        <Panel>
          <EventLog />
        </Panel>

        <Text style={styles.footer}>
          Sistema de climatização autônoma — ESP32 + Firebase + Expo
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    scroll: { paddingBottom: spacing.xxl },
    metricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      marginTop: spacing.md,
    },
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
    },
    loadingText: { ...typography.body, color: theme.textMuted },
    errorBox: {
      margin: spacing.lg,
      padding: spacing.lg,
      borderRadius: 12,
      backgroundColor: theme.dangerSoft,
    },
    errorTitle: { ...typography.bodyStrong, color: theme.danger },
    errorMsg: { ...typography.body, color: theme.text, marginTop: spacing.xs },
    footer: {
      ...typography.caption,
      color: theme.textDim,
      textAlign: "center",
      paddingHorizontal: spacing.lg,
      marginTop: spacing.xxl,
    },
  });
