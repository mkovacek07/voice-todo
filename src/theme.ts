// Color palettes. The app supports a dark ("black") and a light theme; the
// active one is provided at runtime via ThemeContext. Both palettes share the
// same keys so components can be theme-agnostic.

export interface ThemeColors {
  // Surfaces
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Accent (purple)
  accent: string;
  accentSoft: string;
  accentSurface: string;

  // Status
  danger: string;

  // Misc
  white: string;
  overlay: string;

  // Snackbar (kept distinct so it stays a contrasting bar in both themes)
  snackbar: string;
  snackbarText: string;
  snackbarAction: string;
}

export const darkColors: ThemeColors = {
  background: "#0b0b0d",
  surface: "#161619",
  surfaceAlt: "#202028",
  border: "#2c2c34",

  textPrimary: "#f3f3f6",
  textSecondary: "#9a9aa6",
  textMuted: "#6f6f7b",

  accent: "#8b7cff",
  accentSoft: "#a99bff",
  accentSurface: "#1d1b2e",

  danger: "#ff6b6b",

  white: "#ffffff",
  overlay: "rgba(0,0,0,0.65)",

  snackbar: "#202028",
  snackbarText: "#f3f3f6",
  snackbarAction: "#a99bff",
};

export const lightColors: ThemeColors = {
  background: "#f4f5fb",
  surface: "#ffffff",
  surfaceAlt: "#f0f1f6",
  border: "#e3e6f0",

  textPrimary: "#1a1a2e",
  textSecondary: "#8a90a6",
  textMuted: "#9aa0b4",

  accent: "#6c5ce7",
  accentSoft: "#6c5ce7",
  accentSurface: "#eef0ff",

  danger: "#e74c3c",

  white: "#ffffff",
  overlay: "rgba(20,20,40,0.45)",

  snackbar: "#1a1a2e",
  snackbarText: "#ffffff",
  snackbarAction: "#a99bff",
};
