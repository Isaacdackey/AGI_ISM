/** Slugs normalisés : minuscules, chiffres, tirets simples (jamais en tête/fin, jamais doublés). */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Couleur hexadécimale stricte (#RRGGBB). */
export const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
