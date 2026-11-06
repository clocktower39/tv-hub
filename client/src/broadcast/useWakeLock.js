import { useEffect } from "react";

export const supportsWakeLock =
  typeof navigator !== "undefined" && "wakeLock" in navigator;

// Keeps the screen on while `active`. The browser drops the lock whenever the
// page is hidden, so it is requested again when the page becomes visible.
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || !supportsWakeLock) return undefined;
    let lock = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible" || (lock && !lock.released)) {
        return;
      }
      try {
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) next.release().catch(() => {});
        else lock = next;
      } catch (error) {
        console.warn("Wake lock unavailable", error);
      }
    };

    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
    };
  }, [active]);
}
