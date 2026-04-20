/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ig: {
          blue: "rgb(var(--ig-blue) / <alpha-value>)",
          red: "rgb(var(--ig-red) / <alpha-value>)",
          dark: "rgb(var(--ig-dark) / <alpha-value>)",
          gray: "rgb(var(--ig-gray) / <alpha-value>)",
          border: "rgb(var(--ig-border) / <alpha-value>)",
          bg: "rgb(var(--ig-bg) / <alpha-value>)",
          hover: "rgb(var(--ig-hover) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      screens: {
        xs: "480px",
      },
    },
  },
  plugins: [],
};
