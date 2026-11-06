import React, {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  IconButton,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  ArrowBackRounded,
  ChevronLeftRounded,
  ChevronRightRounded,
  FileDownloadRounded,
  IosShareRounded,
  PauseRounded,
  PlayArrowRounded,
  TvRounded,
} from "@mui/icons-material";
import "./ReviewPlayer.css";

const FRAME = 1 / 30;
const SPEEDS = [0.25, 0.5, 1];

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "–:––";
  const tenths = Math.max(0, Math.floor(seconds * 10));
  const minutes = Math.floor(tenths / 600);
  const rest = ((tenths % 600) / 10).toFixed(1).padStart(4, "0");
  return `${minutes}:${rest}`;
}

function clipLength(clip) {
  return clip ? (clip.endedAt - clip.startedAt) / 1000 : 0;
}

function fileName(clip) {
  const date = new Date(clip.startedAt);
  const pad = (value) => String(value).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(
    date.getSeconds()
  )}`;
  const extension = clip.mimeType.includes("mp4") ? "mp4" : "webm";
  return `stunt-${day}-${time}.${extension}`;
}

function shareableFile(clip) {
  if (typeof File !== "function" || !navigator.canShare) return null;
  const file = new File([clip.blob], fileName(clip), { type: clip.blob.type });
  try {
    return navigator.canShare({ files: [file] }) ? file : null;
  } catch {
    return null;
  }
}

// Full-screen player for clips the phone just recorded. Lives in a Dialog so
// it covers the nav bar; the broadcast keeps running underneath.
function ReviewPlayer({
  clips,
  live,
  watcherCount,
  canShowOnTv,
  onShowOnTv,
  onClose,
}) {
  const [which, setWhich] = useState(clips.latest ? "latest" : "previous");
  const clip = clips[which];
  // Made once and freed on close, so the clips' memory goes with the screen.
  const [urls] = useState(() => ({
    latest: clips.latest && URL.createObjectURL(clips.latest.blob),
    previous: clips.previous && URL.createObjectURL(clips.previous.blob),
  }));
  const url = urls[which];

  const videoRef = useRef(null);
  // Mirror this screen to the TV (on by default while live).
  const [showOnTv, setShowOnTv] = useState(true);
  const mirrorToTv = showOnTv && canShowOnTv;
  const reportTv = useEffectEvent((on) =>
    onShowOnTv?.(on ? () => videoRef.current : null)
  );
  useEffect(() => {
    reportTv(mirrorToTv);
    return () => reportTv(false);
  }, [mirrorToTv]);
  const [duration, setDuration] = useState(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.5);
  // A seek asked for while the video is still busy with the last one.
  const pendingSeekRef = useRef(null);
  // MediaRecorder WebM has no duration until the end has been seeked.
  const probingRef = useRef(false);
  const scrubRef = useRef({ active: false, resume: false });

  const shareFile = useMemo(() => (clip ? shareableFile(clip) : null), [clip]);
  const ready = duration != null;

  // Smooth time readout while playing (timeupdate is only ~4 Hz).
  useEffect(() => {
    if (!playing) return undefined;
    let frame;
    const tick = () => {
      const video = videoRef.current;
      if (video && pendingSeekRef.current == null) setTime(video.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const finishProbe = (video) => {
    probingRef.current = false;
    setDuration(video.duration);
    video.currentTime = 0;
    setTime(0);
  };

  const onLoadedMetadata = () => {
    const video = videoRef.current;
    video.playbackRate = speed;
    if (Number.isFinite(video.duration)) {
      setDuration(video.duration);
      return;
    }
    probingRef.current = true;
    video.currentTime = 1e101;
    // Fall back to the wall-clock length if the browser never works it out.
    setTimeout(() => {
      if (probingRef.current && videoRef.current === video) {
        probingRef.current = false;
        setDuration(clipLength(clip));
        video.currentTime = 0;
      }
    }, 3000);
  };

  const onDurationChange = () => {
    const video = videoRef.current;
    if (probingRef.current && Number.isFinite(video.duration)) {
      finishProbe(video);
    } else if (ready && Number.isFinite(video.duration)) {
      setDuration(video.duration);
    }
  };

  const seekTo = (target) => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const next = Math.min(Math.max(target, 0), duration);
    setTime(next);
    if (video.seeking) pendingSeekRef.current = next;
    else video.currentTime = next;
  };

  const onSeeked = () => {
    const video = videoRef.current;
    if (probingRef.current) {
      if (Number.isFinite(video.duration)) finishProbe(video);
      return;
    }
    const pending = pendingSeekRef.current;
    if (pending != null) {
      pendingSeekRef.current = null;
      video.currentTime = pending;
    } else {
      setTime(video.currentTime);
    }
  };

  // Where the last requested seek lands, so quick taps add up.
  const position = () => pendingSeekRef.current ?? videoRef.current.currentTime;

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || !ready) return;
    if (!video.paused) {
      video.pause();
      return;
    }
    if (video.ended || duration - video.currentTime < 0.05) seekTo(0);
    video.play().catch(() => {});
  };

  const step = (seconds) => {
    const video = videoRef.current;
    if (!video || !ready) return;
    video.pause();
    seekTo(position() + seconds);
  };

  const changeSpeed = (next) => {
    setSpeed(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  };

  const startScrub = () => {
    const video = videoRef.current;
    if (!video || scrubRef.current.active) return;
    scrubRef.current = { active: true, resume: !video.paused };
    video.pause();
  };

  const endScrub = () => {
    const { active, resume } = scrubRef.current;
    scrubRef.current = { active: false, resume: false };
    if (active && resume) videoRef.current?.play().catch(() => {});
  };

  const switchClip = (next) => {
    if (!next || next === which) return;
    setDuration(null);
    setTime(0);
    setPlaying(false);
    pendingSeekRef.current = null;
    probingRef.current = false;
    setWhich(next);
  };

  const download = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName(clip);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const save = () => {
    if (!clip || !url) return;
    if (!shareFile) {
      download();
      return;
    }
    navigator.share({ files: [shareFile] }).catch((error) => {
      if (error.name !== "AbortError") download();
    });
  };

  const close = () => {
    videoRef.current?.pause();
    Object.values(urls).forEach((value) => value && URL.revokeObjectURL(value));
    onClose();
  };

  return (
    <Dialog
      fullScreen
      open
      onClose={close}
      aria-label="Review recording"
      slotProps={{ paper: { className: "rv-root" } }}
    >
      <div className="rv-top">
        <Button
          className="rv-back"
          startIcon={<ArrowBackRounded />}
          onClick={close}
        >
          Back to camera
        </Button>
        {clips.latest && clips.previous && (
          <ToggleButtonGroup
            className="rv-segmented rv-which"
            exclusive
            size="small"
            value={which}
            onChange={(_, next) => switchClip(next)}
            aria-label="Clip"
          >
            <ToggleButton value="latest">
              Latest · {formatTime(clipLength(clips.latest)).replace(/\.\d$/, "")}
            </ToggleButton>
            <ToggleButton value="previous">
              Previous · {formatTime(clipLength(clips.previous)).replace(/\.\d$/, "")}
            </ToggleButton>
          </ToggleButtonGroup>
        )}
        {canShowOnTv && (
          <Button
            className={`rv-tv${mirrorToTv ? " rv-tv--on" : ""}`}
            startIcon={<TvRounded />}
            onClick={() => setShowOnTv((on) => !on)}
            aria-pressed={mirrorToTv}
          >
            {mirrorToTv ? "On TV" : "Show on TV"}
          </Button>
        )}
        {live && (
          <span className="rv-live" role="status">
            <span className="rv-live-dot" aria-hidden="true" />
            LIVE · {watcherCount}
          </span>
        )}
      </div>

      <div className="rv-stage">
        {url && (
          <video
            key={url}
            ref={videoRef}
            className="rv-video"
            src={url}
            muted
            playsInline
            preload="auto"
            onLoadedMetadata={onLoadedMetadata}
            onDurationChange={onDurationChange}
            onSeeked={onSeeked}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
        )}
        {!ready && (
          <div className="rv-loading">
            <CircularProgress size={36} />
          </div>
        )}
      </div>

      <div className="rv-panel">
        <div className="rv-scrub">
          <span className="rv-time">{formatTime(time)}</span>
          <Slider
            className="rv-slider"
            min={0}
            max={ready ? duration : 1}
            step={0.01}
            value={ready ? Math.min(time, duration) : 0}
            disabled={!ready}
            onChange={(_, value) => {
              startScrub();
              seekTo(value);
            }}
            onChangeCommitted={endScrub}
            aria-label="Position"
            aria-valuetext={formatTime(time)}
          />
          <span className="rv-time rv-time--total">
            {ready ? formatTime(duration) : "–:––"}
          </span>
        </div>

        <div className="rv-actions">
          <ToggleButtonGroup
            className="rv-segmented rv-speed"
            exclusive
            size="small"
            value={speed}
            onChange={(_, next) => next != null && changeSpeed(next)}
            aria-label="Playback speed"
          >
            {SPEEDS.map((value) => (
              <ToggleButton key={value} value={value}>
                {value}×
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <div className="rv-transport">
            <IconButton
              aria-label="Back 1 second"
              onClick={() => step(-1)}
              disabled={!ready}
            >
              <span className="rv-jump">−1s</span>
            </IconButton>
            <IconButton
              aria-label="Previous frame"
              onClick={() => step(-FRAME)}
              disabled={!ready}
            >
              <ChevronLeftRounded />
            </IconButton>
            <IconButton
              className="rv-play"
              aria-label={playing ? "Pause" : "Play"}
              onClick={togglePlay}
              disabled={!ready}
            >
              {playing ? <PauseRounded /> : <PlayArrowRounded />}
            </IconButton>
            <IconButton
              aria-label="Next frame"
              onClick={() => step(FRAME)}
              disabled={!ready}
            >
              <ChevronRightRounded />
            </IconButton>
            <IconButton
              aria-label="Forward 1 second"
              onClick={() => step(1)}
              disabled={!ready}
            >
              <span className="rv-jump">+1s</span>
            </IconButton>
          </div>

          <Button
            className="rv-save"
            variant="contained"
            startIcon={shareFile ? <IosShareRounded /> : <FileDownloadRounded />}
            onClick={save}
            disabled={!url}
          >
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default ReviewPlayer;
