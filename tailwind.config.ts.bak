import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#1a1a2e",
        "background-light": "#16213e",
        "background-card": "#1f2544",
        accent: "#e8d5b7",
        "accent-hover": "#d4b896",
        "accent-muted": "#a89984",
        "text-primary": "#e8e0d6",
        "text-secondary": "#a89984",
        "text-muted": "#6b6260",
        border: "#2a2a4a",
        "border-light": "#3a3a5a",
        success: "#4ade80",
        error: "#f87171",
        warning: "#fbbf24",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
