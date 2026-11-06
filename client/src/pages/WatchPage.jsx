import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  IconButton,
  ListSubheader,
  Menu,
  MenuItem,
  Slider,
  Snackbar,
  Tooltip,
} from "@mui/material";
import {
  ArrowBackRounded,
  CheckRounded,
  Forward10Rounded,
  FullscreenRounded,
  FullscreenExitRounded,
  LinkedCameraRounded,
  PauseRounded,
  PlayArrowRounded,
  PlayCircleOutlineRounded,
  Replay10Rounded,
  SaveAltRounded,
  SettingsRounded,
  StopCircleOutlined,
  TimerRounded,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import { useServer } from "../context/ServerContext";
import { ROOM_ID, ICE_SERVERS } from "../webrtc";
import { useReplayPlayer } from "../replay/useReplayPlayer";

const CONTROLS_HIDE_MS = 3000;
const DELAY_OPTIONS = [0, 5, 10, 15, 30, 60, 120];
const BUFFER_OPTIONS = [3, 5, 10];
const SAVE_OPTIONS = [30, 60, 120];

// Short labels for the status pill; the centered message uses STATUS_LABELS.
const PILL_LABELS = {
  idle: "Stopped",
  connecting: "Connecting",
  "waiting for broadcast": "Waiting",
  reconnecting: "Reconnecting",
  watching: "● LIVE",
  "connection failed": "Failed",
};

const STATUS_LABELS = {
  idle: "Stopped",
  connecting: "Connecting…",
  "waiting for broadcast": "Waiting for the phone to start broadcasting",
  reconnecting: "Reconnecting…",
  watching: "Live",
  "connection failed": "Connection failed",
};

function formatTime(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

function formatDelay(seconds) {
  if (seconds === 0) return "Off";
  return seconds < 60 ? `${seconds}s` : `${seconds / 60} min`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function clipFilename() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `replay-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.webm`;
}

// What the TV shows: the phone's broadcast, or an MJPEG IP camera set in
// Settings. Remembered per device.
function readSource() {
  try {
    return localStorage.getItem("watch.source") === "camera" ? "camera" : "phone";
  } catch {
    return "phone";
  }
}

function WatchPage() {
  const { socketURL, cameraURL } = useServer();
  const [sourceSetting, setSourceSetting] = useState(readSource);
  const [cameraState, setCameraState] = useState("loading"); // loaded | error
  const [status, setStatus] = useState("idle");
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [menu, setMenu] = useState(null); // { type, anchor }
  const [scrubValue, setScrubValue] = useState(null);
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  // The phone is showing its Review screen here instead of the camera.
  const [phoneReview, setPhoneReview] = useState(false);
  const rootRef = useRef(null);
  const liveVideoRef = useRef(null);
  const replayVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const broadcasterIdRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const hideTimerRef = useRef(null);

  const isLive = status === "watching";
  const replay = useReplayPlayer(replayVideoRef, { connected: isLive });
  const { startSession, endSession } = replay;

  // Each offer is a fresh session (the phone may have restarted), so the old
  // peer connection is discarded rather than renegotiated. The replay buffer
  // is kept so the last recording can still be reviewed and saved.
  const closePeer = () => {
    peerRef.current?.close();
    peerRef.current = null;
    broadcasterIdRef.current = null;
    pendingCandidatesRef.current = [];
    if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
  };

  const teardown = () => {
    closePeer();
    socketRef.current?.disconnect();
    socketRef.current = null;
  };

  const startWatching = () => {
    teardown();
    setStatus("connecting");

    const socket = io(socketURL, { transports: ["websocket"] });
    socketRef.current = socket;

    // The server tells the broadcaster about us whether it is already live or
    // starts later, so after joining we just wait for an offer.
    socket.on("connect", () => {
      socket.emit("webrtc:join", { roomId: ROOM_ID, role: "watcher" });
      setStatus("waiting for broadcast");
    });
    socket.on("disconnect", () => {
      closePeer();
      setPhoneReview(false);
      setStatus("reconnecting");
    });

    socket.on("webrtc:broadcaster-left", () => {
      closePeer();
      setPhoneReview(false);
      setStatus("waiting for broadcast");
    });

    socket.on("webrtc:review", ({ active }) => setPhoneReview(Boolean(active)));

    socket.on("webrtc:offer", async ({ sdp, fromId }) => {
      closePeer();
      const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerRef.current = peer;
      broadcasterIdRef.current = fromId;

      peer.ontrack = ({ streams }) => {
        const [stream] = streams;
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
          liveVideoRef.current.play().catch(() => {});
        }
        startSession(stream);
      };
      peer.onicecandidate = ({ candidate }) => {
        if (candidate) {
          socket.emit("webrtc:ice", { targetId: fromId, candidate });
        }
      };
      peer.onconnectionstatechange = () => {
        if (peerRef.current !== peer) return;
        if (peer.connectionState === "connected") setStatus("watching");
        if (peer.connectionState === "failed") setStatus("connection failed");
      };

      try {
        await peer.setRemoteDescription(sdp);
        for (const candidate of pendingCandidatesRef.current) {
          await peer.addIceCandidate(candidate);
        }
        pendingCandidatesRef.current = [];
        await peer.setLocalDescription(await peer.createAnswer());
        socket.emit("webrtc:answer", {
          targetId: fromId,
          sdp: peer.localDescription,
        });
      } catch (error) {
        console.error("Failed to answer offer", error);
        if (peerRef.current === peer) setStatus("connection failed");
      }
    });

    socket.on("webrtc:ice", async ({ candidate, fromId }) => {
      const peer = peerRef.current;
      if (!peer || !candidate || fromId !== broadcasterIdRef.current) return;
      if (!peer.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await peer.addIceCandidate(candidate);
      } catch (error) {
        console.error("Failed to add ICE candidate", error);
      }
    });
  };

  const stopWatching = () => {
    teardown();
    setPhoneReview(false);
    endSession();
    setStatus("idle");
  };

  // Start on load so a TV in kiosk mode needs no click. teardown and
  // startWatching only touch refs, state setters and stable callbacks, so the
  // mount-time copies are safe.
  useEffect(() => {
    startWatching();
    return teardown;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketURL]);

  // Controls fade out after a few idle seconds and come back on any activity.
  const revealControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(
      () => setControlsVisible(false),
      CONTROLS_HIDE_MS
    );
  }, []);

  useEffect(() => {
    revealControls();
    return () => clearTimeout(hideTimerRef.current);
  }, [revealControls]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      rootRef.current?.requestFullscreen().catch(() => {});
    }
  }, []);

  const { togglePlay, seekBy, goLive, setRecordingPaused } = replay;
  const isCamera = sourceSetting === "camera" && Boolean(cameraURL);
  // Replay only covers the phone's broadcast, and is set aside while the
  // phone's Review screen is showing (the phone controls that).
  const showingReview = phoneReview && !isCamera;
  const hasReplay =
    Boolean(replay.recorder && replay.tick) && !isCamera && !showingReview;

  // Keep the review out of the replay buffer.
  useEffect(() => {
    setRecordingPaused(phoneReview);
  }, [phoneReview, setRecordingPaused]);

  const chooseSource = (next) => {
    setMenu(null);
    setSourceSetting(next);
    setCameraState("loading");
    try {
      localStorage.setItem("watch.source", next);
    } catch {
      // The choice just will not persist.
    }
  };

  useEffect(() => {
    const onFullscreenChange = () =>
      setIsFullscreen(Boolean(document.fullscreenElement));
    const onKeyDown = (event) => {
      revealControls();
      // Menus handle their own keys, the slider its arrow keys, and a
      // focused button already handles Space.
      if (event.target.closest?.('[role="menu"]')) return;
      const key = event.key.toLowerCase();
      const onSlider = event.target.closest?.(".MuiSlider-root");
      if (onSlider && key.startsWith("arrow")) return;
      const onButton = event.target.closest?.("button, a");

      if (key === "f") toggleFullscreen();
      if (!hasReplay) return;
      if ((key === " " && !onButton) || key === "k") {
        event.preventDefault();
        togglePlay();
      } else if (key === "arrowleft" || key === "j") {
        seekBy(-10);
      } else if (key === "arrowright") {
        seekBy(10);
      } else if (key === "l") {
        goLive();
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [revealControls, toggleFullscreen, hasReplay, togglePlay, seekBy, goLive]);

  const openMenu = (type) => (event) =>
    setMenu({ type, anchor: event.currentTarget });
  const closeMenu = () => setMenu(null);
  // Menus render inside the player so they still show in fullscreen.
  const menuContainer = () => rootRef.current;

  const saveClip = async (seconds) => {
    closeMenu();
    setSaving(true);
    try {
      const clip = await replay.save(seconds);
      if (!clip) {
        setNotice("Nothing recorded yet");
        return;
      }
      downloadBlob(clip.blob, clipFilename());
      setNotice(`Saved ${formatTime(clip.seconds)} clip`);
    } catch (error) {
      console.error("Failed to save clip", error);
      setNotice("Could not save the clip");
    } finally {
      setSaving(false);
    }
  };

  const { mode, tick, delaySetting, delayActive, bufferMinutes } = replay;
  const isReplay = mode === "replay";
  const behind = tick ? tick.end - tick.current : 0;
  const buffered = tick ? tick.end - tick.start : 0;
  const delayBuilding =
    isReplay && delayActive && tick && buffered < delaySetting;
  const paused = isReplay && tick?.paused && !delayBuilding && !tick?.stalled;

  let pill;
  if (showingReview) pill = "REVIEW · from phone";
  else if (isCamera) pill = cameraState === "loaded" ? "● IP CAMERA" : "IP camera";
  else if (isReplay && delayActive) pill = `DELAY ${formatDelay(delaySetting)}`;
  else if (isReplay) pill = `REPLAY −${formatTime(behind)}`;
  else pill = PILL_LABELS[status] ?? status;

  let message = null;
  if (isCamera) {
    if (cameraState === "error") {
      message = "Can't load the IP camera. Check its URL in Settings.";
    } else if (cameraState === "loading") {
      message = "Connecting to the IP camera…";
    }
  } else if (showingReview) {
    message = isLive ? null : STATUS_LABELS[status] ?? status;
  } else if (isReplay && delayActive && tick?.stalled === "no-video") {
    message = "No new video from the phone — waiting…";
  } else if (isReplay && delayActive && tick?.stalled === "rebuilding") {
    message = "Rebuilding the delay…";
  } else if (delayBuilding) {
    message = `Delay starts in ${Math.ceil(delaySetting - buffered)}s`;
  } else if (isReplay && !tick) {
    message = "Waiting for video…";
  } else if (!isReplay && !isLive) {
    message = STATUS_LABELS[status] ?? status;
  }

  const sourceReady = isCamera ? cameraState === "loaded" : isLive;
  const showControls =
    controlsVisible || Boolean(menu) || (!isCamera && paused) || !sourceReady;
  // In live mode the pill fades with the controls; any other state stays
  // on screen so nobody mistakes a replay for live.
  const pillVisible = showControls || (isReplay && !isCamera) || showingReview;
  // The phone's Review screen arrives as the live picture.
  const showLive = !isCamera && (showingReview || !isReplay);
  const showReplay = !isCamera && !showingReview && isReplay;

  return (
    <div
      ref={rootRef}
      className={`watch-screen${showControls ? "" : " watch-screen--idle"}`}
      onPointerMove={revealControls}
      onPointerDown={revealControls}
    >
      <video
        className={`watch-video${showLive ? "" : " watch-video--hidden"}`}
        ref={liveVideoRef}
        autoPlay
        muted
        playsInline
        onDoubleClick={toggleFullscreen}
      />
      <video
        className={`watch-video${showReplay ? "" : " watch-video--hidden"}`}
        ref={replayVideoRef}
        src={replay.recorder?.url}
        muted
        playsInline
        onDoubleClick={toggleFullscreen}
      />
      {isCamera && (
        <img
          key={cameraURL}
          className={`watch-video${
            cameraState === "loaded" ? "" : " watch-video--hidden"
          }`}
          src={cameraURL}
          alt="IP camera"
          onLoad={() => setCameraState("loaded")}
          onError={() => setCameraState("error")}
          onDoubleClick={toggleFullscreen}
        />
      )}

      {message && <div className="watch-message">{message}</div>}

      <div className="watch-overlay watch-overlay--top">
        <Tooltip title="Back to remote">
          <IconButton component={Link} to="/" aria-label="Back to remote">
            <ArrowBackRounded />
          </IconButton>
        </Tooltip>
      </div>
      <div
        className={`watch-pill${
          sourceReady && !showReplay && !showingReview ? " watch-pill--live" : ""
        }${showReplay || showingReview ? " watch-pill--replay" : ""}${
          pillVisible ? "" : " watch-pill--hidden"
        }`}
      >
        {pill}
      </div>

      <div className="watch-overlay watch-overlay--bottom">
        {hasReplay && (
          <div className="watch-timeline">
            <span className="watch-time">−{formatTime(buffered)}</span>
            <Slider
              className="watch-slider"
              size="small"
              min={tick.start}
              max={Math.max(tick.end, tick.start + 0.1)}
              step={0.1}
              value={scrubValue ?? tick.current}
              onChange={(_, value) => setScrubValue(value)}
              onChangeCommitted={(_, value) => {
                setScrubValue(null);
                replay.seekTo(value);
              }}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `−${formatTime(tick.end - value)}`}
              aria-label="Replay position"
            />
            <span className="watch-time">
              {isReplay ? `−${formatTime(behind)}` : "LIVE"}
            </span>
          </div>
        )}

        <div className="watch-controls">
          {hasReplay && (
            <>
              <Tooltip title={paused ? "Play (Space)" : "Pause (Space)"}>
                <IconButton
                  onClick={togglePlay}
                  aria-label={paused ? "Play" : "Pause"}
                >
                  {paused ? <PlayArrowRounded /> : <PauseRounded />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Back 10 seconds (←)">
                <IconButton onClick={() => seekBy(-10)} aria-label="Back 10 seconds">
                  <Replay10Rounded />
                </IconButton>
              </Tooltip>
              <Tooltip title="Forward 10 seconds (→)">
                <span>
                  <IconButton
                    onClick={() => seekBy(10)}
                    aria-label="Forward 10 seconds"
                    disabled={!isReplay}
                  >
                    <Forward10Rounded />
                  </IconButton>
                </span>
              </Tooltip>
              <Button
                className={`watch-live-button${
                  isReplay ? "" : " watch-live-button--active"
                }`}
                onClick={goLive}
                disabled={!isReplay || !isLive}
              >
                ● Live
              </Button>
            </>
          )}

          <div className="watch-spacer" />

          {cameraURL && (
            <Button
              className="watch-text-button"
              startIcon={<LinkedCameraRounded />}
              onClick={openMenu("source")}
              aria-haspopup="menu"
            >
              {isCamera ? "IP camera" : "Phone"}
            </Button>
          )}
          {replay.supported && !isCamera && (
            <>
              <Button
                className="watch-text-button"
                startIcon={<TimerRounded />}
                onClick={openMenu("delay")}
                aria-haspopup="menu"
              >
                Delay: {formatDelay(delaySetting)}
              </Button>
              <Tooltip title="Save clip">
                <span>
                  <IconButton
                    onClick={openMenu("save")}
                    aria-label="Save clip"
                    aria-haspopup="menu"
                    disabled={!hasReplay || saving}
                  >
                    <SaveAltRounded />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Replay settings">
                <IconButton
                  onClick={openMenu("settings")}
                  aria-label="Replay settings"
                  aria-haspopup="menu"
                >
                  <SettingsRounded />
                </IconButton>
              </Tooltip>
            </>
          )}

          {status === "idle" ? (
            <Tooltip title="Start watching">
              <IconButton onClick={startWatching} aria-label="Start watching">
                <PlayCircleOutlineRounded />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Stop watching">
              <IconButton onClick={stopWatching} aria-label="Stop watching">
                <StopCircleOutlined />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}>
            <IconButton
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <FullscreenExitRounded /> : <FullscreenRounded />}
            </IconButton>
          </Tooltip>
        </div>
      </div>

      <Menu
        container={menuContainer}
        anchorEl={menu?.anchor}
        open={menu?.type === "source"}
        onClose={closeMenu}
      >
        <ListSubheader>Show on the TV</ListSubheader>
        <MenuItem
          selected={!isCamera}
          onClick={() => chooseSource("phone")}
        >
          Phone broadcast
        </MenuItem>
        <MenuItem selected={isCamera} onClick={() => chooseSource("camera")}>
          IP camera
        </MenuItem>
      </Menu>

      <Menu
        container={menuContainer}
        anchorEl={menu?.anchor}
        open={menu?.type === "delay"}
        onClose={closeMenu}
      >
        <ListSubheader>Show the TV behind live by</ListSubheader>
        {DELAY_OPTIONS.map((seconds) => (
          <MenuItem
            key={seconds}
            selected={seconds === delaySetting}
            onClick={() => {
              closeMenu();
              replay.chooseDelay(seconds);
            }}
          >
            {formatDelay(seconds)}
          </MenuItem>
        ))}
      </Menu>

      <Menu
        container={menuContainer}
        anchorEl={menu?.anchor}
        open={menu?.type === "save"}
        onClose={closeMenu}
      >
        <ListSubheader>Save as a video file</ListSubheader>
        {SAVE_OPTIONS.filter((seconds) => seconds < buffered).map((seconds) => (
          <MenuItem key={seconds} onClick={() => saveClip(seconds)}>
            Last {formatTime(seconds)}
          </MenuItem>
        ))}
        <MenuItem onClick={() => saveClip(bufferMinutes * 60)}>
          Everything ({formatTime(buffered)})
        </MenuItem>
      </Menu>

      <Menu
        container={menuContainer}
        anchorEl={menu?.anchor}
        open={menu?.type === "settings"}
        onClose={closeMenu}
      >
        <ListSubheader>Keep the last</ListSubheader>
        {BUFFER_OPTIONS.map((minutes) => (
          <MenuItem
            key={minutes}
            onClick={() => {
              closeMenu();
              replay.setBufferMinutes(minutes);
            }}
          >
            <span className="watch-menu-check">
              {minutes === bufferMinutes && <CheckRounded fontSize="small" />}
            </span>
            {minutes} minutes
          </MenuItem>
        ))}
      </Menu>

      <Snackbar
        open={Boolean(notice)}
        message={notice}
        autoHideDuration={3000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      />
    </div>
  );
}

export default WatchPage;
