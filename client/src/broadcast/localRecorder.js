// Records the phone's own camera track to local files for Review.
//
// Recording runs in segments, each one a complete file from its own
// MediaRecorder, so a plain <video src=blobURL> can play and seek it. cut()
// ends the current segment (everything since the last cut) and starts the next
// one straight away, so nothing filmed afterwards is missed. A segment also
// ends when it passes MAX_SEGMENT_MS, when the camera track is replaced, or
// when the frame size changes. Only the last finished segment is kept, so
// memory holds at most two finished files plus the one being recorded.

const MIME_TYPES = [
  // H.264 MP4 plays everywhere, Photos and QuickTime included. Chrome's plain
  // "video/mp4" may pick VP9, so ask for avc1 first.
  "video/mp4;codecs=avc1",
  "video/mp4", // iPhone Safari
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];
const VIDEO_BITS_PER_SECOND = 8_000_000;
const MAX_SEGMENT_MS = 3 * 60 * 1000;
// Shorter than this is a stray tap, not a clip worth offering.
const MIN_CLIP_MS = 300;
const CHUNK_MS = 1000;
const KEEP_PREVIOUS_MS = 3000;

export const supportsLocalRecording =
  typeof window !== "undefined" &&
  typeof window.MediaRecorder === "function" &&
  typeof window.MediaStream === "function";

function pickMimeType() {
  if (!supportsLocalRecording) return "";
  if (typeof MediaRecorder.isTypeSupported !== "function") return "";
  // An empty string lets the browser choose its own format.
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function frameSize(track) {
  const { width, height } = track.getSettings();
  return `${width}x${height}`;
}

export class LocalRecorder {
  constructor() {
    this.mimeType = pickMimeType();
    this.current = null; // the segment being recorded
    this.previous = null; // the last finished clip
    this.chain = Promise.resolve(); // finished segments settle in order
    this.disposed = false;
    this.timer = setInterval(() => this.checkRollover(), 1000);
  }

  // Records `track`, ending the current segment first if it is another track.
  follow(track) {
    if (this.disposed || !track) return;
    if (this.current?.track === track) return;
    this.rollover(track);
  }

  // Ends the current segment and keeps recording `track` in a new one.
  // Resolves to { latest, previous }: the clip just ended and the one before.
  cut(track) {
    const segment = this.current;
    this.current = null;
    this.startSegment(track ?? segment?.track);
    return this.settle(async () => {
      const latest = segment ? await this.finish(segment) : null;
      const previous = this.previous;
      if (latest) this.previous = latest;
      return { latest, previous };
    });
  }

  dispose() {
    this.disposed = true;
    clearInterval(this.timer);
    const segment = this.current;
    this.current = null;
    this.previous = null;
    if (segment && segment.recorder.state !== "inactive") {
      segment.recorder.ondataavailable = null;
      segment.recorder.stop();
    }
  }

  // --- internals ---------------------------------------------------------

  settle(task) {
    const result = this.chain.then(task);
    this.chain = result.catch(() => {});
    return result;
  }

  rollover(track) {
    const segment = this.current;
    this.current = null;
    this.startSegment(track);
    if (segment) this.keepPrevious(segment);
  }

  // A segment cut short by a camera change becomes the previous clip, unless
  // it is only a few seconds long and a real clip is already kept.
  keepPrevious(segment) {
    this.settle(async () => {
      const clip = await this.finish(segment);
      if (!clip || this.disposed) return;
      const short = clip.endedAt - clip.startedAt < KEEP_PREVIOUS_MS;
      if (!short || !this.previous) this.previous = clip;
    });
  }

  checkRollover() {
    const segment = this.current;
    if (!segment || segment.track.readyState !== "live") return;
    const tooLong = Date.now() - segment.startedAt > MAX_SEGMENT_MS;
    // One frame size per file: players handle that everywhere.
    if (tooLong || frameSize(segment.track) !== segment.size) {
      this.rollover(segment.track);
    }
  }

  startSegment(track) {
    if (this.disposed || !track || track.readyState !== "live") return;
    let recorder;
    try {
      recorder = new MediaRecorder(new MediaStream([track]), {
        ...(this.mimeType ? { mimeType: this.mimeType } : {}),
        videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
      });
    } catch (error) {
      console.warn("Local recording unavailable", error);
      return;
    }
    const segment = {
      recorder,
      track,
      chunks: [],
      size: frameSize(track),
      startedAt: Date.now(),
      endedAt: null,
    };
    recorder.ondataavailable = (event) => {
      if (event.data?.size) segment.chunks.push(event.data);
    };
    segment.done = new Promise((resolve) => {
      recorder.onstop = () => {
        segment.endedAt = Date.now();
        resolve(this.toClip(segment));
        // Stopped by itself: the track ended or the encoder gave up.
        if (this.current === segment) {
          this.current = null;
          this.keepPrevious(segment);
          const ranLongEnough = segment.endedAt - segment.startedAt > 2000;
          if (ranLongEnough) this.startSegment(track);
        }
      };
    });
    recorder.onerror = (event) => {
      console.warn("Local recording error", event.error ?? event);
      if (recorder.state !== "inactive") recorder.stop();
    };
    recorder.start(CHUNK_MS);
    this.current = segment;
  }

  finish(segment) {
    if (segment.recorder.state !== "inactive") segment.recorder.stop();
    return segment.done;
  }

  toClip(segment) {
    const length = segment.endedAt - segment.startedAt;
    if (!segment.chunks.length || length < MIN_CLIP_MS) return null;
    const mimeType =
      segment.recorder.mimeType || segment.chunks[0].type || this.mimeType;
    return {
      blob: new Blob(segment.chunks, { type: mimeType.split(";")[0] }),
      mimeType,
      startedAt: segment.startedAt,
      endedAt: segment.endedAt,
    };
  }
}
