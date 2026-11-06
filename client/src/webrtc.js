export const ROOM_ID = "live";

// On a home LAN peers connect directly; STUN only matters across networks.
export const ICE_SERVERS = [
  {
    urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
  },
];
