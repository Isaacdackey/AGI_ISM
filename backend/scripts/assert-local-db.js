/**
 * Garde-fou : refuse toute commande destructive (migration, seed, tests)
 * si DATABASE_URL ne pointe pas vers une base LOCALE.
 * N'affiche jamais l'URL complète (hôte uniquement).
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'postgres', 'db']);

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('[assert-local-db] DATABASE_URL manquante — abandon.');
  process.exit(1);
}
const host = hostOf(databaseUrl);
if (!host || !LOCAL_HOSTS.has(host)) {
  console.error(`[assert-local-db] Hôte non local (« ${host || 'illisible'} ») — abandon. Les migrations/seeds/tests sont interdits hors Postgres local.`);
  process.exit(1);
}
console.log(`[assert-local-db] OK — base locale (« ${host} »).`);
