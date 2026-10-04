/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Nouvelle charte Teranga adaptée AGI ISM
        terracotta: "#C1502E", // marque
        "terracotta-action": "#E05A2B",
        "terracotta-pressed": "#9A3D22",
        gold: "#D9A441", // étoiles uniquement
        green: "#2F6E6A", // validation
        ink: "#242021",
        "ink-secondary": "#5B5250",
        sand: "#E2D6C6", // bordures 1px, séparateurs
        "sand-light": "#F4EBE0", // fond carte, encarts
        "sand-dark": "#E2D6C6",
        "gray-warm": "#F7F5F2",
        paper: "#FFFFFF",
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        jakarta: ["Plus Jakarta Sans", "sans-serif"],
      },
      borderRadius: {
        'field': '8px',
        'card': '12px',
        'sheet': '16px',
        'pill': '24px',
      },
      spacing: {
        '22': '22px',
        '24': '24px',
        '32': '32px',
      },
    },
  },
  plugins: [],
};
