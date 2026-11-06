import { WebmIndex } from "./webmIndex";
import { scaledVideoStream } from "./scaledStream";
import { stitchWebm } from "./webmStitch";

// Records an incoming MediaStream into a rolling buffer that a <video> can
// play (through MediaSource) and that can be saved as a .webm clip.
//
// Two ways of feeding the buffer, because browsers differ:
//
// Continuous (Chrome, Edge): one MediaRecorder hands over 1 s chunks that go
// straight into MediaSource. Saved clips are cut at Cluster boundaries found
// by WebmIndex, so a clip always starts on a keyframe.
//
// Segmented (Firefox): Firefox's MediaSource cannot play its own
// MediaRecorder output. It keeps only the first second or two after each
// keyframe, and Firefox's recorder puts a keyframe only every ~7 s and
// ignores requests for more. So a new MediaRecorder takes over every second;
// each finished one is a complete file starting on a keyframe, which Firefox
// buffers fully, and "sequence" mode lays them end to end. Saved clips join
// those files with stitchWebm.
//
// Either way the MediaSource buffer is trimmed with SourceBuffer.remove().

const CHUNK_MS = 1000;
const SEGMENT_MS = 1000;
const RECORDER_OPTIONS = {
  videoBitsPerSecond: 2_500_000,
  // Frequent keyframes keep clip starts and trimming fine-grained.
  // Browsers that do not know this option ignore it.
  videoKeyFrameIntervalDuration: 2000,
};

function needsSegments() {
  return /Firefox\//.test(navigator.userAgent);
}
const MIME_CANDIDATES = [
  // VP8 is the cheapest to encode on a Raspberry Pi.
  "video/webm;codecs=vp8",
  "video/webm;codecs=vp9",
  "video/webm",
];

export function pickReplayMimeType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaSource === "undefined") {
    return null;
  }
  return (
    MIME_CANDIDATES.find(
      (type) =>
        MediaRecorder.isTypeSupported(type) && MediaSource.isTypeSupported(type)
    ) ?? null
  );
}

export class ReplayRecorder {
  constructor(stream, { bufferSeconds, mimeType }) {
    this.bufferSeconds = bufferSeconds;
    this.mimeType = mimeType;
    this.index = new WebmIndex();
    this.chunks = []; // { offset, size, blob }
    this.bytesSeen = 0;
    this.header = null;
    this.ops = [];
    this.currentOp = null;
    this.ingesting = Promise.resolve();
    this.destroyed = false;
    this.segmented = needsSegments();
    // Paused while the phone shows its Review screen, so the review is not
    // recorded as camera footage.
    this.paused = false;
    this.sourceTrack = stream.getVideoTracks()[0];
    this.segments = []; // segmented mode: { blob, start, end } in media seconds

    this.mediaSource = new MediaSource();
    this.url = URL.createObjectURL(this.mediaSource);
    this.mediaSource.addEventListener(
      "sourceopen",
      () => {
        if (this.destroyed) return;
        this.scaled = scaledVideoStream(stream);
        this.start(this.scaled.stream);
      },
      { once: true }
    );
  }

  start(videoStream) {
    if (this.destroyed) return;
    this.sourceBuffer = this.mediaSource.addSourceBuffer(this.mimeType);
    this.sourceBuffer.mode = this.segmented ? "sequence" : "segments";
    this.sourceBuffer.addEventListener("updateend", () => {
      const op = this.currentOp;
      this.currentOp = null;
      op?.onAppended?.(op.before, this.range()?.end ?? 0);
      this.runOps();
    });
    if (this.segmented) this.startSegments(videoStream);
    else this.startContinuous(videoStream);
  }

  startContinuous(videoStream) {
    this.recorder = new MediaRecorder(videoStream, {
      mimeType: this.mimeType,
      ...RECORDER_OPTIONS,
    });
    this.recorder.addEventListener("dataavailable", ({ data }) => {
      if (!data.size) return;
      this.ingesting = this.ingesting
        .then(() => data.arrayBuffer())
        .then((buffer) => this.ingest(data, buffer))
        .catch((error) => console.error("Replay buffer error", error));
    });
    this.recorder.start(CHUNK_MS);
  }

  startSegments(videoStream) {
    const begin = () => {
      const recorder = new MediaRecorder(videoStream, {
        mimeType: this.mimeType,
        ...RECORDER_OPTIONS,
      });
      const parts = [];
      recorder.addEventListener("dataavailable", ({ data }) => {
        if (data.size) parts.push(data);
      });
      recorder.addEventListener("stop", () => {
        const blob = new Blob(parts, { type: "video/webm" });
        if (!blob.size) return;
        this.ingesting = this.ingesting
          .then(() => blob.arrayBuffer())
          .then((buffer) => this.ingestSegment(blob, buffer))
          .catch((error) => console.error("Replay buffer error", error));
      });
      recorder.start();
      return recorder;
    };
    this.beginSegment = begin;

    this.recorder = begin();
    this.segmentTimer = setInterval(() => {
      const ended = videoStream
        .getVideoTracks()
        .every((track) => track.readyState === "ended");
      if (this.destroyed || ended) {
        // An ended track stops its recorder by itself.
        clearInterval(this.segmentTimer);
        return;
      }
      const previous = this.recorder;
      if (this.paused) {
        if (previous.state !== "inactive") previous.stop();
        return;
      }
      // Start the next recorder before stopping this one so no frame falls
      // between them.
      this.recorder = begin();
      if (previous.state !== "inactive") previous.stop();
    }, SEGMENT_MS);
  }

  ingestSegment(blob, buffer) {
    if (this.destroyed) return;
    const segment = { blob, start: null, end: null };
    this.segments.push(segment);
    this.bytesSeen += blob.size;
    this.ops.push({
      type: "append",
      buffer,
      onAppended: (before, after) => {
        segment.start = before;
        segment.end = after;
      },
    });
    this.trim();
    this.runOps();
  }

  ingest(blob, buffer) {
    if (this.destroyed) return;
    this.chunks.push({ offset: this.bytesSeen, size: blob.size, blob });
    this.bytesSeen += blob.size;
    this.index.push(new Uint8Array(buffer));

    if (!this.header && this.index.headerEnd !== null) {
      this.header = new Blob(this.chunks.map((c) => c.blob)).slice(
        0,
        this.index.headerEnd
      );
    }

    this.ops.push({ type: "append", buffer });
    this.trim();
    this.runOps();
  }

  runOps() {
    const sourceBuffer = this.sourceBuffer;
    if (
      this.destroyed ||
      !sourceBuffer ||
      sourceBuffer.updating ||
      this.mediaSource.readyState !== "open"
    ) {
      return;
    }
    const op = this.ops.shift();
    if (!op) return;

    this.currentOp = op;
    try {
      op.before = this.range()?.end ?? 0;
      if (op.type === "append") sourceBuffer.appendBuffer(op.buffer);
      else sourceBuffer.remove(op.start, op.end);
    } catch (error) {
      this.currentOp = null;
      const range = this.range();
      if (error.name === "QuotaExceededError" && op.type === "append" && range) {
        // The browser ran out of room before our own limit; drop the oldest
        // 30 seconds, then retry the append.
        this.ops.unshift(
          { type: "remove", start: 0, end: range.start + 30 },
          op
        );
        this.runOps();
      } else {
        console.error("Replay buffer error", error);
      }
    }
  }

  hasPendingRemove() {
    return (
      this.currentOp?.type === "remove" ||
      this.ops.some((op) => op.type === "remove")
    );
  }

  // False once the stream has ended (the phone stopped or reconnected).
  // Still true while paused.
  isRecording() {
    return Boolean(this.recorder) && this.sourceTrack?.readyState === "live";
  }

  setPaused(paused) {
    if (this.paused === paused || !this.recorder) {
      this.paused = paused;
      return;
    }
    this.paused = paused;
    if (this.segmented) {
      // Pausing ends the current segment now; resuming starts a fresh one.
      if (paused && this.recorder.state !== "inactive") {
        this.recorder.stop();
      } else if (!paused && this.recorder.state === "inactive" && this.isRecording()) {
        this.recorder = this.beginSegment();
      }
    } else if (paused && this.recorder.state === "recording") {
      this.recorder.pause();
    } else if (!paused && this.recorder.state === "paused") {
      this.recorder.resume();
    }
  }

  // Buffered span in media seconds, as used by the replay <video>.
  range() {
    const buffered = this.sourceBuffer?.buffered;
    if (!buffered || buffered.length === 0) return null;
    return { start: buffered.start(0), end: buffered.end(buffered.length - 1) };
  }

  trim() {
    const range = this.range();
    if (!range) return;
    const cutoff = range.end - this.bufferSeconds;

    if (range.start < cutoff - 1 && !this.hasPendingRemove()) {
      this.ops.push({ type: "remove", start: 0, end: cutoff });
    }

    if (this.segmented) {
      // Keep the segment that straddles the cutoff so the whole window stays
      // saveable.
      this.segments = this.segments.filter(
        (segment) => segment.end === null || segment.end > cutoff
      );
      return;
    }

    // Keep saved bytes from the last clip start at or before the cutoff, so
    // the whole window stays saveable.
    const keep = this.index
      .startPoints()
      .filter((point) => point.timeMs / 1000 <= cutoff)
      .pop();
    if (keep) {
      this.chunks = this.chunks.filter((c) => c.offset + c.size > keep.offset);
      this.index.dropBefore(keep.offset);
    }
  }

  setBufferSeconds(seconds) {
    this.bufferSeconds = seconds;
    this.trim();
    this.runOps();
  }

  // Flush the recorder so a saved clip runs right up to now.
  async flush() {
    if (this.recorder?.state === "recording") {
      const flushed = new Promise((resolve) =>
        this.recorder.addEventListener("dataavailable", resolve, { once: true })
      );
      this.recorder.requestData();
      await flushed;
    }
    await this.ingesting;
  }

  // Returns a playable .webm Blob of roughly the last `seconds` seconds
  // (starting at the nearest keyframe before that point), or null.
  async save(seconds) {
    if (this.segmented) return this.saveSegments(seconds);
    await this.flush();
    const points = this.index.startPoints();
    if (!this.header || points.length === 0 || this.chunks.length === 0) {
      return null;
    }
    const lastMs = points[points.length - 1].timeMs;
    const endMs = Math.max(lastMs, (this.range()?.end ?? 0) * 1000);
    const fromMs = endMs - seconds * 1000;
    const start =
      points.filter((point) => point.timeMs <= fromMs).pop() ?? points[0];

    const body = new Blob(this.chunks.map((c) => c.blob)).slice(
      start.offset - this.chunks[0].offset
    );
    return {
      blob: new Blob([this.header, body], { type: "video/webm" }),
      seconds: (endMs - start.timeMs) / 1000,
    };
  }

  // Segmented mode: join the finished segments that cover the last
  // `seconds` seconds. The one still recording (under a second) is left out.
  async saveSegments(seconds) {
    await this.ingesting;
    const done = this.segments.filter((segment) => segment.end !== null);
    if (done.length === 0) return null;
    const end = done[done.length - 1].end;
    const picked = done.filter((segment) => segment.end > end - seconds);
    const base = picked[0].start;
    const buffers = await Promise.all(
      picked.map((segment) => segment.blob.arrayBuffer())
    );
    return {
      blob: stitchWebm(
        buffers.map((buffer, i) => ({
          bytes: new Uint8Array(buffer),
          offsetMs: (picked[i].start - base) * 1000,
        }))
      ),
      seconds: end - base,
    };
  }

  destroy() {
    this.destroyed = true;
    clearInterval(this.segmentTimer);
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.stop();
    }
    this.scaled?.stop();
    this.ops = [];
    URL.revokeObjectURL(this.url);
  }
}
