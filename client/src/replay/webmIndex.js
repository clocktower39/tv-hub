// Streaming index over the WebM bytes MediaRecorder produces.
//
// MediaRecorder's chunks are arbitrary byte splits, so a clip cannot start at
// any chunk. A playable clip is the stream header (everything before the
// first Cluster) followed by the bytes from a Cluster whose first frame is a
// keyframe. This parser finds those Cluster offsets and their timestamps
// without copying the media data.

const ID_SEGMENT = 0x18538067;
const ID_CLUSTER = 0x1f43b675;
const ID_TIMECODE = 0xe7;
const ID_SIMPLE_BLOCK = 0xa3;

// Containers we step into rather than skip. Segment and Cluster are usually
// written with an unknown size by a live muxer.
const CONTAINERS = new Set([ID_SEGMENT, ID_CLUSTER]);

function readVint(bytes, at, keepMarker) {
  if (at >= bytes.length) return null;
  const first = bytes[at];
  let length = 1;
  let mask = 0x80;
  while (length <= 8 && !(first & mask)) {
    length += 1;
    mask >>= 1;
  }
  if (length > 8 || at + length > bytes.length) return null;

  let value = keepMarker ? first : first & (mask - 1);
  let allOnes = (first & (mask - 1)) === mask - 1;
  for (let i = 1; i < length; i += 1) {
    const byte = bytes[at + i];
    if (byte !== 0xff) allOnes = false;
    value = value * 256 + byte;
  }
  return { value, length, unknown: !keepMarker && allOnes };
}

export class WebmIndex {
  constructor() {
    this.pending = new Uint8Array(0);
    this.pendingOffset = 0; // stream offset of pending[0]
    this.skipBytes = 0;
    this.headerEnd = null; // offset of the first Cluster
    this.clusters = []; // { offset, timeMs, keyframe }
  }

  // Feed the next chunk of the stream, in order.
  push(chunk) {
    const merged = new Uint8Array(this.pending.length + chunk.length);
    merged.set(this.pending);
    merged.set(chunk, this.pending.length);
    let at = 0;

    while (at < merged.length) {
      if (this.skipBytes > 0) {
        const step = Math.min(this.skipBytes, merged.length - at);
        this.skipBytes -= step;
        at += step;
        continue;
      }

      const id = readVint(merged, at, true);
      if (!id) break;
      const size = readVint(merged, at + id.length, false);
      if (!size) break;
      const headerLength = id.length + size.length;
      const offset = this.pendingOffset + at;
      const cluster = this.clusters[this.clusters.length - 1];

      if (id.value === ID_CLUSTER) {
        if (this.headerEnd === null) this.headerEnd = offset;
        this.clusters.push({ offset, timeMs: null, keyframe: null });
        at += headerLength;
      } else if (CONTAINERS.has(id.value)) {
        at += headerLength;
      } else if (id.value === ID_TIMECODE && cluster) {
        if (at + headerLength + size.value > merged.length) break;
        let value = 0;
        for (let i = 0; i < size.value; i += 1) {
          value = value * 256 + merged[at + headerLength + i];
        }
        cluster.timeMs = value;
        at += headerLength + size.value;
      } else if (id.value === ID_SIMPLE_BLOCK && cluster) {
        if (cluster.keyframe === null) {
          // Block header: track number (vint), int16 timecode, flags byte.
          const track = readVint(merged, at + headerLength, false);
          const flagsAt = at + headerLength + (track ? track.length : 0) + 2;
          if (!track || flagsAt >= merged.length) break;
          cluster.keyframe = Boolean(merged[flagsAt] & 0x80);
        }
        at += headerLength;
        this.skipBytes = size.value;
      } else if (size.unknown) {
        // An unknown-size element we do not model; step inside it.
        at += headerLength;
      } else {
        at += headerLength;
        this.skipBytes = size.value;
      }
    }

    this.pending = merged.slice(at);
    this.pendingOffset += at;
  }

  // Clusters that can start a playable clip.
  startPoints() {
    return this.clusters.filter((c) => c.keyframe && c.timeMs !== null);
  }

  // Forget clusters before `offset` (the data was dropped).
  dropBefore(offset) {
    this.clusters = this.clusters.filter((c) => c.offset >= offset);
  }
}
