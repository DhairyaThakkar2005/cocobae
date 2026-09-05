/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",
        primary: "var(--color-primary)",
        "primary-dark": "var(--color-primary-dark)",
        "primary-glow": "var(--color-primary-glow)",
        secondary: "var(--color-secondary)",
        success: "var(--color-success)",
        danger: "var(--color-danger)",
        nonveg: "var(--color-nonveg)",
        text: "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
        "text-disabled": "var(--color-text-disabled)",
        "text-inverse": "var(--color-text-inverse)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        divider: "var(--color-divider)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        heading: ["var(--font-heading)"],
        body: ["var(--font-body)"],
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },
    },
  },
  plugins: [],
};
