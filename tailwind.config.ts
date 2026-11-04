/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "rgb(var(--ink-950-rgb) / <alpha-value>)",
          900: "rgb(var(--ink-900-rgb) / <alpha-value>)",
          850: "rgb(var(--ink-850-rgb) / <alpha-value>)",
          800: "rgb(var(--ink-800-rgb) / <alpha-value>)",
          700: "rgb(var(--ink-700-rgb) / <alpha-value>)",
        },
        bone: "rgb(var(--bone-rgb) / <alpha-value>)",
        muted: "rgb(var(--muted-rgb) / <alpha-value>)",
        oxide: {
          DEFAULT: "rgb(var(--oxide-rgb) / <alpha-value>)",
          soft: "var(--oxide-soft)",
        },
        sage: {
          DEFAULT: "rgb(var(--sage-rgb) / <alpha-value>)",
          soft: "var(--sage-soft)",
        },
        cobalt: "rgb(var(--cobalt-rgb) / <alpha-value>)",
        paper: "rgb(var(--paper-rgb) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fade: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(18px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        rise: "rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        fade: "fade 0.4s ease both",
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite",
        "slide-in": "slideIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};
