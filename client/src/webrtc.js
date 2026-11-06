export const ROOM_ID = "live";

// Public STUN only helps across the internet; on a LAN peers connect directly
// or through the Pi's TURN relay below.
const STUN_SERVERS = [
  {
    urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
  },
];

let cached = null; // { key, iceServers, expires }

// ICE servers for a new RTCPeerConnection. Adds the Pi's TURN relay when the
// server has one configured (GET /api/ice), so devices that can't reach each
// other directly still connect. The relay lives on the same machine as the
// app, so its address is the host this page (or the configured server URL)
// was loaded from.
export async function getIceServers(apiBase) {
  const host = apiBase ? new URL(apiBase).hostname : window.location.hostname;
  const now = Date.now() / 1000;
  if (cached && cached.key === `${apiBase}|${host}` && cached.expires - 60 > now) {
    return cached.iceServers;
  }
  try {
    const response = await fetch(`${apiBase}/api/ice`, { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    const { turn } = await response.json();
    if (!turn) {
      cached = { key: `${apiBase}|${host}`, iceServers: STUN_SERVERS, expires: now + 300 };
      return STUN_SERVERS;
    }
    const address = host.includes(":") ? `[${host}]` : host;
    const iceServers = [
      ...STUN_SERVERS,
      {
        urls: [
          `turn:${address}:${turn.port}?transport=udp`,
          `turn:${address}:${turn.port}?transport=tcp`,
        ],
        username: turn.username,
        credential: turn.credential,
      },
    ];
    cached = { key: `${apiBase}|${host}`, iceServers, expires: turn.expires };
    return iceServers;
  } catch {
    // Server unreachable or older: direct connections still work on a LAN.
    return STUN_SERVERS;
  }
}
