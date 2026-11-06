import React from "react";
import {
  PowerSettingsNewRounded,
  InputRounded,
  SettingsRounded,
  SkipPreviousRounded,
  FastRewindRounded,
  PlayArrowRounded,
  PauseRounded,
  FastForwardRounded,
  SkipNextRounded,
  VolumeOffRounded,
  ArrowBackRounded,
  HomeRounded,
  MenuRounded,
} from "@mui/icons-material";
import PageHeader from "../Components/PageHeader";
import ControllerKeyButton from "../Components/ControllerKeyButton";
import KeyFeedbackProvider from "../Components/remote/KeyFeedbackProvider";
import DPad from "../Components/remote/DPad";
import VolumeRocker from "../Components/remote/VolumeRocker";
import "./ControllerPage.css";

// Keys are CEC key names. Note "fast-forward" is the scan key and "forward"
// is skip to next; they are not interchangeable.
const SYSTEM_KEYS = [
  { key: "power-toggle-function", label: "Power", caption: "Power", icon: <PowerSettingsNewRounded />, className: "rkey--power" },
  { key: "input-select", label: "Input", caption: "Input", icon: <InputRounded /> },
  { key: "setup-menu", label: "TV settings", caption: "TV setup", icon: <SettingsRounded /> },
];

const NAV_KEYS = [
  { key: "exit", label: "Back", caption: "Back", icon: <ArrowBackRounded /> },
  { key: "root-menu", label: "Home", caption: "Home", icon: <HomeRounded /> },
  { key: "contents-menu", label: "Menu", caption: "Menu", icon: <MenuRounded /> },
];

const MEDIA_KEYS = [
  { key: "backward", label: "Previous", icon: <SkipPreviousRounded /> },
  { key: "rewind", label: "Rewind", icon: <FastRewindRounded /> },
  { key: "play", label: "Play", icon: <PlayArrowRounded /> },
  { key: "pause", label: "Pause", icon: <PauseRounded /> },
  { key: "fast-forward", label: "Fast forward", icon: <FastForwardRounded /> },
  { key: "forward", label: "Next", icon: <SkipNextRounded /> },
];

function CaptionedKey({ keyName, label, caption, icon, className = "" }) {
  return (
    <div className="remote__captioned">
      <ControllerKeyButton
        keyName={keyName}
        label={label}
        className={className}
        icon={icon}
      />
      <span className="remote__caption" aria-hidden="true">
        {caption}
      </span>
    </div>
  );
}

function ControllerPage() {
  return (
    <KeyFeedbackProvider>
      <div className="remote-page">
        <PageHeader />
        <main className="remote-stage">
          <div className="remote" aria-label="TV remote">
            <div className="remote__row" role="group" aria-label="TV">
              {SYSTEM_KEYS.map(({ key, ...rest }) => (
                <CaptionedKey key={key} keyName={key} {...rest} />
              ))}
            </div>

            <DPad />

            <div className="remote__row" role="group" aria-label="Menus">
              {NAV_KEYS.map(({ key, ...rest }) => (
                <CaptionedKey key={key} keyName={key} {...rest} />
              ))}
            </div>

            <div
              className="remote__row remote__row--media"
              role="group"
              aria-label="Playback"
            >
              {MEDIA_KEYS.map(({ key, label, icon }) => (
                <ControllerKeyButton
                  key={key}
                  keyName={key}
                  label={label}
                  className="rkey--small"
                  icon={icon}
                />
              ))}
            </div>

            <div className="remote__row remote__row--volume">
              <VolumeRocker />
              <ControllerKeyButton
                keyName="mute"
                label="Mute"
                icon={<VolumeOffRounded />}
              />
            </div>
          </div>
        </main>
      </div>
    </KeyFeedbackProvider>
  );
}

export default ControllerPage;
