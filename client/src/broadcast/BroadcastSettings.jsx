import React from "react";
import {
  FormControlLabel,
  IconButton,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import {
  BITRATES,
  FACING_MODES,
  MOTION_MODES,
  ORIENTATIONS,
} from "./settings";
import {
  availableFrameRates,
  availableResolutions,
  supportsContentHint,
  supportsSenderParameters,
} from "./capture";
import { supportsWakeLock } from "./useWakeLock";

function Choice({ label, hint, value, options, onChange }) {
  return (
    <div className="bc-setting">
      <div className="bc-setting-label">
        {label}
        {hint && <span className="bc-setting-hint">{hint}</span>}
      </div>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={value}
        onChange={(_, next) => {
          if (next !== null) onChange(next);
        }}
      >
        {options.map((option) => (
          <ToggleButton key={option.value} value={option.value}>
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}

function BroadcastSettings({ settings, onChange, caps, cameraCount, onClose }) {
  const resolutions = availableResolutions(caps);
  const frameRates = availableFrameRates(caps).map((rate) => ({
    value: rate,
    label: `${rate}`,
  }));

  return (
    <div className="bc-settings">
      <div className="bc-settings-header">
        <span>Camera &amp; quality</span>
        <IconButton size="small" onClick={onClose} aria-label="Close settings">
          <Close />
        </IconButton>
      </div>

      {cameraCount !== 1 && (
        <Choice
          label="Camera"
          value={settings.facingMode}
          options={FACING_MODES}
          onChange={(value) => onChange("facingMode", value)}
        />
      )}
      <Choice
        label="Orientation"
        hint="shape of the video sent to the TV"
        value={settings.orientation}
        options={ORIENTATIONS}
        onChange={(value) => onChange("orientation", value)}
      />
      <Choice
        label="Resolution"
        value={settings.resolution}
        options={resolutions}
        onChange={(value) => onChange("resolution", value)}
      />
      <Choice
        label="Frame rate"
        hint="fps"
        value={settings.frameRate}
        options={frameRates}
        onChange={(value) => onChange("frameRate", value)}
      />
      {supportsSenderParameters && (
        <Choice
          label="Max bitrate"
          hint="lower = less Wi-Fi, softer picture"
          value={settings.maxBitrate}
          options={BITRATES}
          onChange={(value) => onChange("maxBitrate", value)}
        />
      )}
      {(supportsSenderParameters || supportsContentHint) && (
        <Choice
          label="Prefer"
          hint="what to keep when bandwidth is tight"
          value={settings.motion}
          options={MOTION_MODES}
          onChange={(value) => onChange("motion", value)}
        />
      )}
      {supportsWakeLock && (
        <FormControlLabel
          className="bc-setting-switch"
          labelPlacement="start"
          control={
            <Switch
              checked={settings.keepAwake}
              onChange={(event) => onChange("keepAwake", event.target.checked)}
            />
          }
          label="Keep screen awake while live"
        />
      )}
    </div>
  );
}

export default BroadcastSettings;
