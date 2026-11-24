/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        blue: { side: "#3b82f6" },
        red: { side: "#ef4444" },
      },
    },
  },
  plugins: [],
};

