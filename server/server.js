const path = require("path");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const http = require("http").Server(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
const cors = require("cors");
let PORT = process.env.PORT;
if (PORT == null || PORT == "") {
  PORT = 8000;
}

const CecController = require("cec-controller");
const useCec = process.env.USE_CEC !== "false";

if (useCec) {
  const cecCtl = new CecController();
  cecCtl.on("ready", readyHandler);
  cecCtl.on("error", console.error);
} else {
  console.log("CEC disabled; starting server without HDMI-CEC.");
  readyHandler({
    dev0: {
      sendKey: async () => {},
    },
  });
}

app.use(cors());
app.use(express.static(__dirname));
app.use(bodyParser.json());

function readyHandler(controller) {
  app.post('/', async (req, res) => {
    await controller.dev0.sendKey(req.body.key);
    res.send(req.body.key)
  })

  // uncomment below if not using react app
  // app.get("/", (req, res) => {
  //   res.sendFile(path.join(__dirname, "/index.html"));
  // });

  const roomBroadcasters = new Map();

  io.on("connection", (socket) => {
    console.log("a user connected");

    socket.on("webrtc:join", ({ roomId, role }) => {
      if (!roomId || !role) return;
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.role = role;

      if (role === "broadcaster") {
        roomBroadcasters.set(roomId, socket.id);
        socket.to(roomId).emit("webrtc:broadcaster-ready");
      }

      if (role === "watcher") {
        const broadcasterId = roomBroadcasters.get(roomId);
        if (broadcasterId) {
          io.to(broadcasterId).emit("webrtc:watcher-join", {
            watcherId: socket.id,
          });
          socket.emit("webrtc:broadcaster-ready");
        }
      }
    });

    socket.on("webrtc:offer", ({ targetId, sdp }) => {
      if (!targetId || !sdp) return;
      io.to(targetId).emit("webrtc:offer", { sdp, fromId: socket.id });
    });

    socket.on("webrtc:answer", ({ targetId, sdp }) => {
      if (!targetId || !sdp) return;
      io.to(targetId).emit("webrtc:answer", { sdp, fromId: socket.id });
    });

    socket.on("webrtc:ice", ({ targetId, candidate }) => {
      if (!targetId || !candidate) return;
      io.to(targetId).emit("webrtc:ice", { candidate, fromId: socket.id });
    });

    socket.on("disconnect", () => {
      const { roomId, role } = socket.data || {};
      if (!roomId) return;
      if (role === "broadcaster") {
        if (roomBroadcasters.get(roomId) === socket.id) {
          roomBroadcasters.delete(roomId);
        }
        socket.to(roomId).emit("webrtc:broadcaster-left");
      }
      if (role === "watcher") {
        const broadcasterId = roomBroadcasters.get(roomId);
        if (broadcasterId) {
          io.to(broadcasterId).emit("webrtc:watcher-left", {
            watcherId: socket.id,
          });
        }
      }
    });
  });

  let server = http.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
  });
}
