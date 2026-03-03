/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        volley: {
          bg: "#ffffff",
          ink: "#1a1a1a",
          accent: "#a9d6f5",
          border: "#333333",
          muted: "#4e4e4e",
          occupied: "#c53030",
          empty: "#276749",
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', "Tahoma", "Geneva", "Verdana", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out both",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        loading: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
    },
  },
  plugins: [],
};
