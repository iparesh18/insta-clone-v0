/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ig: {
          blue: "#0095f6",
          red: "#ed4956",
          dark: "#262626",
          gray: "#8e8e8e",
          border: "#dbdbdb",
          bg: "#fafafa",
          hover: "#efefef",
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
