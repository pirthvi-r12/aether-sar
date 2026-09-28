import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        aether: {
          void: "#04060A",
          deep: "#080C14",
          glass: "#0E1422",
          cyan: "#00F0FF",
          amber: "#FFB800",
          red: "#FF2A42",
          emerald: "#00FF88",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-cinzel)", "Times New Roman", "serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        cyan: "0 0 24px rgba(0, 240, 255, 0.35), 0 0 80px rgba(0, 240, 255, 0.12)",
        amber: "0 0 24px rgba(255, 184, 0, 0.3)",
        red: "0 0 28px rgba(255, 42, 66, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
