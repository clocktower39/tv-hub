import React from "react";
import { AddRounded, RemoveRounded } from "@mui/icons-material";
import ControllerKeyButton from "../ControllerKeyButton";

// One pill with volume down on the left and volume up on the right.
function VolumeRocker() {
  return (
    <div className="rocker" role="group" aria-label="Volume">
      <ControllerKeyButton
        keyName="volume-down"
        label="Volume down"
        repeat
        className="rocker__half rocker__half--down"
        icon={<RemoveRounded />}
      />
      <span className="rocker__label" aria-hidden="true">
        VOL
      </span>
      <ControllerKeyButton
        keyName="volume-up"
        label="Volume up"
        repeat
        className="rocker__half rocker__half--up"
        icon={<AddRounded />}
      />
    </div>
  );
}

export default VolumeRocker;
