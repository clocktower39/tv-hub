import React from "react";
import {
  KeyboardArrowUpRounded,
  KeyboardArrowDownRounded,
  KeyboardArrowLeftRounded,
  KeyboardArrowRightRounded,
} from "@mui/icons-material";
import ControllerKeyButton from "../ControllerKeyButton";

const ARROWS = [
  { key: "up", label: "Up", icon: <KeyboardArrowUpRounded /> },
  { key: "right", label: "Right", icon: <KeyboardArrowRightRounded /> },
  { key: "down", label: "Down", icon: <KeyboardArrowDownRounded /> },
  { key: "left", label: "Left", icon: <KeyboardArrowLeftRounded /> },
];

// A round pad split into four wedges around a raised OK button.
function DPad() {
  return (
    <div className="dpad" role="group" aria-label="Navigation">
      {ARROWS.map(({ key, label, icon }) => (
        <ControllerKeyButton
          key={key}
          keyName={key}
          label={label}
          repeat
          className={`dpad__arrow dpad__arrow--${key}`}
          icon={icon}
        />
      ))}
      <ControllerKeyButton keyName="select" label="OK" className="dpad__ok">
        OK
      </ControllerKeyButton>
    </div>
  );
}

export default DPad;
