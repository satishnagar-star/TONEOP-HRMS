/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#5B21B6",
          700: "#4C1D95",
          800: "#3B0764",
          900: "#2E1065"
        },
        accent: "#38BDF8",
        success: "#22C55E",
        bg: "#F9FAFB",
        text: "#111827"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(17, 24, 39, 0.06)",
        card: "0 6px 20px rgba(17, 24, 39, 0.06)"
      },
      borderRadius: {
        xl: "1rem"
      }
    },
  },
  plugins: [],
}

