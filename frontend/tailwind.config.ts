import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        "panel-soft": "rgb(var(--color-panel-soft) / <alpha-value>)",
        text: "rgb(var(--color-text) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        "accent-warm": "rgb(var(--color-accent-warm) / <alpha-value>)",
        edge: "rgb(var(--color-edge) / <alpha-value>)",
      },
      fontFamily: {
        display: ["Sora", "sans-serif"],
        body: ["Space Grotesk", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      borderRadius: {
        panel: "1.25rem",
      },
      boxShadow: {
        panel: "0 20px 50px rgba(0, 0, 0, 0.42)",
      },
    },
  },
  plugins: [],
};

export default config;
