// Re-encoding every incoming frame for the replay buffer is the most
// expensive thing the watch page does. A phone can send 4K, which a laptop
// struggles to re-encode in real time and a Raspberry Pi cannot, so the
// replay copy is scaled down first. The live picture is unaffected.

const MAX_LONG_EDGE = 1280;
const MAX_SHORT_EDGE = 720;

function fitWithin(width, height) {
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  const scale = Math.min(1, MAX_LONG_EDGE / long, MAX_SHORT_EDGE / short);
  // Encoders want even dimensions.
  const even = (n) => Math.max(2, Math.round((n * scale) / 2) * 2);
  return { width: even(width), height: even(height) };
}

// Returns { stream, stop } where stream carries the video of `source`
// scaled to fit 1280x720. The returned track ends when the source does.
export function scaledVideoStream(source) {
  const [track] = source.getVideoTracks();
  // MediaStreamTrackProcessor (Chromium) hands us each frame as it arrives.
  // Without it, record the original stream rather than poll a <video>.
  if (!track || typeof window.MediaStreamTrackProcessor === "undefined") {
    return { stream: new MediaStream(source.getVideoTracks()), stop() {} };
  }

  const processor = new window.MediaStreamTrackProcessor({ track });
  const reader = processor.readable.getReader();
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });
  // With no frame rate, the canvas track emits a frame per draw, so it keeps
  // the source's timing (including its freezes).
  const stream = canvas.captureStream();
  let stopped = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    reader.cancel().catch(() => {});
    stream.getTracks().forEach((t) => t.stop());
  };

  (async () => {
    while (!stopped) {
      const { value: frame, done } = await reader.read();
      if (done) break;
      const size = fitWithin(frame.displayWidth, frame.displayHeight);
      if (canvas.width !== size.width || canvas.height !== size.height) {
        canvas.width = size.width;
        canvas.height = size.height;
      }
      context.drawImage(frame, 0, 0, size.width, size.height);
      frame.close();
    }
  })()
    .catch((error) => console.error("Replay scaler error", error))
    .finally(stop);

  return { stream, stop };
}
