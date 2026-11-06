import { useCallback, useEffect, useRef, useState } from "react";
import { ReplayRecorder, pickReplayMimeType } from "./ReplayRecorder";

const TICK_MS = 250;
// Closer than this to the live edge counts as caught up.
const LIVE_EDGE_SECONDS = 1;
// A delayed picture is left to play like any replay; it is only corrected
// once it is this far off the chosen delay. The buffer end grows in 1 s
// steps, so anything tighter reacts to that noise.
const DELAY_SLACK_SECONDS = 3;
// The live edge grows about once a second; longer than this means the
// phone stopped sending.
const EDGE_IDLE_MS = 2500;
// How close to the end of a buffered range counts as stuck at its hole.
const GAP_TOLERANCE_SECONDS = 0.3;

// The recording has small holes wherever the WebRTC picture froze (weak
// Wi-Fi), and a <video> playing from MediaSource stalls at a hole instead of
// skipping it. Returns where to resume if `video` is stuck at one.
function gapSkipTarget(video) {
  if (video.paused || video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return null;
  }
  const { buffered } = video;
  const time = video.currentTime;
  for (let i = 0; i < buffered.length - 1; i += 1) {
    const holeStart = buffered.end(i);
    const holeEnd = buffered.start(i + 1);
    if (time >= holeStart - GAP_TOLERANCE_SECONDS && time < holeEnd) {
      return holeEnd + 0.01;
    }
  }
  return null;
}

function readSetting(key, fallback) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && localStorage.getItem(key) !== null
      ? value
      : fallback;
  } catch {
    return fallback;
  }
}

function writeSetting(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Settings just will not persist (private window, blocked storage).
  }
}

// Owns the replay buffer for the current broadcast and the live / replay /
// delayed playback state of the replay <video>.
//
// mode "live" shows the WebRTC stream directly. mode "replay" shows the
// buffered recording; with delayActive it follows the live edge at a fixed
// delay, otherwise it plays or pauses wherever the viewer put it.
export function useReplayPlayer(videoRef, { connected }) {
  const [recorder, setRecorder] = useState(null);
  const [mode, setMode] = useState("live");
  const [delaySetting, setDelaySetting] = useState(() =>
    readSetting("watch.delaySeconds", 0)
  );
  const [delayActive, setDelayActive] = useState(false);
  const [bufferMinutes, setBufferMinutesState] = useState(() =>
    readSetting("watch.bufferMinutes", 5)
  );
  const [tick, setTick] = useState(null);

  // Read from event handlers registered before later renders.
  const recorderRef = useRef(null);
  // Recording is paused while the phone shows its Review screen on the TV.
  const recordingPausedRef = useRef(false);
  const settingsRef = useRef({ delaySetting, bufferMinutes });

  const supported = pickReplayMimeType() !== null;

  const startSession = useCallback((stream) => {
    const mimeType = pickReplayMimeType();
    if (!mimeType || recorderRef.current?.stream === stream) return;
    recorderRef.current?.destroy();

    const { delaySetting: delay, bufferMinutes: minutes } = settingsRef.current;
    const next = new ReplayRecorder(stream, {
      bufferSeconds: minutes * 60,
      mimeType,
    });
    next.stream = stream;
    next.setPaused(recordingPausedRef.current);
    recorderRef.current = next;
    setRecorder(next);
    setTick(null);
    setMode(delay > 0 ? "replay" : "live");
    setDelayActive(delay > 0);
  }, []);

  const endSession = useCallback(() => {
    recorderRef.current?.destroy();
    recorderRef.current = null;
    setRecorder(null);
    setTick(null);
    setMode("live");
    setDelayActive(false);
  }, []);

  useEffect(() => endSession, [endSession]);

  useEffect(() => {
    if (!recorder) return undefined;
    // When the live edge last moved, to tell "phone stopped sending" apart
    // from "rebuilding the delay after the phone came back".
    let lastEnd = null;
    let lastGrowthAt = performance.now();
    // Holding a frame because playback caught up with the buffer end.
    let holding = false;
    const id = setInterval(() => {
      const range = recorder.range();
      const video = videoRef.current;
      if (!range || !video) {
        setTick(null);
        return;
      }

      if (range.end !== lastEnd) {
        lastEnd = range.end;
        lastGrowthAt = performance.now();
      }
      const edgeMoving = performance.now() - lastGrowthAt < EDGE_IDLE_MS;
      let stalled = false;
      const skipTo = mode === "replay" ? gapSkipTarget(video) : null;
      if (skipTo !== null) video.currentTime = skipTo;

      if (mode === "replay" && delayActive && !recorder.isRecording()) {
        // The live edge stopped moving, so there is nothing to follow; let
        // the replay play out to the end instead of looping the last seconds.
        // A recorder that has not started yet is still building the delay.
        if (recorder.recorder) setDelayActive(false);
      } else if (mode === "replay" && delayActive) {
        // Seeking to the delay point once and playing at normal speed keeps
        // the delay by itself, so this only steps in when it is clearly off.
        const behind = range.end - video.currentTime;
        if (range.end - range.start < delaySetting) {
          // Not enough buffered for the delay yet: hold the first frame.
          holding = true;
          if (!video.paused) video.pause();
          if (Math.abs(video.currentTime - range.start) > 0.5) {
            video.currentTime = range.start;
          }
        } else if (holding || behind < delaySetting - DELAY_SLACK_SECONDS) {
          // Caught up with the buffer end: the phone stopped sending for a
          // while. Hold this frame until the full delay has built up again,
          // rather than seeking back (which replays the same seconds).
          holding = behind < delaySetting;
          if (holding) {
            stalled = edgeMoving ? "rebuilding" : "no-video";
            if (!video.paused) video.pause();
          } else {
            video.play().catch(() => {});
          }
        } else if (behind > delaySetting + DELAY_SLACK_SECONDS) {
          // Fell behind (a slow device or a hole): jump to the delay point.
          video.currentTime = range.end - delaySetting;
          video.play().catch(() => {});
        } else if (video.paused) {
          video.play().catch(() => {});
        }
      } else if (mode === "replay") {
        if (video.currentTime < range.start) video.currentTime = range.start;
        // A finished recording has no live edge to catch up to; stop on its
        // last frame so the controls show it as paused.
        if (
          !recorder.isRecording() &&
          !video.paused &&
          video.currentTime >= range.end - 0.1
        ) {
          video.pause();
        }
        if (
          connected &&
          !video.paused &&
          range.end - video.currentTime < LIVE_EDGE_SECONDS
        ) {
          video.pause();
          setMode("live");
        }
      }

      setTick({
        start: range.start,
        end: range.end,
        current: mode === "live" ? range.end : video.currentTime,
        paused: mode === "live" ? false : video.paused,
        stalled,
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [recorder, mode, delayActive, delaySetting, connected, videoRef]);

  const goLive = useCallback(() => {
    videoRef.current?.pause();
    setMode("live");
    setDelayActive(false);
  }, [videoRef]);

  const enterReplay = useCallback(
    (time, play) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = time;
      if (play) video.play().catch(() => {});
      else video.pause();
      setMode("replay");
      setDelayActive(false);
    },
    [videoRef]
  );

  const seekTo = useCallback(
    (time) => {
      const range = recorderRef.current?.range();
      const video = videoRef.current;
      if (!range || !video) return;
      const target = Math.min(Math.max(time, range.start), range.end);
      if (connected && target >= range.end - LIVE_EDGE_SECONDS) {
        goLive();
        return;
      }
      enterReplay(target, mode === "live" || !video.paused);
    },
    [connected, enterReplay, goLive, mode, videoRef]
  );

  const seekBy = useCallback(
    (seconds) => {
      const range = recorderRef.current?.range();
      const video = videoRef.current;
      if (!range || !video) return;
      seekTo((mode === "live" ? range.end : video.currentTime) + seconds);
    },
    [mode, seekTo, videoRef]
  );

  const togglePlay = useCallback(() => {
    const range = recorderRef.current?.range();
    const video = videoRef.current;
    if (!range || !video) return;
    if (mode === "live") {
      // Freeze on what is on screen now.
      enterReplay(range.end, false);
    } else if (video.paused) {
      setDelayActive(false);
      video.play().catch(() => {});
    } else {
      setDelayActive(false);
      video.pause();
    }
  }, [enterReplay, mode, videoRef]);

  const chooseDelay = useCallback(
    (seconds) => {
      setDelaySetting(seconds);
      settingsRef.current.delaySetting = seconds;
      writeSetting("watch.delaySeconds", seconds);
      if (seconds === 0) {
        goLive();
        return;
      }
      // Jump to the delay point once; the tick then only nudges forward or
      // holds, so it never has to seek backwards.
      const range = recorderRef.current?.range();
      const video = videoRef.current;
      if (range && video) {
        video.currentTime = Math.max(range.start, range.end - seconds);
      }
      setMode("replay");
      setDelayActive(true);
    },
    [goLive, videoRef]
  );

  const setBufferMinutes = useCallback((minutes) => {
    setBufferMinutesState(minutes);
    settingsRef.current.bufferMinutes = minutes;
    writeSetting("watch.bufferMinutes", minutes);
    recorderRef.current?.setBufferSeconds(minutes * 60);
  }, []);

  const setRecordingPaused = useCallback((paused) => {
    recordingPausedRef.current = paused;
    recorderRef.current?.setPaused(paused);
  }, []);

  const save = useCallback(
    (seconds) => recorderRef.current?.save(seconds) ?? Promise.resolve(null),
    []
  );

  return {
    supported,
    recorder,
    mode,
    tick,
    delaySetting,
    delayActive,
    bufferMinutes,
    startSession,
    endSession,
    goLive,
    seekTo,
    seekBy,
    togglePlay,
    chooseDelay,
    setBufferMinutes,
    setRecordingPaused,
    save,
  };
}
