require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
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
    }
  });

  socket.on("disconnect", () => {
    const { roomId, role } = socket.data;
    if (!roomId) return;
    if (role === "broadcaster") {
      if (roomBroadcasters.get(roomId) === socket.id) {
        roomBroadcasters.delete(roomId);
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
