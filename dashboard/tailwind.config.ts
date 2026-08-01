import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#5865F2",
          dark: "#4752C4"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Tahoma", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
