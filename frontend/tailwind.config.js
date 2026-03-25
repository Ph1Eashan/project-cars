/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dashboard: {
          ink: "#0f172a",
          mist: "#f6f9fc",
          steel: "#526077",
          line: "#d7e1ea",
          healthy: "#16a34a",
          weak: "#d97706",
          broken: "#dc2626",
          missing: "#94a3b8",
          panel: "#ffffff",
          navy: "#16233b",
          sky: "#4f8cff",
          soft: "#eef4fb"
        }
      },
      fontFamily: {
        sans: ["'Instrument Sans'", "'Segoe UI'", "system-ui", "sans-serif"]
      },
      boxShadow: {
        panel: "0 20px 48px rgba(15, 23, 42, 0.08)",
        soft: "0 10px 24px rgba(15, 23, 42, 0.06)"
      },
      backgroundImage: {
        atmosphere:
          "radial-gradient(circle at top left, rgba(79,140,255,0.16), transparent 34%), radial-gradient(circle at 88% 8%, rgba(15,23,42,0.08), transparent 22%), linear-gradient(180deg, #f8fbff 0%, #f3f7fb 46%, #eef3f9 100%)"
      }
    }
  },
  plugins: []
};
