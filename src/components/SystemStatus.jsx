import { memo } from "react";
import { SENSORS } from "../constants";

function dotClass(status) {
  switch (status) {
    case "online":
      return "sensor-card__dot sensor-card__dot--online";
    case "ativo":
      return "sensor-card__dot sensor-card__dot--ativo";
    case "standby":
      return "sensor-card__dot sensor-card__dot--standby";
    default:
      return "sensor-card__dot sensor-card__dot--offline";
  }
}

function SystemStatusComponent({ live, acOn, connectionStatus }) {
  const cloudOnline =
    connectionStatus === "online" || connectionStatus === "mock";
  return (
    <div className="system-grid">
      {SENSORS.map((sensor) => {
        let status = "online";
        let detail = sensor.detail;
        if (sensor.isAcLed) {
          status = acOn ? "ativo" : "standby";
          detail = acOn ? `Emitindo ${live?.tempAlvo ?? 0}°C` : "Aguardando";
        } else if (sensor.id === "thingspeak") {
          status = cloudOnline ? "online" : "offline";
          detail = cloudOnline
            ? connectionStatus === "mock"
              ? "Modo simulação"
              : "Sincronizado"
            : "Sem conexão";
        } else if (sensor.dynamicDetail && live) {
          detail = sensor.dynamicDetail(live);
        }
        return (
          <div key={sensor.id} className="sensor-card">
            <div>
              <div className="sensor-card__label">{sensor.label}</div>
              <div className="sensor-card__detail">{detail}</div>
            </div>
            <span
              className={dotClass(status)}
              role="status"
              aria-label={`${sensor.label}: ${status}`}
            />
          </div>
        );
      })}
    </div>
  );
}

export const SystemStatus = memo(SystemStatusComponent);
