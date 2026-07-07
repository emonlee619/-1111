import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/config/**/*.{ts,tsx}",
    "./src/data/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "var(--page-bg)",
        card: "var(--card-bg)",
        surface: "var(--surface-bg)",
        line: "var(--border)",
        ink: "var(--text)",
        muted: "var(--muted-text)",
        primary: "var(--primary)",
        panel: {
          DEFAULT: "var(--mine-bg-panel)",
          solid: "var(--mine-bg-panel-solid)",
          soft: "var(--mine-bg-panel-soft)",
          control: "var(--mine-bg-control)",
        },
        glow: {
          cyan: "var(--mine-glow-cyan)",
          blue: "var(--mine-glow-blue)",
          danger: "var(--mine-glow-danger)",
        },
        danger: "var(--mine-danger)",
        warning: "var(--mine-warning)",
        success: "var(--mine-success)",
        info: "var(--mine-info)",
        risk: {
          low: "var(--risk-low)",
          normal: "var(--risk-normal)",
          high: "var(--risk-high)",
          critical: "var(--risk-critical)",
        },
      },
      borderRadius: {
        card: "var(--radius-card)",
        control: "var(--radius-control)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        soft: "var(--shadow-soft)",
        panel: "var(--shadow-panel)",
        glow: "var(--shadow-glow)",
        dangerGlow: "var(--shadow-danger-glow)",
      },
    },
  },
  plugins: [],
};

export default config;
