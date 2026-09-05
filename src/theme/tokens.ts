/**
 * Theme tokens referencing CSS variables defined in globals.css.
 * Editing globals.css automatically cascades through here and Tailwind.
 */
export const THEME = {
  colors: {
    bg: "#0F0A06",
    surface: "#1C1208",
    surface2: "#281B0E",
    glass: "rgba(255, 255, 255, 0.06)",
    glassBorder: "rgba(255, 255, 255, 0.12)",
    overlay: "rgba(0, 0, 0, 0.75)",

    primary: "#F5A623",
    primaryDark: "#C97E0F",
    primaryGlow: "rgba(245, 166, 35, 0.25)",
    secondary: "#E8836A",
    success: "#4CAF7D",
    danger: "#E85D5D",
    nonveg: "#E53935",

    text: "#FFF3E0",
    textMuted: "#B8956A",
    textDisabled: "#6A4E38",
    textInverse: "#0F0A06",

    border: "rgba(255, 255, 255, 0.08)",
    borderStrong: "rgba(245, 166, 35, 0.40)",
    divider: "rgba(255, 255, 255, 0.07)",
  },
  gradients: {
    cake: ["#FF6B6B", "#FFE66D"],
    icecream: ["#4ECDC4", "#556270"],
    waffle: ["#F7971E", "#FFD200"],
    shake: ["#A18CD1", "#FBC2EB"],
    brownie: ["#8B4513", "#D2691E"],
    pudding: ["#F3904F", "#3B4371"],
    default: ["#281B0E", "#1C1208"],
  },
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    full: 9999,
  },
} as const;
