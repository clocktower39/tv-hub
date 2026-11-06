require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const CecController = require("cec-controller");

const PORT = process.env.PORT || 8000;
const useCec = process.env.USE_CEC !== "false";

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());

// --- HDMI-CEC -------------------------------------------------------------

// Set once cec-client reports ready. Until then key presses get a 503 instead
// of the whole server waiting on the TV.
let cecDevice = null;

if (useCec) {
  const cecCtl = new CecController();
  cecCtl.on("ready", (controller) => {
    cecDevice = controller.dev0;
    console.log("HDMI-CEC ready.");
  });
  cecCtl.on("error", console.error);
} else {
  console.log("CEC disabled; key presses will be logged only.");
  cecDevice = {
    sendKey: async (key) => console.log(`[CEC disabled] ${key}`),
  };
}

async function handleKey(req, res) {
  const key = req.body?.key;
  if (typeof key !== "string" || key.length === 0) {
    return res.status(400).json({ error: "body must be { key: string }" });
  }
  if (!cecDevice) {
    return res.status(503).json({ error: "HDMI-CEC not ready" });
  }
  try {
    await cecDevice.sendKey(key);
    res.json({ key });
  } catch (error) {
    console.error(`Failed to send key ${key}`, error);
    res.status(500).json({ error: String(error?.message || error) });
  }
}

// --- TURN relay credentials ----------------------------------------------
//
// When two devices can't reach each other directly (another subnet, guest
// Wi-Fi with client isolation, Firefox unable to resolve the other side's
// hidden .local address), WebRTC falls back to a TURN relay on the Pi
// (coturn, see deploy/coturn/). coturn's "use-auth-secret" mode checks
// short-lived credentials made from a shared secret, so nothing long-lived
// reaches the browser. The page builds the relay address from the host it
// was loaded from, so this works on any network without configuration.
const TURN_SECRET = process.env.TURN_SECRET || "";
const TURN_PORT = Number(process.env.TURN_PORT || 3478);
const TURN_TTL_SECONDS = 12 * 60 * 60;

app.get("/api/ice", (req, res) => {
  if (!TURN_SECRET) return res.json({ turn: null });
  const expires = Math.floor(Date.now() / 1000) + TURN_TTL_SECONDS;
  const username = `${expires}:tv-hub`;
  const credential = crypto
    .createHmac("sha1", TURN_SECRET)
    .update(username)
    .digest("base64");
  res.json({ turn: { port: TURN_PORT, username, credential, expires } });
});

// Lets the UI show whether key presses will reach the TV.
app.get("/api/status", (req, res) => {
  let cec = "starting";
  if (!useCec) cec = "disabled";
  else if (cecDevice) cec = "ready";
  res.json({ cec });
});

app.post("/api/key", handleKey);
// Older clients POST to the root.
app.post("/", handleKey);

// --- WebRTC signalling ----------------------------------------------------
//
// One broadcaster (the phone) per room and any number of watchers. Whichever
// side joins first, the broadcaster is told about every watcher and creates
// one peer connection per watcher.

const roomBroadcasters = new Map(); // roomId -> socket id
// Rooms whose broadcaster is showing its Review screen instead of the camera,
// so watchers that join mid-review know to show it as a review.
const roomsInReview = new Set();

function watchersIn(roomId) {
  const ids = io.sockets.adapter.rooms.get(roomId) || new Set();
  return [...ids].filter(
    (id) => io.sockets.sockets.get(id)?.data.role === "watcher"
  );
}

function relay(event) {
  return (socket) =>
    socket.on(event, ({ targetId, ...payload } = {}) => {
      if (!targetId) return;
      io.to(targetId).emit(event, { ...payload, fromId: socket.id });
    });
}
const relays = ["webrtc:offer", "webrtc:answer", "webrtc:ice"].map(relay);

io.on("connection", (socket) => {
  relays.forEach((attach) => attach(socket));

  socket.on("webrtc:join", ({ roomId, role } = {}) => {
    if (!roomId || !["broadcaster", "watcher"].includes(role)) return;
    if (socket.data.roomId) return; // one join per socket
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.role = role;

    if (role === "broadcaster") {
      const previous = roomBroadcasters.get(roomId);
      if (previous && previous !== socket.id) {
        io.to(previous).emit("webrtc:replaced");
      }
      roomBroadcasters.set(roomId, socket.id);
      if (roomsInReview.delete(roomId)) {
        socket.to(roomId).emit("webrtc:review", { active: false });
      }
      for (const watcherId of watchersIn(roomId)) {
        socket.emit("webrtc:watcher-join", { watcherId });
      }
    } else {
      const broadcasterId = roomBroadcasters.get(roomId);
      if (broadcasterId) {
        io.to(broadcasterId).emit("webrtc:watcher-join", {
          watcherId: socket.id,
        });
      }
      if (roomsInReview.has(roomId)) {
        socket.emit("webrtc:review", { active: true });
      }
    }
  });

  // The broadcaster opened or closed its Review screen.
  socket.on("webrtc:review", ({ active } = {}) => {
    const { roomId, role } = socket.data;
    if (role !== "broadcaster" || roomBroadcasters.get(roomId) !== socket.id) {
      return;
    }
    if (active) roomsInReview.add(roomId);
    else roomsInReview.delete(roomId);
    socket.to(roomId).emit("webrtc:review", { active: Boolean(active) });
  });

  socket.on("disconnect", () => {
    const { roomId, role } = socket.data;
    if (!roomId) return;
    if (role === "broadcaster") {
      if (roomBroadcasters.get(roomId) === socket.id) {
        roomBroadcasters.delete(roomId);
        roomsInReview.delete(roomId);
        socket.to(roomId).emit("webrtc:broadcaster-left");
      }
    } else {
      const broadcasterId = roomBroadcasters.get(roomId);
      if (broadcasterId) {
        io.to(broadcasterId).emit("webrtc:watcher-left", {
          watcherId: socket.id,
        });
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
