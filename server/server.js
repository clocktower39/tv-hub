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
  async function wakeUp() {
    await controller.dev0.turnOn();
    console.log("Turned on TV");

  }

  async function switchHDMI() {
    await controller.setActive();
    console.log("Changed TV input source");
  }

  async function sleep() {
    await controller.dev0.turnOff();
    console.log("Turned off TV");
  }

  async function moveDirection(direction) {
    switch(direction) {
      case 'up':
      case 'down':
      case 'left':
      case 'right':
        await controller.dev0.sendKey(direction);
        console.log(`Arrow ${direction}`);
        break;
      default:
        console.log('Incorrect direction submit, no action')
        break;
    }
  }

  // uncomment below if not using react app
  // app.get("/", (req, res) => {
  //   res.sendFile(path.join(__dirname, "/index.html"));
  // });

  app.get("/turn_on", (req, res) => {
    wakeUp();
    res.send("turned on tv");
  });

  app.get("/turn_off", (req, res) => {
    sleep();
    res.send("turned off tv");
  });

  app.get("/HDMIsource", (req, res) => {
    switchHDMI();
    res.send("turned on tv");
  });

  app.get("/up", (req, res) => {
    moveDirection("up")
    res.send("arrow up");
  });

  app.get("/down", (req, res) => {
    moveDirection("down")
    res.send("arrow down");
  });

  app.get("/left", (req, res) => {
    moveDirection("left")
    res.send("arrow left");
  });

  app.get("/right", (req, res) => {
    moveDirection("right")
    res.send("arrow right");
  });

  app.get("/vup", (req, res) => {
    controller.volumeUp();
    res.send("volume up");
  });

  app.get("/vdown", (req, res) => {
    controller.volumeDown();
    res.send("volume down");
  });

  io.on("connection", (socket) => {
    console.log("a user connected");
  });

  let server = http.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
  });
}
