import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#05060a",
        mist: "#f4f7fb",
        ember: "#ff3b5f",
        sea: "#7bf6ff",
        haze: "#8c96ad",
        panel: "#111521",
        steel: "#171c28",
        blade: "#232a38"
      },
      boxShadow: {
        panel: "0 24px 80px rgba(0, 0, 0, 0.45)"
      },
      fontFamily: {
        sans: ["var(--font-manrope)"],
        display: ["var(--font-space-grotesk)"]
      }
    }
  },
  plugins: []
};

export default config;
