/**
 * Environnement forcé des tests e2e : aucune valeur réelle,
 * base Postgres locale de test uniquement.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/ism_agi_test?schema=public';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ||
  'test-secret-0123456789abcdef-test-secret-0123456789abcdef-00';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
process.env.STORAGE_DRIVER = 'local';
process.env.UPLOAD_DIR = './test/tmp/uploads';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
process.env.R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || 'test-account';
process.env.R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || 'test-key';
process.env.R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || 'test-secret';
process.env.R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'test-bucket';
process.env.R2_ENDPOINT = process.env.R2_ENDPOINT || 'http://127.0.0.1:9000';

// Garde-fou : interdit toute base distante (quitte en erreur sinon).
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('../scripts/assert-local-db.js');
