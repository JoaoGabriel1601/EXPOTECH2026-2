import { StatusPill } from "./StatusPill";
import { ThemeToggle } from "./ThemeToggle";
import { DownloadIcon, LogoutIcon } from "./icons";

export function Header({
  acOn,
  manualMode,
  connectionStatus,
  onExport,
  user,
  onSignOut,
}) {
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
