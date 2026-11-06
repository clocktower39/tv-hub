import { createTheme } from "@mui/material/styles";

// "Living room": warm charcoal surfaces, one amber accent, big rounded
// controls that read from the couch. Every colour used anywhere in the app
// comes from here, either through the MUI theme or the --tvh-* CSS variables
// that cssVariables() writes onto :root.
export const tokens = {
  bg: "#1c1b1a",
  surface: "#252321",
  surfaceRaised: "#2e2b28",
  surfacePressed: "#383430",
  border: "#3a3632",
  text: "#f4efe9",
  textMuted: "#a8a097",
  textFaint: "#756e66",
  accent: "#f5a524",
  accentHover: "#ffb842",
  onAccent: "#1c1b1a",
  live: "#e5484d",
  ok: "#46a758",
  warn: "#f5a524",
  radius: 18,
  radiusSmall: 12,
  font:
    'ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

export function cssVariables() {
  return {
    ":root": {
      "--tvh-bg": tokens.bg,
      "--tvh-surface": tokens.surface,
      "--tvh-surface-raised": tokens.surfaceRaised,
      "--tvh-surface-pressed": tokens.surfacePressed,
      "--tvh-border": tokens.border,
      "--tvh-text": tokens.text,
      "--tvh-text-muted": tokens.textMuted,
      "--tvh-text-faint": tokens.textFaint,
      "--tvh-accent": tokens.accent,
      "--tvh-accent-hover": tokens.accentHover,
      "--tvh-on-accent": tokens.onAccent,
      "--tvh-live": tokens.live,
      "--tvh-ok": tokens.ok,
      "--tvh-warn": tokens.warn,
      "--tvh-radius": `${tokens.radius}px`,
      "--tvh-radius-small": `${tokens.radiusSmall}px`,
      "--tvh-font": tokens.font,
      // Height of the bottom nav, so pages can keep content clear of it.
      "--tvh-nav-height": "64px",
    },
  };
}

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: tokens.accent, contrastText: tokens.onAccent },
    error: { main: tokens.live },
    success: { main: tokens.ok },
    background: { default: tokens.bg, paper: tokens.surface },
    text: { primary: tokens.text, secondary: tokens.textMuted },
    divider: tokens.border,
  },
  shape: { borderRadius: tokens.radiusSmall },
  typography: {
    fontFamily: tokens.font,
    button: { textTransform: "none", fontWeight: 600 },
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: tokens.bg, color: tokens.text },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 999, paddingInline: 20 },
        containedPrimary: {
          "&:hover": { backgroundColor: tokens.accentHover },
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.surface,
          borderTop: `1px solid ${tokens.border}`,
          height: "var(--tvh-nav-height)",
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: tokens.textFaint,
          "&.Mui-selected": { color: tokens.accent },
        },
        label: {
          fontWeight: 600,
          "&.Mui-selected": { fontSize: "0.75rem" },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.bg,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: tokens.border },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: tokens.surfaceRaised,
          border: `1px solid ${tokens.border}`,
        },
      },
    },
    MuiListSubheader: {
      styleOverrides: {
        root: {
          backgroundColor: "transparent",
          color: tokens.textMuted,
          lineHeight: "36px",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: tokens.surfacePressed, fontSize: "0.8rem" },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.surfaceRaised,
          color: tokens.text,
          border: `1px solid ${tokens.border}`,
        },
      },
    },
  },
});
