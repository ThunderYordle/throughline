/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        canvas: "rgb(var(--tl-bg-canvas-rgb) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--tl-bg-surface-rgb) / <alpha-value>)",
          raised: "rgb(var(--tl-bg-raised-rgb) / <alpha-value>)",
          overlay: "rgb(var(--tl-bg-overlay-rgb) / <alpha-value>)",
          hover: "rgb(var(--tl-bg-overlay-rgb) / <alpha-value>)",
        },
        line: {
          subtle: "var(--tl-border-subtle)",
          DEFAULT: "var(--tl-border-default)",
          strong: "var(--tl-border-strong)",
        },
        ink: {
          primary: "rgb(var(--tl-text-primary-rgb) / <alpha-value>)",
          secondary: "rgb(var(--tl-text-secondary-rgb) / <alpha-value>)",
          muted: "rgb(var(--tl-text-muted-rgb) / <alpha-value>)",
          inverse: "rgb(var(--tl-text-inverse-rgb) / <alpha-value>)",
        },
        accent: {
          cyan: "rgb(var(--tl-accent-cyan-rgb) / <alpha-value>)",
        },
        side: {
          blue: "rgb(var(--tl-side-blue-rgb) / <alpha-value>)",
          red: "rgb(var(--tl-side-red-rgb) / <alpha-value>)",
        },
        status: {
          good: "rgb(var(--tl-status-good-rgb) / <alpha-value>)",
          warn: "rgb(var(--tl-status-warn-rgb) / <alpha-value>)",
          bad: "rgb(var(--tl-status-bad-rgb) / <alpha-value>)",
          info: "rgb(var(--tl-status-info-rgb) / <alpha-value>)",
          violet: "rgb(var(--tl-status-violet-rgb) / <alpha-value>)",
          orange: "rgb(var(--tl-status-orange-rgb) / <alpha-value>)",
        },
        // Backward-compatible aliases
        blue: { side: "rgb(var(--tl-side-blue-rgb) / <alpha-value>)" },
        red: { side: "rgb(var(--tl-side-red-rgb) / <alpha-value>)" },
      },
      borderRadius: {
        ds: "var(--tl-radius-md)",
        "ds-lg": "var(--tl-radius-lg)",
        "ds-xl": "var(--tl-radius-xl)",
      },
      boxShadow: {
        card: "var(--tl-shadow-panel)",
        panel: "var(--tl-shadow-panel)",
        elevated: "var(--tl-shadow-elevated)",
      },
    },
  },
  plugins: [],
};

