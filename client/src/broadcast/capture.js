// Camera constraints and WebRTC sender tuning for the broadcaster.
import { RESOLUTIONS, FRAME_RATES, resolutionPreset } from "./settings";

export const supportsSenderParameters =
  typeof RTCRtpSender !== "undefined" &&
  typeof RTCRtpSender.prototype.setParameters === "function";

export const supportsContentHint =
  typeof MediaStreamTrack !== "undefined" &&
  "contentHint" in MediaStreamTrack.prototype;

export function isPortraitScreen() {
  return window.matchMedia("(orientation: portrait)").matches;
}

function wantsPortrait(settings) {
  if (settings.orientation === "auto") return isPortraitScreen();
  return settings.orientation === "portrait";
}

// Size and frame rate only. All values are "ideal" so a camera that can't
// match them still opens with the closest mode instead of failing.
export function sizeConstraints(settings) {
  const { long, short } = resolutionPreset(settings.resolution);
  const portrait = wantsPortrait(settings);
  return {
    width: { ideal: portrait ? short : long },
    height: { ideal: portrait ? long : short },
    aspectRatio: { ideal: portrait ? short / long : long / short },
    frameRate: { ideal: settings.frameRate },
  };
}

// A deviceId pins one camera (used when reopening the same camera, or when
// the browser doesn't report facingMode); otherwise ask for a facing mode.
export function captureConstraints(settings, deviceId) {
  return {
    video: {
      ...(deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: { ideal: settings.facingMode } }),
      ...sizeConstraints(settings),
    },
    audio: false,
  };
}

// applyConstraints replaces every constraint on the track, so zoom and torch
// have to be sent again with each size change or they would reset.
export async function applyTrackConstraints(track, settings, extras = {}) {
  const advanced = [];
  if (extras.zoom != null) advanced.push({ zoom: extras.zoom });
  if (extras.torch) advanced.push({ torch: true });
  await track.applyConstraints({
    ...sizeConstraints(settings),
    ...(advanced.length ? { advanced } : {}),
  });
}

export function applyContentHint(track, settings) {
  if (!supportsContentHint || !track) return;
  track.contentHint = settings.motion === "balanced" ? "" : settings.motion;
}

const DEGRADATION = {
  balanced: "balanced",
  motion: "maintain-framerate",
  detail: "maintain-resolution",
};

function paramsFor(sender, settings, withPreference) {
  const params = sender.getParameters();
  if (!params.encodings?.length) return null; // not negotiated yet
  const encoding = params.encodings[0];
  if (settings.maxBitrate) encoding.maxBitrate = settings.maxBitrate;
  else delete encoding.maxBitrate;
  if (withPreference) params.degradationPreference = DEGRADATION[settings.motion];
  return params;
}

// Bitrate cap and motion/detail preference. Some browsers reject
// degradationPreference, so retry without it.
export async function applySenderSettings(sender, settings) {
  if (!supportsSenderParameters || !sender) return;
  try {
    const params = paramsFor(sender, settings, true);
    if (params) await sender.setParameters(params);
  } catch {
    try {
      const params = paramsFor(sender, settings, false);
      if (params) await sender.setParameters(params);
    } catch (error) {
      console.warn("Could not apply sender settings", error);
    }
  }
}

export function readCapabilities(track) {
  try {
    return track?.getCapabilities?.() ?? {};
  } catch {
    return {};
  }
}

// Presets the camera can actually deliver. Before the camera is open
// (no capabilities) show the common ones.
export function availableResolutions(caps) {
  const maxLong = Math.max(caps?.width?.max ?? 0, caps?.height?.max ?? 0);
  if (!maxLong) return RESOLUTIONS.filter((option) => option.value <= 1080);
  return RESOLUTIONS.filter(
    (option) => option.value === 480 || option.long <= maxLong
  );
}

export function availableFrameRates(caps) {
  const max = caps?.frameRate?.max;
  if (!max) return FRAME_RATES.filter((rate) => rate <= 30);
  return FRAME_RATES.filter((rate) => rate === 15 || rate <= max + 0.5);
}

export async function listCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === "videoinput");
  } catch {
    return [];
  }
}

export async function countCameras() {
  return (await listCameras()).length;
}

// Outbound video stats for one peer: encoded size, fps and bytes sent.
export async function outboundVideoStats(peer) {
  const report = await peer.getStats();
  for (const stat of report.values()) {
    if (stat.type === "outbound-rtp" && stat.kind === "video") {
      return {
        width: stat.frameWidth,
        height: stat.frameHeight,
        fps: stat.framesPerSecond,
        bytesSent: stat.bytesSent,
        timestamp: stat.timestamp,
        limitation: stat.qualityLimitationReason,
      };
    }
  }
  return null;
}
