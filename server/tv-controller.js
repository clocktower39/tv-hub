var CecController = require("cec-controller");
var cecCtl = new CecController();
const { turnOnRoute } = require('./server');

cecCtl.on("ready", readyHandler);
cecCtl.on("error", console.error);

function readyHandler(controller) {
  async function wakeUp() {
      await controller.dev0.turnOn();
      console.log("Turned on TV");

      await controller.setActive();
      console.log("Changed TV input source");
  };

  // does not detect volume on old samsung and new phillips google tv
  cecCtl.on("keypress", (keyName) => console.log(`User pressed: ${keyName}`));
}
