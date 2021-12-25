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
const cecCtl = new CecController();

cecCtl.on("ready", readyHandler);
cecCtl.on("error", console.error);

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

  io.on("connection", (socket) => {
    console.log("a user connected");
  });

  let server = http.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
  });
}