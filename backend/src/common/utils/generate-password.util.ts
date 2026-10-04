import { randomInt } from 'crypto';

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SPECIAL = '!@#$%^&*_-+=';
const ALL = UPPER + LOWER + DIGITS + SPECIAL;

/**
 * Génère un mot de passe fort de 12 caractères minimum.
 * Garantit au moins 1 majuscule, 1 minuscule, 1 chiffre, 1 spécial.
 * Tirage cryptographiquement sûr via crypto.randomInt (pas Math.random).
 * Caractères mélangés aléatoirement (Fisher-Yates avec randomInt).
 */
export function generateStrongPassword(length = 12): string {
  if (length < 12) length = 12;

  const pick = (charset: string) => charset[randomInt(charset.length)];

  // 1 de chaque catégorie obligatoire
  const required: string[] = [
    pick(UPPER),
    pick(LOWER),
    pick(DIGITS),
    pick(SPECIAL),
  ];

  // Complète le reste avec ALL
  const remaining = length - required.length;
  const chars: string[] = [...required];
  for (let i = 0; i < remaining; i++) {
    chars.push(pick(ALL));
  }

  // Fisher-Yates shuffle avec randomInt
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
