export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint: string;
  publicUrl?: string;
}

/**
 * Liste des variables d'environnement requises pour R2.
 * R2_PUBLIC_URL est optionnelle (bucket public/dev URL).
 */
const REQUIRED_VARS: Array<{ env: keyof NodeJS.ProcessEnv; label: string }> = [
  { env: 'R2_ACCOUNT_ID', label: 'R2_ACCOUNT_ID' },
  { env: 'R2_ACCESS_KEY_ID', label: 'R2_ACCESS_KEY_ID' },
  { env: 'R2_SECRET_ACCESS_KEY', label: 'R2_SECRET_ACCESS_KEY' },
  { env: 'R2_BUCKET_NAME', label: 'R2_BUCKET_NAME' },
  { env: 'R2_ENDPOINT', label: 'R2_ENDPOINT' },
];

/**
 * Valide la présence des variables R2 au démarrage.
 * Lance une erreur avec message clair si une variable manque.
 * Si STORAGE_DRIVER=local et NODE_ENV != production, la validation est assouplie (warning).
 */
export function validateR2Config(): void {
  const driver = process.env.STORAGE_DRIVER || 'r2';
  const isLocalAllowed = driver === 'local';

  // En mode local (dev/test uniquement), on n'exige pas R2
  if (isLocalAllowed) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'STORAGE_DRIVER=local est interdit en production. Utilise R2 (STORAGE_DRIVER=r2) et fournis R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT.',
      );
    }
    // En dev/test, on log un warning mais on ne bloque pas
    // La validation R2 sera ignorée
    return;
  }

  const missing = REQUIRED_VARS.filter(({ env }) => !process.env[env] || process.env[env]!.trim() === '');
  if (missing.length > 0) {
    const names = missing.map((m) => m.label).join(', ');
    throw new Error(
      `Configuration R2 incomplète — variables manquantes: ${names}. ` +
        `Vérifie ton .env (voir .env.example) : R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT (+ R2_PUBLIC_URL optionnel).`,
    );
  }

  // Validation format endpoint
  const endpoint = process.env.R2_ENDPOINT!;
  if (!endpoint.startsWith('https://')) {
    throw new Error('R2_ENDPOINT invalide: doit commencer par https:// (ex: https://<accountId>.r2.cloudflarestorage.com)');
  }
}

export function getR2Config(): R2Config {
  // On suppose que validateR2Config() a déjà été appelé
  return {
    accountId: process.env.R2_ACCOUNT_ID!.trim(),
    accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
    bucketName: process.env.R2_BUCKET_NAME!.trim(),
    endpoint: process.env.R2_ENDPOINT!.trim().replace(/\/$/, ''),
    publicUrl: process.env.R2_PUBLIC_URL?.trim() ? process.env.R2_PUBLIC_URL.trim().replace(/\/$/, '') : undefined,
  };
}

/**
 * Retourne le driver de stockage actif.
 * - 'r2' par défaut (production)
 * - 'local' autorisé uniquement hors production (dev/test/CI)
 */
export function getStorageDriver(): 'r2' | 'local' {
  const raw = (process.env.STORAGE_DRIVER || 'r2').toLowerCase();
  if (raw === 'local') return 'local';
  return 'r2';
}
