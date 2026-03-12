import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "brand-action": "#3077b9",
        "brand-deep": "#243673",
        "brand-alert": "#df002a",
        "brand-ink": "#0f1d3c",
        "brand-sky": "#5d9fd2",
        "surface": "#ffffff",
        "surface-raised": "#fcfdff",
        "surface-soft": "#f4f7fb",
        "background": "#edf2f8",
        "text-primary": "#132033",
        "text-secondary": "#4f5f78",
        "text-muted": "#7f8ca3",
        "border": "#d7dfeb",
        "border-strong": "#b8c5d8",
        "success": "#1f8f54",
        "success-surface": "#eefaf3",
        "warning": "#b86b18",
        "warning-surface": "#fff6e8",
        "info-surface": "#edf5ff",
      },
      fontFamily: {
        sans: ["Manrope", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
      },
      fontSize: {
        display: ["clamp(2.8rem, 5vw, 4.8rem)", { lineHeight: "1.02", letterSpacing: "-0.05em", fontWeight: "600" }],
        h1: ["clamp(2.15rem, 4vw, 3.15rem)", { lineHeight: "1.05", letterSpacing: "-0.04em", fontWeight: "700" }],
        h2: ["clamp(1.6rem, 2.6vw, 2.2rem)", { lineHeight: "1.12", letterSpacing: "-0.03em", fontWeight: "700" }],
        h3: ["1.15rem", { lineHeight: "1.45", letterSpacing: "-0.02em", fontWeight: "700" }],
        body: ["1rem", { lineHeight: "1.75" }],
        ui: ["0.92rem", { lineHeight: "1.6", fontWeight: "500" }],
        caption: ["0.78rem", { lineHeight: "1.55" }],
      },
      borderRadius: {
        sm: "8px",
        md: "14px",
        lg: "22px",
        xl: "30px",
      },
      boxShadow: {
        card: "0 18px 40px rgba(18, 33, 56, 0.08), 0 2px 6px rgba(18, 33, 56, 0.04)",
        raised: "0 26px 60px rgba(18, 33, 56, 0.12), 0 10px 24px rgba(18, 33, 56, 0.08)",
        modal: "0 28px 90px rgba(15, 23, 42, 0.2), 0 10px 28px rgba(15, 23, 42, 0.08)",
        sm: "0 2px 8px rgba(15, 23, 42, 0.06)",
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "30": "7.5rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "check-draw": {
          "0%": { "stroke-dashoffset": "100" },
          "100%": { "stroke-dashoffset": "0" },
        },
        "confetti-fall": {
          "0%": { transform: "translateY(-20px) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(80px) rotate(360deg)", opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.3s ease-out both",
        "fade-in": "fade-in 0.2s ease-out both",
        "scale-in": "scale-in 0.25s ease-out both",
        "check-draw": "check-draw 0.5s ease-out 0.1s both",
        "confetti-fall": "confetti-fall 1.4s ease-in both",
      },
    },
  },
  plugins: [],
};

export default config;