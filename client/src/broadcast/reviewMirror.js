// While the coach reviews a clip on the phone, the TV shows the same thing:
// the Review screen's video is copied onto a canvas every frame and the
// canvas becomes the track sent to every watcher (replaceTrack, so nobody
// reconnects). Scrubbing, frame steps and slow motion therefore appear on
// the TV exactly as on the phone. A canvas is used because iPhone Safari can
// capture a canvas but not a <video> element.

const MAX_LONG_EDGE = 1280;
const FPS = 30;

export const canMirrorReview =
  typeof document !== "undefined" &&
  typeof document.createElement("canvas").captureStream === "function";

// getVideo returns the Review screen's current <video> (it is replaced when
// the coach switches between clips). Returns { track, stop }.
export function startReviewMirror(getVideo) {
  const canvas = document.createElement("canvas");
  canvas.width = MAX_LONG_EDGE;
  canvas.height = Math.round((MAX_LONG_EDGE * 9) / 16);
  const context = canvas.getContext("2d", { alpha: false });
  const stream = canvas.captureStream(FPS);
  const [track] = stream.getVideoTracks();
  let frame = 0;

  const draw = () => {
    const video = getVideo();
    if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const { videoWidth: width, videoHeight: height } = video;
      if (width && height) {
        const scale = Math.min(1, MAX_LONG_EDGE / Math.max(width, height));
        const w = Math.round((width * scale) / 2) * 2;
        const h = Math.round((height * scale) / 2) * 2;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        context.drawImage(video, 0, 0, w, h);
      }
    }
    // Drawn even while paused, so a watcher that joins mid-review still gets
    // the frame the coach is looking at.
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);

  return {
    track,
    stop() {
      cancelAnimationFrame(frame);
      track.stop();
    },
  };
}
