import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { Login } from "./components/Login";
import { MetricCard } from "./components/MetricCard";
import { SectionTitle } from "./components/SectionTitle";
import { RulesTable } from "./components/RulesTable";
import { SystemStatus } from "./components/SystemStatus";
import { ControlPanel } from "./components/ControlPanel";
import { EventLog } from "./components/EventLog";
import { PeriodSelector } from "./components/PeriodSelector";
import {
  PeopleIcon,
  SnowflakeIcon,
  ThermometerIcon,
  TargetIcon,
  DropIcon,
  PowerIcon,
} from "./components/icons";
import { useSensorData } from "./hooks/useSensorData";
import { useAuth } from "./hooks/useAuth";
import {
  CARD_COLORS,
  CARD_COLORS_EFFICIENCY,
  OCCUPANCY_THRESHOLDS,
  HUMIDITY_THRESHOLDS,
  PERIOD_OPTIONS,
  computeAcUsage,
} from "./constants";
import { downloadSensorPdf } from "./utils/pdfExport";

const ChartTemperature = lazy(() =>
  import("./components/charts/ChartTemperature").then((m) => ({
    default: m.ChartTemperature,
  }))
);
const ChartOccupancy = lazy(() =>
  import("./components/charts/ChartOccupancy").then((m) => ({
    default: m.ChartOccupancy,
  }))
);
const ChartHumidity = lazy(() =>
  import("./components/charts/ChartHumidity").then((m) => ({
    default: m.ChartHumidity,
  }))
);
const ChartAcUsage = lazy(() =>
  import("./components/charts/ChartAcUsage").then((m) => ({
    default: m.ChartAcUsage,
  }))
);

function ChartFallback() {
  return <div className="skeleton" aria-busy="true" />;
}

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
  if (Math.abs(diff) < 1.5) return "Temperatura estabilizada";
  return diff > 0 ? "Resfriando..." : "Aquecendo...";
}

export default function App() {
  const {
    user,
    loading: authLoading,
    signIn,
    signOut,
  } = useAuth();
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
  const [periodId, setPeriodId] = useState("8h");

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

  const handleExport = useCallback(() => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const period = PERIOD_OPTIONS.find((p) => p.id === periodId);
    downloadSensorPdf({
      filename: `log_${dd}-${mm}-${yyyy}.pdf`,
      rows: filteredHistory,
      periodLabel: period?.label ?? periodId,
    });
  }, [filteredHistory, periodId]);

  if (authLoading) {
    return (
      <div className="dashboard" aria-busy="true">
        <div className="loading-state">Verificando sessão...</div>
      </div>
    );
  }

  if (!user) {
    return <Login onSignIn={signIn} />;
  }

  if (error) {
    return (
      <div className="dashboard">
        <Header
          acOn={false}
          manualMode={false}
          connectionStatus={connectionStatus}
          user={user}
          onSignOut={signOut}
        />
        <div className="error-state" role="alert">
          Erro ao carregar dados: {error.message}
        </div>
      </div>
    );
  }

  if (loading || !live) {
    return (
      <div className="dashboard">
        <Header
          acOn={false}
          manualMode={false}
          connectionStatus={connectionStatus}
          user={user}
          onSignOut={signOut}
        />
        <div className="metric-grid" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="dashboard" id="main">
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      <Header
        acOn={acOn}
        manualMode={manualMode}
        connectionStatus={connectionStatus}
        onExport={handleExport}
        user={user}
        onSignOut={signOut}
      />

      <section className="metric-grid" aria-label="Métricas atuais">
        <MetricCard
          icon={PeopleIcon}
          label="Ocupação"
          value={live.pessoas}
          unit="pessoas"
          sub={describeOccupancy(live.pessoas)}
          color={CARD_COLORS.pessoas}
        />
        <MetricCard
          icon={SnowflakeIcon}
          label="Temp. interna"
          value={live.tempInt}
          unit="°C"
          sub={describeTempStatus(live)}
          color={CARD_COLORS.tempInt}
        />
        <MetricCard
          icon={ThermometerIcon}
          label="Temp. externa"
          value={live.tempExt}
          unit="°C"
          sub={describeExternalTemp(live.tempExt)}
          color={CARD_COLORS.tempExt}
        />
        <MetricCard
          icon={TargetIcon}
          label="Temp. alvo"
          value={live.tempAlvo > 0 ? live.tempAlvo : "—"}
          unit={live.tempAlvo > 0 ? "°C" : ""}
          sub={live.tempAlvo > 0 ? "Controle automático" : "Sem alvo"}
          color={CARD_COLORS.tempAlvo}
        />
        <MetricCard
          icon={DropIcon}
          label="Umidade int."
          value={live.umidInt}
          unit="%"
          sub={describeHumidity(live.umidInt)}
          color={CARD_COLORS.umidInt}
        />
        <MetricCard
          icon={PowerIcon}
          label="Uso do A/C"
          value={Math.round(acUsage.percent)}
          unit="%"
          sub={
            acUsage.totalHours > 0
              ? `${acUsage.hoursOn.toFixed(1)} h ligado em ${acUsage.totalHours.toFixed(1)} h`
              : "Coletando dados..."
          }
          color={CARD_COLORS_EFFICIENCY}
        />
      </section>

      <SectionTitle
        action={<PeriodSelector value={periodId} onChange={setPeriodId} />}
      >
        Temperatura ao longo do dia
      </SectionTitle>
      <div className="panel panel--chart">
        <Suspense fallback={<ChartFallback />}>
          <ChartTemperature data={filteredHistory} />
        </Suspense>
      </div>

      <SectionTitle>Ocupação da sala</SectionTitle>
      <div className="panel panel--chart">
        <Suspense fallback={<ChartFallback />}>
          <ChartOccupancy data={filteredHistory} />
        </Suspense>
      </div>

      <SectionTitle>Umidade relativa</SectionTitle>
      <div className="panel panel--chart">
        <Suspense fallback={<ChartFallback />}>
          <ChartHumidity data={filteredHistory} />
        </Suspense>
      </div>

      <SectionTitle>Uso do A/C ao longo do tempo</SectionTitle>
      <div className="panel panel--chart">
        <Suspense fallback={<ChartFallback />}>
          <ChartAcUsage data={filteredHistory} />
        </Suspense>
      </div>

      <SectionTitle>Controle manual do A/C</SectionTitle>
      <div className="panel panel--padded">
        <ControlPanel
          acOn={acOn}
          targetTemp={live.tempAlvo}
          manualTarget={manualTarget}
          manualMode={manualMode}
          onSetAcOn={setAcOn}
          onSetTargetTemp={setTargetTemp}
          onSetManualMode={setManualMode}
        />
      </div>

      <SectionTitle>Regras de climatização</SectionTitle>
      <div className="panel panel--padded">
        <RulesTable />
      </div>

      <SectionTitle>Status do sistema</SectionTitle>
      <SystemStatus
        live={live}
        acOn={acOn}
        connectionStatus={connectionStatus}
      />

      <SectionTitle>Eventos recentes</SectionTitle>
      <div className="panel panel--padded">
        <EventLog />
      </div>

      <footer className="footer">
        Sistema de climatização autônoma — Projeto de faculdade — ESP32 +
        Firebase + React
      </footer>
    </main>
  );
}
