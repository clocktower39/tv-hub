// Joins complete WebM files from back-to-back MediaRecorder runs into one
// playable file. Used to save clips in Firefox, where the replay buffer is
// recorded as one short file per second (see ReplayRecorder).
//
// Each run's timestamps start near 0, so every Cluster's Timecode is shifted
// by that file's offset. Only the first file's header (EBML, Info, Tracks) is
// kept; every run records the same fixed-size canvas, so the tracks match.
// Segment and Clusters are written with "unknown size", as live WebM is, so
// nothing has to be re-measured after timecodes change length.

const ID_SEGMENT = 0x18538067;
const ID_SEEK_HEAD = 0x114d9b74;
const ID_CLUSTER = 0x1f43b675;
const ID_TIMECODE = 0xe7;
const ID_CUES = 0x1c53bb6b;
const ID_SIMPLE_BLOCK = 0xa3;

const UNKNOWN_SIZE = [0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];

function readVint(bytes, at, keepMarker) {
  const first = bytes[at];
  let length = 1;
  let mask = 0x80;
  while (length <= 8 && !(first & mask)) {
    length += 1;
    mask >>= 1;
  }
  let value = keepMarker ? first : first & (mask - 1);
  let allOnes = (first & (mask - 1)) === mask - 1;
  for (let i = 1; i < length; i += 1) {
    if (bytes[at + i] !== 0xff) allOnes = false;
    value = value * 256 + bytes[at + i];
  }
  return { value, length, unknown: !keepMarker && allOnes };
}

function idBytes(id) {
  const out = [];
  for (let v = id; v > 0; v = Math.floor(v / 256)) out.unshift(v & 0xff);
  return out;
}

function timecodeElement(ms) {
  const value = Math.max(0, Math.round(ms));
  return new Uint8Array([
    ID_TIMECODE,
    0x84, // 4-byte payload
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]);
}

// Calls visit(id, start, payloadStart, end) for each element, stepping into
// Segment and Cluster instead of over them. end is null for those two.
function walk(bytes, visit) {
  let at = 0;
  while (at < bytes.length) {
    const id = readVint(bytes, at, true);
    if (at + id.length >= bytes.length) return;
    const size = readVint(bytes, at + id.length, false);
    const payloadStart = at + id.length + size.length;
    if (id.value === ID_SEGMENT || id.value === ID_CLUSTER) {
      visit(id.value, at, payloadStart, null);
      at = payloadStart;
      continue;
    }
    const end = size.unknown ? bytes.length : payloadStart + size.value;
    if (end > bytes.length) return; // truncated final element
    visit(id.value, at, payloadStart, end);
    at = end;
  }
}

// files: [{ bytes: Uint8Array, offsetMs: number }] in playback order.
export function stitchWebm(files) {
  const parts = [];
  // Each recorder starts just before the previous one stops, so a frame or
  // two at each join can repeat a timestamp; those repeats are dropped.
  let lastFrameMs = -Infinity;
  files.forEach(({ bytes, offsetMs }, index) => {
    let inCluster = false;
    let clusterMs = 0;
    walk(bytes, (id, start, payloadStart, end) => {
      if (id === ID_CLUSTER) {
        inCluster = true;
        parts.push(new Uint8Array([...idBytes(ID_CLUSTER), ...UNKNOWN_SIZE]));
        return;
      }
      if (id === ID_SEGMENT) {
        if (index === 0) {
          parts.push(new Uint8Array([...idBytes(ID_SEGMENT), ...UNKNOWN_SIZE]));
        }
        return;
      }
      if (!inCluster) {
        // Header elements: keep the first file's, minus the SeekHead whose
        // positions would be wrong in the joined file.
        if (index === 0 && id !== ID_SEEK_HEAD) {
          parts.push(bytes.subarray(start, end));
        }
        return;
      }
      if (id === ID_TIMECODE) {
        let value = 0;
        for (let i = payloadStart; i < end; i += 1) value = value * 256 + bytes[i];
        clusterMs = value + offsetMs;
        parts.push(timecodeElement(clusterMs));
      } else if (id === ID_SIMPLE_BLOCK) {
        // Block header: track number (vint), then a signed 16-bit timecode
        // relative to the cluster.
        const track = readVint(bytes, payloadStart, false);
        const at = payloadStart + track.length;
        const relative = ((bytes[at] << 8) | bytes[at + 1]) << 16 >> 16;
        const frameMs = clusterMs + relative;
        if (frameMs <= lastFrameMs) return;
        lastFrameMs = frameMs;
        parts.push(bytes.subarray(start, end));
      } else if (id !== ID_CUES) {
        parts.push(bytes.subarray(start, end));
      }
    });
  });
  return new Blob(parts, { type: "video/webm" });
}
