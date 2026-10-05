// Service unique Render : lance le backend Nest (interne) + le front Next (public sur $PORT).
// Le front rewrite /api/* -> BACKEND_URL (même origine => cookie first-party).
const { spawn } = require('node:child_process');

const frontendPort = Number.parseInt(process.env.PORT || '3000', 10);
const backendPort = Number.parseInt(process.env.BACKEND_PORT || '4000', 10);
const backendUrl = process.env.BACKEND_URL || `http://127.0.0.1:${backendPort}`;

function start(name, command, args, env) {
  const child = spawn(command, args, { env, stdio: 'inherit' });
  child.on('exit', (code, signal) => {
    console.error(`[${name}] exit code=${code} signal=${signal} — arrêt du service combiné`);
    shutdown(code === 0 ? 1 : (code ?? 1));
  });
  child.on('error', (err) => {
    console.error(`[${name}] spawn error:`, err?.message || err);
    shutdown(1);
  });
  return child;
}

let shuttingDown = false;
const children = [];
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) {
    try { c.kill('SIGTERM'); } catch { /* noop */ }
  }
  setTimeout(() => process.exit(code), 3000).unref();
}
process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));

// Backend : PORT forcé en interne (ne doit PAS prendre le $PORT de Render).
children.push(
  start('backend', 'node', ['backend/dist/main'], {
    ...process.env,
    PORT: String(backendPort),
  }),
);

// Frontend : écoute le $PORT public de Render, rewrites /api -> backend interne.
children.push(
  start('frontend', 'node', ['frontend/server.js'], {
    ...process.env,
    PORT: String(frontendPort),
    HOSTNAME: '0.0.0.0',
    BACKEND_URL: backendUrl,
  }),
);

console.log(`[combined] frontend=:${frontendPort} backend=127.0.0.1:${backendPort} rewrite /api -> ${backendUrl}/api`);
