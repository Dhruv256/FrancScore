import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: {
          primary: "var(--surface-primary)",
          secondary: "var(--surface-secondary)",
          elevated: "var(--surface-elevated)",
          muted: "var(--surface-muted)",
        },
        foreground: {
          DEFAULT: "var(--foreground)",
          muted: "var(--foreground-muted)",
          soft: "var(--foreground-soft)",
        },
        accent: {
          DEFAULT: "var(--accent-primary)",
          secondary: "var(--accent-secondary)",
          soft: "var(--accent-soft)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        editorial: {
          offWhite: "#F4F0E8",
          beige: "#ECE7DD",
          mintGray: "#DDE5E1",
          blueGray: "#C9D6D2",
          orange: "#FF7A1A",
          orangeActive: "#F97316",
          orangeSoft: "#FF9A3D",
          bronze: "#B06A2B",
          black: "#080808",
          charcoal: "#111111",
          warmDark: "#27241F",
        },
      },
      boxShadow: {
        editorial: "0 24px 70px rgba(17, 17, 17, 0.11)",
        phone: "0 34px 92px rgba(17, 17, 17, 0.3)",
      },
    },
  },
};

export default config;
