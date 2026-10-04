import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { BCRYPT_COST } from '../src/common/utils/bcrypt-cost';

/**
 * Applique SEED_ADMIN_PASSWORD au compte SEED_ADMIN_EMAIL existant
 * (le seed ne réécrit jamais un admin existant).
 * Usage : npx ts-node scripts/rotate-admin-password.ts
 * Ne journalise jamais le mot de passe. Révoque les sessions existantes.
 */
async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email) throw new Error("SEED_ADMIN_EMAIL manquant dans backend/.env");
  if (!password) throw new Error("SEED_ADMIN_PASSWORD manquant dans backend/.env");
  if (password.length < 12) throw new Error('SEED_ADMIN_PASSWORD : 12 caractères minimum');
  const localPart = email.split('@')[0] || '';
  if (localPart.length >= 3 && password.toLowerCase().includes(localPart)) {
    throw new Error('SEED_ADMIN_PASSWORD ne doit pas contenir votre identifiant');
  }
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) throw new Error(`Aucun compte avec l'email ${email} — lancez d'abord le seed`);
    const hashed = await bcrypt.hash(password, BCRYPT_COST);
    await prisma.user.update({
      where: { email },
      data: { password: hashed, mustChangePassword: false, tokenVersion: { increment: 1 } },
    });
    console.log(`Mot de passe mis à jour pour ${email} (sessions existantes révoquées).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
