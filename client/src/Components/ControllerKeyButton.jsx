import React, { useCallback, useEffect, useRef, useState } from "react";
import { useServer } from "../context/ServerContext";
import { sendKey } from "./remote/sendKey";
import { useKeyFeedback } from "./remote/keyFeedback";

const HOLD_DELAY_MS = 400;
const REPEAT_EVERY_MS = 150;
const ERROR_FLASH_MS = 700;

// One remote key. Sends `keyName` (a CEC key name) to the server on press.
// With `repeat`, holding the key keeps sending it, like a volume or arrow key
// on a real remote; a quick tap still sends exactly one key.
const ControllerKeyButton = ({
  keyName,
  label,
  icon,
  repeat = false,
  className = "",
  children,
}) => {
  const { apiBase } = useServer();
  const report = useKeyFeedback();
  const [pressed, setPressed] = useState(false);
  const [failed, setFailed] = useState(false);
  const holdTimer = useRef(null);
  const repeatTimer = useRef(null);
  const flashTimer = useRef(null);
  const inFlight = useRef(false);

  const stopRepeat = useCallback(() => {
    clearTimeout(holdTimer.current);
    clearInterval(repeatTimer.current);
    holdTimer.current = null;
    repeatTimer.current = null;
  }, []);

  useEffect(
    () => () => {
      stopRepeat();
      clearTimeout(flashTimer.current);
    },
    [stopRepeat]
  );

  const press = async () => {
    navigator.vibrate?.(10);
    inFlight.current = true;
    const result = await sendKey(apiBase, keyName);
    inFlight.current = false;
    if (result.ok) return;

    stopRepeat();
    setFailed(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFailed(false), ERROR_FLASH_MS);
    report(result.message);
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    setPressed(true);
    if (!repeat) return;
    press();
    stopRepeat();
    holdTimer.current = setTimeout(() => {
      repeatTimer.current = setInterval(() => {
        // Skip a tick rather than queue presses behind a slow TV.
        if (!inFlight.current) press();
      }, REPEAT_EVERY_MS);
    }, HOLD_DELAY_MS);
  };

  const release = () => {
    setPressed(false);
    stopRepeat();
  };

  const handleClick = (event) => {
    // Repeating keys already fired on pointer down. A click with detail 0
    // comes from the keyboard (Enter or Space), so it still sends.
    if (repeat && event.detail !== 0) return;
    press();
  };

  return (
    <button
      type="button"
      className={`rkey ${className}`}
      aria-label={label}
      title={label}
      data-pressed={pressed || undefined}
      data-failed={failed || undefined}
      onPointerDown={handlePointerDown}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onClick={handleClick}
      onContextMenu={(event) => event.preventDefault()}
    >
      {icon}
      {children}
    </button>
  );
};

export default ControllerKeyButton;
