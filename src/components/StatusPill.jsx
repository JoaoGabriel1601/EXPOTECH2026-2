import { memo } from "react";

function StatusPillComponent({ on, label }) {
  return (
    <span
      className={`status-pill ${on ? "status-pill--on" : "status-pill--off"}`}
      role="status"
    >
      <span className="status-pill__dot" aria-hidden="true" />
      {label}
    </span>
  );
}

export const StatusPill = memo(StatusPillComponent);
