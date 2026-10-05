/** @type {import('tailwindcss').Config} */
// Thème clair/sombre : les tokens sémantiques sont des canaux RGB définis dans
// globals.css (:root = clair, .dark = sombre) pour que les opacités (/10, /80…)
// continuent de fonctionner. Les couleurs "fixes" (boutons, badges) ne changent pas.
const token = (name) => `rgb(var(${name}) / <alpha-value>)`;
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tokens sémantiques (clair/sombre via variables CSS)
        paper: token("--paper"), // fond de page
        surface: token("--surface"), // cartes, champs, header
        ink: token("--ink"), // texte principal
        "ink-secondary": token("--ink-secondary"),
        sand: token("--sand"), // bordures 1px, séparateurs
        "sand-light": token("--sand-light"), // encarts
        "gray-warm": token("--gray-warm"), // fonds discrets, hovers
        brand: token("--brand"), // terracotta en TEXTE/lien (contraste AA en dark)
        "brand-pressed": token("--brand-pressed"),
        success: token("--success"), // vert en TEXTE (contraste AA en dark)
        inverse: token("--inverse"), // reste sombre dans les deux thèmes (hero, pastilles)
        // Couleurs fixes (fonds colorés + texte blanc, identiques en dark)
        terracotta: "#C1502E", // marque (fonds : badges)
        "terracotta-action": "#E05A2B", // fonds de boutons
        "terracotta-pressed": "#9A3D22", // hover de boutons
        gold: "#D9A441", // badge PENDING
        green: "#2F6E6A", // fonds : badges, boutons Approuver
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
