// Broadcaster capture and quality settings, persisted in localStorage.

const STORAGE_KEY = "tvc.broadcast.settings";

// Presets are named by the short side of a 16:9 frame.
export const RESOLUTIONS = [
  { value: 480, label: "480p", long: 854, short: 480 },
  { value: 720, label: "720p", long: 1280, short: 720 },
  { value: 1080, label: "1080p", long: 1920, short: 1080 },
  { value: 2160, label: "4K", long: 3840, short: 2160 },
];

export const FRAME_RATES = [15, 24, 30, 60];

export const ORIENTATIONS = [
  { value: "auto", label: "Auto" },
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
];

// maxBitrate in bits per second; 0 lets the browser decide.
export const BITRATES = [
  { value: 0, label: "Auto" },
  { value: 800_000, label: "0.8 Mbps" },
  { value: 2_500_000, label: "2.5 Mbps" },
  { value: 5_000_000, label: "5 Mbps" },
  { value: 10_000_000, label: "10 Mbps" },
];

export const MOTION_MODES = [
  { value: "balanced", label: "Balanced" },
  { value: "motion", label: "Smooth" },
  { value: "detail", label: "Sharp" },
];

export const FACING_MODES = [
  { value: "environment", label: "Back" },
  { value: "user", label: "Front" },
];

export const DEFAULT_SETTINGS = {
  facingMode: "environment",
  resolution: 720,
  frameRate: 30,
  orientation: "auto",
  maxBitrate: 0,
  motion: "balanced",
  keepAwake: true,
};

const ALLOWED = {
  facingMode: FACING_MODES.map((option) => option.value),
  resolution: RESOLUTIONS.map((option) => option.value),
  frameRate: FRAME_RATES,
  orientation: ORIENTATIONS.map((option) => option.value),
  maxBitrate: BITRATES.map((option) => option.value),
  motion: MOTION_MODES.map((option) => option.value),
  keepAwake: [true, false],
};

export function loadSettings() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    saved = {};
  }
  const settings = { ...DEFAULT_SETTINGS };
  for (const [key, allowed] of Object.entries(ALLOWED)) {
    if (allowed.includes(saved[key])) settings[key] = saved[key];
  }
  return settings;
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private mode or storage full: settings just won't persist.
  }
}

export function resolutionPreset(value) {
  return RESOLUTIONS.find((option) => option.value === value) ?? RESOLUTIONS[1];
}
