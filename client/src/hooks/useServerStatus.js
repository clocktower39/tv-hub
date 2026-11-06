import { useEffect, useState } from "react";
import { useServer } from "../context/ServerContext";

const POLL_MS = 10_000;

// "online" with the CEC state ("ready" | "starting" | "disabled"), or
// "offline" when the server cannot be reached. null until the first answer.
export function useServerStatus() {
  const { apiBase } = useServer();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const response = await fetch(`${apiBase}/api/status`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error(String(response.status));
        const body = await response.json();
        if (!cancelled) setStatus({ online: true, cec: body.cec });
      } catch {
        if (!cancelled) setStatus({ online: false, cec: null });
      }
    };
    check();
    const id = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [apiBase]);

  return status;
}
