import { WebmIndex } from "./webmIndex";
import { scaledVideoStream } from "./scaledStream";

// Records an incoming MediaStream into a rolling buffer that a <video> can
// play (through MediaSource) and that can be saved as a .webm clip.
//
// One MediaRecorder produces the bytes for both. The MediaSource buffer is
// trimmed with SourceBuffer.remove(); the saved bytes are trimmed at Cluster
// boundaries found by WebmIndex, so a clip always starts on a keyframe.

const CHUNK_MS = 1000;
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
    this.sourceBuffer.mode = "segments";
    this.sourceBuffer.addEventListener("updateend", () => {
      this.currentOp = null;
      this.runOps();
    });

    this.recorder = new MediaRecorder(videoStream, {
      mimeType: this.mimeType,
      videoBitsPerSecond: 2_500_000,
      // Frequent keyframes keep clip starts and trimming fine-grained.
      // Browsers that do not know this option ignore it.
      videoKeyFrameIntervalDuration: 2000,
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
  isRecording() {
    return this.recorder?.state === "recording";
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

  destroy() {
    this.destroyed = true;
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.stop();
    }
    this.scaled?.stop();
    this.ops = [];
    URL.revokeObjectURL(this.url);
  }
}
