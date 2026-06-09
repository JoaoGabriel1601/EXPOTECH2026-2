import { StatusPill } from "./StatusPill";
import { ThemeToggle } from "./ThemeToggle";
import { DownloadIcon, LogoutIcon } from "./icons";
import { useMockData } from "../config/thingspeak";

export function Header({
  acOn,
  manualMode,
  connectionStatus,
  onExport,
  user,
  onSignOut,
}) {
  const isMock = useMockData || connectionStatus === "mock";
  const liveLabel = isMock
    ? "Modo simulação"
    : connectionStatus === "online"
      ? "Ao vivo"
      : connectionStatus === "connecting"
        ? "Conectando..."
        : "Offline";

  return (
    <header className="header">
      <div className="header__brand">
        <img
          className="header__logo"
          src="/logo.svg"
          alt="ClimaControl"
          width={72}
          height={72}
        />
        <div>
          <h1 className="header__title">
            <span className="header__title-accent">clima</span>
            <span className="header__title-faded">control</span>
          </h1>
          <p className="header__subtitle">
            {user?.email
              ? `Olá, ${user.displayName || user.email}`
              : "Sistema de climatização autônoma"}
          </p>
        </div>
      </div>
      <div className="header__status">
        <StatusPill on={acOn} label={acOn ? "A/C ligado" : "A/C desligado"} />
        {manualMode && <StatusPill on label="Modo manual" />}
        <span
          className={`live-pill${isMock ? " live-pill--mock" : ""}`}
          aria-label={`Status da conexão: ${liveLabel}`}
          title={
            isMock
              ? "Dados simulados — defina VITE_USE_MOCK_DATA=false para conectar ao ThingSpeak"
              : undefined
          }
        >
          <span className="live-pill__dot" aria-hidden="true" />
          {liveLabel}
        </span>
        {onExport && (
          <button
            type="button"
            className="icon-button"
            onClick={onExport}
            aria-label="Baixar log do sistema em PDF"
            title="Baixar PDF"
          >
            <DownloadIcon />
            PDF
          </button>
        )}
        <ThemeToggle />
        {onSignOut && (
          <button
            type="button"
            className="icon-button"
            onClick={onSignOut}
            aria-label="Sair da conta"
            title="Sair"
          >
            <LogoutIcon />
          </button>
        )}
      </div>
    </header>
  );
}
