/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Vazirmatn", "Tahoma", "sans-serif"],
      },
      colors: {
        income: "#16a34a",
        expense: "#dc2626",
        assets: "#2563eb",
        liabilities: "#7c3aed",
      },
    },
  },
  plugins: [],
};
