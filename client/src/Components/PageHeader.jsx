import React from "react";
import { useServerStatus } from "../hooks/useServerStatus";
import "./PageHeader.css";

const STATUS = {
  ready: { label: "TV connected", tone: "ok" },
  starting: { label: "Connecting to TV…", tone: "warn" },
  disabled: { label: "Test mode (CEC off)", tone: "warn" },
};

// App title on the left, server/TV status on the right. `title` defaults to
// the app name; pages can pass their own.
function PageHeader({ title = "TV Hub", children }) {
  const status = useServerStatus();
  let pill = { label: "Checking…", tone: "muted" };
  if (status && !status.online) pill = { label: "Server offline", tone: "bad" };
  else if (status) pill = STATUS[status.cec] ?? pill;

  return (
    <header className="tvh-header">
      <h1 className="tvh-header__title">{title}</h1>
      <div className="tvh-header__end">
        {children}
        <span className={`tvh-status tvh-status--${pill.tone}`} role="status">
          <span className="tvh-status__dot" aria-hidden="true" />
          {pill.label}
        </span>
      </div>
    </header>
  );
}

export default PageHeader;
