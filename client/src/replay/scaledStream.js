// The replay buffer records a copy of the phone's video at one fixed size.
//
// Re-encoding every incoming frame is the most expensive thing the watch page
// does, and a phone can send 4K. The incoming size also changes on its own
// (WebRTC ramps resolution up and down, and the phone rotates between
// portrait and landscape). Chrome's recorder copes with that, but Firefox's
// leaves holes in the recording at every change. Fitting each frame into a
// fixed 1280x720 canvas (black bars as needed) avoids both problems. The live
// picture is unaffected.

const WIDTH = 1280;
const HEIGHT = 720;
// Firefox fallback: how often to copy the hidden <video> onto the canvas.
const FALLBACK_FPS = 30;

function passThrough(source) {
  return {
    stream: new MediaStream(source.getVideoTracks()),
    stop() {},
  };
}

// Returns { stream, stop }: `stream` carries `source`'s video fitted
// into WIDTH x HEIGHT. Its track ends when the source track does.
export function scaledVideoStream(source) {
  const [track] = source.getVideoTracks();
  const hasProcessor = typeof window.MediaStreamTrackProcessor !== "undefined";
  const canvas = document.createElement("canvas");
  const context = canvas.getContext?.("2d", { alpha: false });
  if (!track || !context || typeof canvas.captureStream !== "function") {
    return passThrough(source);
  }

  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  // With no frame rate, the canvas track emits a frame per draw, so it keeps
  // the source's timing.
  const stream = canvas.captureStream();
  let lastSize = "";
  let stopped = false;
  let cleanup = () => {};

  const draw = (image, width, height) => {
    if (!width || !height) return;
    const scale = Math.min(WIDTH / width, HEIGHT / height);
    const drawWidth = Math.round(width * scale);
    const drawHeight = Math.round(height * scale);
    const size = `${width}x${height}`;
    if (size !== lastSize) {
      // New shape: clear what the old one left in the bars.
      context.fillStyle = "#000";
      context.fillRect(0, 0, WIDTH, HEIGHT);
      lastSize = size;
    }
    context.drawImage(
      image,
      (WIDTH - drawWidth) / 2,
      (HEIGHT - drawHeight) / 2,
      drawWidth,
      drawHeight
    );
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    cleanup();
    stream.getTracks().forEach((t) => t.stop());
  };
  track.addEventListener("ended", stop);

  if (hasProcessor) {
    // Chromium hands us each frame as it arrives, so frame timing (and any
    // freeze on the phone) carries through exactly.
    const processor = new window.MediaStreamTrackProcessor({ track });
    const reader = processor.readable.getReader();
    cleanup = () => reader.cancel().catch(() => {});
    (async () => {
      while (!stopped) {
        const { value: frame, done } = await reader.read();
        if (done) break;
        draw(frame, frame.displayWidth, frame.displayHeight);
        frame.close();
      }
    })()
      .catch((error) => console.error("Replay scaler error", error))
      .finally(stop);
  } else {
    // Firefox: play the track in a hidden <video> and copy its current
    // frame. A frozen phone picture is copied as repeated frames, so the
    // recording keeps growing at the normal rate.
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = new MediaStream([track]);
    video.play().catch(() => {});
    const id = setInterval(() => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        draw(video, video.videoWidth, video.videoHeight);
      }
    }, 1000 / FALLBACK_FPS);
    cleanup = () => {
      clearInterval(id);
      video.srcObject = null;
    };
  }

  return { stream, stop };
}
