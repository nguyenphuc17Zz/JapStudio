import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "'Noto Sans JP'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
      },
      colors: {
        sumi: {
          950: "rgb(var(--sumi-950) / <alpha-value>)",
          900: "rgb(var(--sumi-900) / <alpha-value>)",
          850: "rgb(var(--sumi-850) / <alpha-value>)",
          800: "rgb(var(--sumi-800) / <alpha-value>)",
          750: "rgb(var(--sumi-750) / <alpha-value>)",
          700: "rgb(var(--sumi-700) / <alpha-value>)",
          600: "rgb(var(--sumi-600) / <alpha-value>)",
          500: "rgb(var(--sumi-500) / <alpha-value>)",
          400: "rgb(var(--sumi-400) / <alpha-value>)",
          300: "rgb(var(--sumi-300) / <alpha-value>)",
          200: "rgb(var(--sumi-200) / <alpha-value>)",
          100: "rgb(var(--sumi-100) / <alpha-value>)",
        },
        torii: {
          600: "#c72635",
          500: "#e63946",
          400: "#f25c54",
          300: "#f7887d",
        },
        kintsugi: {
          600: "#b8952b",
          500: "#d4af37",
          400: "#e5c158",
          300: "#f0d57d",
        },
        bamboo: {
          500: "#10b981",
          400: "#34d399",
          300: "#6ee7b7",
        }
      },
      backgroundImage: {
        "radial-gradient": "radial-gradient(circle at 50% 0%, rgba(230, 57, 70, 0.15) 0%, transparent 60%)",
        "glass-gradient": "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "glass-card": "0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)",
        "glow-torii": "0 0 25px -3px rgba(230, 57, 70, 0.35)",
        "glow-kintsugi": "0 0 25px -3px rgba(212, 175, 55, 0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
