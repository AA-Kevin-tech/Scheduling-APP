import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        aquarium: {
          deep: "#0c4a6e",
          surface: "#f0f9ff",
          accent: "#0284c7",
        },
      },
    },
  },
  plugins: [],
};

export default config;
