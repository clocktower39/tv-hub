const CecController = require("cec-controller");
const cecCtl = new CecController();

cecCtl.on("ready", readyHandler);
cecCtl.on("error", console.error);

function readyHandler(controller) {

  console.log(controller.getKeyNames());
  // does not detect volume on old samsung and new phillips google tv
  cecCtl.on("keypress", (keyName) => console.log(`User pressed: ${keyName}`));
  console.log('running')
}
