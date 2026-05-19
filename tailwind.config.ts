import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        acid: "#B6FF1A",
        electric: "#2F7DFF",
        ink: "#060709",
        panel: "#0D1014",
        line: "#1F2732"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(182,255,26,.14), 0 24px 80px rgba(0,0,0,.55)"
      }
    }
  },
  plugins: []
};

export default config;
