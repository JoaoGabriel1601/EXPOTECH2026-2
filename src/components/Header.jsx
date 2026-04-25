import { StatusPill } from "./StatusPill";
import { ThemeToggle } from "./ThemeToggle";
import { DownloadIcon } from "./icons";

export function Header({ acOn, manualMode, connectionStatus, onExport }) {
  return (
    <header className="header">
      <div>
        <h1 className="header__title">
          <span className="header__title-accent">clima</span>
          <span className="header__title-faded">control</span>
        </h1>
        <p className="header__subtitle">Sistema de climatização autônoma</p>
      </div>
      <div className="header__status">
        <StatusPill on={acOn} label={acOn ? "A/C ligado" : "A/C desligado"} />
        {manualMode && <StatusPill on label="Modo manual" />}
        <span
          className="live-pill"
          aria-label={`Status da conexão: ${connectionStatus}`}
        >
          <span className="live-pill__dot" aria-hidden="true" />
          {connectionStatus === "online" || connectionStatus === "mock"
            ? "Ao vivo"
            : connectionStatus === "connecting"
            ? "Conectando..."
            : "Offline"}
        </span>
        {onExport && (
          <button
            type="button"
            className="icon-button"
            onClick={onExport}
            aria-label="Exportar dados em CSV"
            title="Exportar CSV"
          >
            <DownloadIcon />
            CSV
          </button>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
