import React, { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  Drawer,
  Fab,
  IconButton,
  Slider,
  Snackbar,
  useMediaQuery,
} from "@mui/material";
import {
  Cameraswitch,
  FiberManualRecord,
  FlashlightOff,
  FlashlightOn,
  Fullscreen,
  FullscreenExit,
  Stop,
  Tune,
  VideocamRounded,
  ZoomIn,
  ZoomOut,
} from "@mui/icons-material";
import { io } from "socket.io-client";
import { useServer } from "../context/ServerContext";
import { ROOM_ID, ICE_SERVERS } from "../webrtc";
import { loadSettings, saveSettings } from "../broadcast/settings";
import {
  applyContentHint,
  applySenderSettings,
  applyTrackConstraints,
  captureConstraints,
  countCameras,
  listCameras,
  outboundVideoStats,
  readCapabilities,
} from "../broadcast/capture";
import { useWakeLock } from "../broadcast/useWakeLock";
import BroadcastSettings from "../broadcast/BroadcastSettings";
import "./BroadcastPage.css";

const SIZE_KEYS = ["resolution", "frameRate", "orientation"];
const SENDER_KEYS = ["maxBitrate", "motion"];

function statusLabel(status, watcherCount) {
  switch (status) {
    case "idle":
      return "Ready";
    case "starting":
      return "Starting…";
    case "live":
      return `LIVE · ${watcherCount} watching`;
    case "reconnecting":
      return "Reconnecting…";
    default:
      return status;
  }
}

function formatSize(width, height) {
  return width && height ? `${width}×${height}` : "–";
}

function formatStats(stats) {
  if (!stats) return [];
  const lines = [];
  const { capture, send } = stats;
  if (capture) {
    const fps = capture.fps ? ` · ${Math.round(capture.fps)} fps` : "";
    lines.push(`Camera ${formatSize(capture.width, capture.height)}${fps}`);
  }
  if (send) {
    const fps = send.fps ? ` · ${Math.round(send.fps)} fps` : "";
    const rate =
      send.kbps != null ? ` · ${(send.kbps / 1000).toFixed(1)} Mbps` : "";
    const limited =
      send.limitation && send.limitation !== "none"
        ? ` (${send.limitation}-limited)`
        : "";
    lines.push(
      `Sending ${formatSize(send.width, send.height)}${fps}${rate}${limited}`
    );
  }
  return lines;
}

function lockOrientation(orientation) {
  const screenOrientation = window.screen?.orientation;
  if (!screenOrientation || !document.fullscreenElement) return;
  try {
    if (orientation === "auto") screenOrientation.unlock?.();
    else screenOrientation.lock?.(orientation)?.catch(() => {});
  } catch {
    // Orientation lock is Android-only (and only in fullscreen).
  }
}

function BroadcastPage() {
  const { socketURL } = useServer();
  const [settings, setSettings] = useState(loadSettings);
  const [status, setStatus] = useState("idle");
  const [watcherCount, setWatcherCount] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [caps, setCaps] = useState(null);
  const [cameraCount, setCameraCount] = useState(0);
  const [facing, setFacing] = useState(null);
  const [zoom, setZoom] = useState(null);
  const [torch, setTorch] = useState(false);
  const [stats, setStats] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [notice, setNotice] = useState("");
  const isLandscape = useMediaQuery("(orientation: landscape)");

  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const streamRef = useRef(null);
  // watcherId -> { peer, sender, pending: RTCIceCandidateInit[] }
  const peersRef = useRef(new Map());
  const settingsRef = useRef(settings);
  // Camera changes run one at a time so quick taps can't race each other.
  const queueRef = useRef(Promise.resolve());
  // Bumped on teardown so in-flight camera restarts know they are stale.
  const sessionRef = useRef(0);
  const zoomRef = useRef(null);
  const torchRef = useRef(false);
  const zoomQueuedRef = useRef(false);
  const fullscreenRef = useRef(false);

  const live = status === "live";
  useWakeLock(live && settings.keepAwake);

  const currentTrack = () => streamRef.current?.getVideoTracks()[0] ?? null;

  const enqueue = (task) => {
    queueRef.current = queueRef.current.then(task).catch((error) => {
      console.error("Camera update failed", error);
      setNotice(`Camera update failed: ${error.name || error.message}`);
    });
    return queueRef.current;
  };

  const closePeer = (watcherId) => {
    const entry = peersRef.current.get(watcherId);
    if (!entry) return;
    entry.peer.close();
    peersRef.current.delete(watcherId);
    setWatcherCount(peersRef.current.size);
  };

  const teardown = () => {
    sessionRef.current += 1;
    for (const id of [...peersRef.current.keys()]) closePeer(id);
    socketRef.current?.disconnect();
    socketRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setStats(null);
    setTorch(false);
    torchRef.current = false;
  };

  // teardown only touches refs, so the mount-time copy is safe to run on unmount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => teardown, []);

  const adoptStream = (stream) => {
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
    const track = stream.getVideoTracks()[0];
    applyContentHint(track, settingsRef.current);

    const nextCaps = readCapabilities(track);
    const trackSettings = track.getSettings();
    zoomRef.current = nextCaps.zoom
      ? trackSettings.zoom ?? nextCaps.zoom.min
      : null;
    torchRef.current = false;
    setCaps(nextCaps);
    setZoom(zoomRef.current);
    setTorch(false);
    setFacing(trackSettings.facingMode || settingsRef.current.facingMode);
    setCameraOn(true);

    track.addEventListener("ended", () => {
      if (streamRef.current === stream) {
        setNotice("Camera stopped. Switch back to this tab to restart it.");
      }
    });
    countCameras().then(setCameraCount);
  };

  const openCamera = async (deviceId) => {
    try {
      return await navigator.mediaDevices.getUserMedia(
        captureConstraints(settingsRef.current, deviceId)
      );
    } catch (error) {
      if (!["OverconstrainedError", "NotFoundError"].includes(error.name)) {
        throw error;
      }
      if (deviceId) return openCamera(); // that camera is gone; use any
      return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
  };

  // Opens the camera facing the other way. Browsers that don't report
  // facingMode (most laptops) get the next camera in the device list.
  const openOtherCamera = async (previousId) => {
    const wanted = settingsRef.current.facingMode;
    const stream = await openCamera();
    const { facingMode, deviceId } = stream.getVideoTracks()[0].getSettings();
    if (facingMode === wanted || deviceId !== previousId) return stream;
    const cameras = await listCameras();
    const index = cameras.findIndex((camera) => camera.deviceId === deviceId);
    const next = cameras[(index + 1) % cameras.length];
    if (!next || next.deviceId === deviceId) return stream;
    stream.getTracks().forEach((track) => track.stop());
    return openCamera(next.deviceId);
  };

  const applySenderAll = async () => {
    await Promise.all(
      [...peersRef.current.values()]
        .filter((entry) => entry.peer.remoteDescription)
        .map((entry) => applySenderSettings(entry.sender, settingsRef.current))
    );
  };

  // New camera (or same camera, new mode): swap the track on every peer.
  // replaceTrack needs no renegotiation, so watchers stay connected.
  const restartCapture = async ({ switchCamera = false } = {}) => {
    if (!streamRef.current) return;
    const session = sessionRef.current;
    const previousId = currentTrack()?.getSettings().deviceId;
    // iOS can only have one camera open, so release the old one first.
    streamRef.current.getTracks().forEach((track) => track.stop());
    const stream = switchCamera
      ? await openOtherCamera(previousId)
      : await openCamera(previousId);
    if (session !== sessionRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    adoptStream(stream);
    const track = stream.getVideoTracks()[0];
    await Promise.all(
      [...peersRef.current.values()].map((entry) =>
        entry.sender?.replaceTrack(track)
      )
    );
  };

  const applySize = async () => {
    const track = currentTrack();
    if (!track) return;
    if (track.readyState === "ended") {
      await restartCapture();
      return;
    }
    try {
      await applyTrackConstraints(track, settingsRef.current, {
        zoom: zoomRef.current,
        torch: torchRef.current,
      });
    } catch (error) {
      console.warn("applyConstraints failed, reopening camera", error);
      await restartCapture();
    }
  };

  const changeSetting = (key, value) => {
    const next = { ...settingsRef.current, [key]: value };
    settingsRef.current = next;
    setSettings(next);
    saveSettings(next);
    if (key === "orientation") lockOrientation(value);
    if (!streamRef.current) return;
    if (key === "facingMode") {
      enqueue(() => restartCapture({ switchCamera: true }));
    }
    else if (SIZE_KEYS.includes(key)) enqueue(applySize);
    else if (SENDER_KEYS.includes(key)) {
      applyContentHint(currentTrack(), next);
      enqueue(applySenderAll);
    }
  };

  const changeZoom = (value) => {
    zoomRef.current = value;
    setZoom(value);
    if (zoomQueuedRef.current) return; // the queued update reads the latest value
    zoomQueuedRef.current = true;
    enqueue(async () => {
      zoomQueuedRef.current = false;
      await applySize();
    });
  };

  const toggleTorch = () => {
    torchRef.current = !torchRef.current;
    setTorch(torchRef.current);
    enqueue(applySize);
  };

  // "Auto" orientation follows the phone: re-request a matching frame shape.
  const onRotate = useEffectEvent(() => {
    if (settingsRef.current.orientation === "auto" && streamRef.current) {
      enqueue(applySize);
    }
  });
  useEffect(() => {
    onRotate();
  }, [isLandscape]);

  // Mobile browsers may end the camera track while the page is hidden.
  const onVisible = useEffectEvent(() => {
    if (document.visibilityState !== "visible") return;
    if (currentTrack()?.readyState === "ended") enqueue(() => restartCapture());
  });
  useEffect(() => {
    if (!cameraOn) return undefined;
    const handler = () => onVisible();
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [cameraOn]);

  // What the camera delivers and what the encoder actually sends.
  useEffect(() => {
    if (!cameraOn) return undefined;
    let last = null;
    const timer = setInterval(async () => {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track) return;
      const trackSettings = track.getSettings();
      const capture = {
        width: trackSettings.width,
        height: trackSettings.height,
        fps: trackSettings.frameRate,
      };
      let send = null;
      const entry = [...peersRef.current.values()].find(
        (candidate) => candidate.peer.connectionState === "connected"
      );
      if (entry) {
        const out = await outboundVideoStats(entry.peer).catch(() => null);
        if (out) {
          let kbps = null;
          if (last && last.peer === entry.peer && out.timestamp > last.timestamp) {
            kbps =
              ((out.bytesSent - last.bytesSent) * 8) /
              (out.timestamp - last.timestamp);
          }
          last = { peer: entry.peer, ...out };
          send = { ...out, kbps };
        }
      }
      setStats({ capture, send });
    }, 1000);
    return () => clearInterval(timer);
  }, [cameraOn]);

  // Leaving fullscreen with the system back gesture also leaves immersive mode.
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement && fullscreenRef.current) {
        fullscreenRef.current = false;
        setImmersive(false);
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleImmersive = async () => {
    if (immersive) {
      setImmersive(false);
      if (document.fullscreenElement) {
        fullscreenRef.current = false;
        await document.exitFullscreen().catch(() => {});
      }
      return;
    }
    // Without the Fullscreen API (iPhone) the page still covers the nav bar.
    setImmersive(true);
    const root = document.documentElement;
    if (root.requestFullscreen && !document.fullscreenElement) {
      try {
        await root.requestFullscreen({ navigationUI: "hide" });
        fullscreenRef.current = true;
        lockOrientation(settingsRef.current.orientation);
      } catch {
        // Fullscreen refused; the CSS-only immersive view still applies.
      }
    }
  };

  const startBroadcast = async () => {
    teardown();
    setStatus("starting");
    const session = sessionRef.current;

    let stream;
    try {
      stream = await openCamera();
    } catch (error) {
      console.error("Failed to access camera", error);
      setStatus(
        window.isSecureContext
          ? `camera error: ${error.name}`
          : "camera needs HTTPS"
      );
      return;
    }
    if (session !== sessionRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    adoptStream(stream);

    const socket = io(socketURL, { transports: ["websocket"] });
    socketRef.current = socket;

    // Re-joins after a reconnect too; the server forgets us on disconnect.
    socket.on("connect", () => {
      socket.emit("webrtc:join", { roomId: ROOM_ID, role: "broadcaster" });
      setStatus("live");
    });
    socket.on("disconnect", () => {
      for (const id of [...peersRef.current.keys()]) closePeer(id);
      setStatus("reconnecting");
    });

    socket.on("webrtc:replaced", () => {
      teardown();
      setStatus("another phone took over");
    });

    socket.on("webrtc:watcher-join", async ({ watcherId }) => {
      closePeer(watcherId);
      const current = streamRef.current;
      if (!current) return;
      const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const track = current.getVideoTracks()[0];
      const sender = peer.addTrack(track, current);
      const entry = { peer, sender, pending: [] };
      peersRef.current.set(watcherId, entry);
      setWatcherCount(peersRef.current.size);

      peer.onicecandidate = ({ candidate }) => {
        if (candidate) {
          socket.emit("webrtc:ice", { targetId: watcherId, candidate });
        }
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed") closePeer(watcherId);
      };

      try {
        await peer.setLocalDescription(await peer.createOffer());
        socket.emit("webrtc:offer", {
          targetId: watcherId,
          sdp: peer.localDescription,
        });
      } catch (error) {
        console.error("Failed to create offer", error);
        closePeer(watcherId);
      }
    });

    socket.on("webrtc:answer", async ({ sdp, fromId }) => {
      const entry = peersRef.current.get(fromId);
      if (!entry) return;
      try {
        await entry.peer.setRemoteDescription(sdp);
        for (const candidate of entry.pending) {
          await entry.peer.addIceCandidate(candidate);
        }
        entry.pending = [];
        await applySenderSettings(entry.sender, settingsRef.current);
      } catch (error) {
        console.error("Failed to apply answer", error);
      }
    });

    socket.on("webrtc:ice", async ({ candidate, fromId }) => {
      const entry = peersRef.current.get(fromId);
      if (!entry || !candidate) return;
      if (!entry.peer.remoteDescription) {
        entry.pending.push(candidate);
        return;
      }
      try {
        await entry.peer.addIceCandidate(candidate);
      } catch (error) {
        console.error("Failed to add ICE candidate", error);
      }
    });

    socket.on("webrtc:watcher-left", ({ watcherId }) => closePeer(watcherId));
  };

  const stopBroadcast = () => {
    teardown();
    setStatus("idle");
  };

  const broadcasting = cameraOn || status === "starting";
  const mirrored = cameraOn && facing === "user";
  const statsLines = formatStats(stats);
  const zoomCaps = cameraOn ? caps?.zoom : null;
  const hasTorch = cameraOn && caps?.torch === true;
  const canFlip = cameraCount > 1;
  let pillTone = "error";
  if (live) pillTone = "live";
  else if (status === "idle") pillTone = "idle";
  else if (status === "starting" || status === "reconnecting") pillTone = "busy";

  return (
    <div
      className={`bc-screen${immersive ? " bc-screen--immersive" : ""}${
        live ? " bc-screen--live" : ""
      }`}
    >
      <video
        className={`bc-video${mirrored ? " bc-video--mirror" : ""}${
          cameraOn ? "" : " bc-video--hidden"
        }`}
        ref={videoRef}
        autoPlay
        muted
        playsInline
      />

      {!cameraOn && (
        <div className="bc-empty">
          <span className="bc-empty-icon" aria-hidden="true">
            <VideocamRounded />
          </span>
          <div className="bc-empty-title">Broadcast this camera to the TV</div>
          <div className="bc-empty-hint">
            Tap <b>Go live</b> to start. <Tune fontSize="inherit" /> sets
            camera, orientation and quality.
          </div>
        </div>
      )}

      <div className="bc-top">
        <span className={`bc-pill bc-pill--${pillTone}`} role="status">
          <span className="bc-pill-dot" aria-hidden="true" />
          {statusLabel(status, watcherCount)}
        </span>
        {statsLines.length > 0 && (
          <div className="bc-stats">
            {statsLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        )}
      </div>

      {zoomCaps && zoomCaps.max > zoomCaps.min && (
        <div className="bc-zoom">
          <ZoomOut fontSize="small" />
          <Slider
            size="small"
            min={zoomCaps.min}
            max={zoomCaps.max}
            step={zoomCaps.step || 0.1}
            value={zoom ?? zoomCaps.min}
            onChange={(_, value) => changeZoom(value)}
            aria-label="Zoom"
          />
          <span className="bc-zoom-value">{(zoom ?? 1).toFixed(1)}×</span>
          <ZoomIn fontSize="small" />
        </div>
      )}

      <div className="bc-controls">
        <div className="bc-controls-side">
          <IconButton
            aria-label="Camera and quality settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Tune />
          </IconButton>
          {canFlip && (
            <IconButton
              aria-label="Switch camera"
              onClick={() =>
                changeSetting(
                  "facingMode",
                  settings.facingMode === "user" ? "environment" : "user"
                )
              }
            >
              <Cameraswitch />
            </IconButton>
          )}
        </div>

        {broadcasting ? (
          <Fab
            variant="extended"
            color="error"
            onClick={stopBroadcast}
            aria-label="Stop"
            className="bc-main-button bc-main-button--stop"
          >
            <Stop />
            <span className="bc-main-label">Stop</span>
          </Fab>
        ) : (
          <Fab
            variant="extended"
            color="primary"
            onClick={startBroadcast}
            aria-label="Go live"
            className="bc-main-button"
          >
            <FiberManualRecord />
            <span className="bc-main-label">Go live</span>
          </Fab>
        )}

        <div className="bc-controls-side">
          {hasTorch && (
            <IconButton
              aria-label={torch ? "Turn light off" : "Turn light on"}
              onClick={toggleTorch}
              className={torch ? "bc-active" : ""}
            >
              {torch ? <FlashlightOn /> : <FlashlightOff />}
            </IconButton>
          )}
          <IconButton
            aria-label={immersive ? "Exit full screen" : "Full screen"}
            onClick={toggleImmersive}
          >
            {immersive ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
        </div>
      </div>

      <Drawer
        anchor={isLandscape ? "right" : "bottom"}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        slotProps={{
          paper: {
            className: `bc-drawer${isLandscape ? " bc-drawer--side" : ""}`,
          },
          backdrop: { invisible: true },
        }}
      >
        <BroadcastSettings
          settings={settings}
          onChange={changeSetting}
          caps={cameraOn ? caps : null}
          cameraCount={cameraCount}
          onClose={() => setSettingsOpen(false)}
        />
      </Drawer>

      <Snackbar
        open={Boolean(notice)}
        message={notice}
        autoHideDuration={4000}
        onClose={() => setNotice("")}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      />
    </div>
  );
}

export default BroadcastPage;
