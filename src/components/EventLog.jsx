import { memo } from "react";
import { useEventLog, EVENT_LABELS } from "../hooks/useEventLog";

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EventLogComponent() {
  const { events, loading } = useEventLog(20);

  if (loading) {
    return <div className="loading-state">Carregando eventos...</div>;
  }
  if (!events.length) {
    return <div className="empty-state">Nenhum evento registrado.</div>;
  }

  return (
    <ul className="event-list" aria-label="Log de eventos">
      {events.map((event) => (
        <li key={event.id} className="event-list__item">
          <span className="event-list__time">{formatTime(event.timestamp)}</span>
          <span className="event-list__type">
            {EVENT_LABELS[event.type] ?? event.type}
            {event.payload?.temp && ` — ${event.payload.temp}°C`}
            {event.payload?.pessoas && ` — ${event.payload.pessoas} pessoas`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export const EventLog = memo(EventLogComponent);
