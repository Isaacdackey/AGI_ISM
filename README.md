# AGI ISM — Bibliothèque Académique Numérique

Plateforme académique organisée en **Campus → École → Matière → Ressources**.
Les étudiants consultent et téléchargent **sans compte**. Seuls `MODERATOR` (dépose)
et `ADMIN` (valide, gère tout) se connectent.
La plateforme s'appelle « AGI ISM — Bibliothèque académique » ; l'institution est « l'ISM ».

## Stack
- **Backend**: NestJS 10 + Prisma 5 + PostgreSQL + JWT (cookie httpOnly) + Multer + R2 + Swagger (hors prod) + Helmet + Throttler
- **Frontend**: Next.js 14 (App Router) + Tailwind + Lucide

## Lancement rapide (développement local)

### Prérequis
Node 20, Docker (Postgres local pour dev/tests).

### Base locale
```bash
docker compose up -d postgres
# Base dev : ism_agi — base tests e2e : ism_agi_test (créée par init-test-db.sh)
# Si le port 5432 est occupé (ex. Postgres système), stoppez-le ou adaptez le mapping.
```

### Backend
```bash
cd backend
npm install
cp .env.example .env
# éditer .env (voir tableau des variables ci-dessous)
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/ism_agi?schema=public" npx prisma migrate dev
npm run db:seed:local   # seed idempotent (upsert) ; reset destructif uniquement avec SEED_RESET=true + CONFIRM_WIPE
npm run start:dev
# API : http://localhost:4000/api — santé : http://localhost:4000/api/health
# Swagger (hors prod) : http://localhost:4000/api/docs
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
# http://localhost:3000
```

## Comptes et seed
- Le seed crée **uniquement l'admin** via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
  (obligatoires, jamais de valeur par défaut ; mot de passe ≥ 12 caractères conseillé).
  Relancer le seed ne supprime rien (upsert) et ne recrée pas l'admin existant.
- Les **modérateurs** sont créés par l'admin (`POST /api/admin/moderators`) : mot de
  passe temporaire affiché **une seule fois**, changement imposé à la 1ʳᵉ connexion.
- Pas de compte étudiant : accès public anonyme.

## Endpoints
- `GET /api/health` → `{ status: "ok", db: "up" }` (503 si DB ko)
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` (public, 200 toujours : `{ user }` ou `{ user: null }`), `POST /api/auth/change-password` (authentifié)
- `GET /api/campuses`, `GET /api/campuses/:slug`
- `GET /api/schools`, `GET /api/schools/:slug`, `POST /api/schools` (ADMIN), `PATCH /api/schools/:id` (ADMIN + MODERATOR, changement de campus réservé ADMIN), `DELETE /api/schools/:id` (ADMIN, 409 si ressources)
- `GET /api/subjects?schoolId=&campusId=`, `GET /api/subjects/:slug`, `POST /api/subjects` (ADMIN + MODERATOR), `PATCH /api/subjects/:id` (changement d'école réservé ADMIN), `DELETE /api/subjects/:id` (ADMIN, 409 si ressources)
- `GET /api/resources?search=&schoolId=&subjectId=&type=&level=&semester=&year=&status=&page=&limit=` (public = APPROVED uniquement ; `status` ignoré pour les anonymes)
- `POST /api/resources` (multipart PDF/PNG/JPEG/WEBP 10 Mo max, PENDING), `GET /api/resources/:slug`, `PATCH /api/resources/:id` (propriétaire ou ADMIN), `DELETE /api/resources/:id` (propriétaire ou ADMIN), `GET /api/resources/:id/download`, `GET /api/resources/:id/preview`
- `PATCH /api/resources/:id/approve`, `PATCH /api/resources/:id/reject` (**ADMIN uniquement**)
- `GET /api/admin/stats`, `GET /api/admin/pending`, `GET /api/admin/moderators`, `POST /api/admin/moderators`, `PATCH /api/admin/moderators/:id/disable|enable`, `POST /api/admin/moderators/:id/reset-password`
- Slugs inconnus : 404. Erreurs Prisma : 409 (conflit) / 404 / 500 générique (jamais de détail interne).

## Variables d'environnement

### Backend (`backend/.env`, voir `.env.example`)
| Variable | Obligatoire | Défaut | Rôle |
|---|---|---|---|
| `DATABASE_URL` | oui | — | Connexion Postgres. Neon via pooler : suffixer `?pgbouncer=true&connection_limit=5&pool_timeout=20` |
| `JWT_SECRET` | oui | — | ≥ 48 caractères aléatoires (refusé sinon) |
| `JWT_EXPIRES_IN` | non | `15m` | Durée du JWT (`15m`, `1h`, `7d`) |
| `SESSION_MAX_HOURS` | non | `8` | Durée absolue max d'une session glissante (heures) |
| `PORT` | non | `4000` | Port d'écoute |
| `FRONTEND_URL` | oui (prod) | `http://localhost:3000` | Origines autorisées (CORS + CSRF, séparées par virgules) |
| `TRUST_PROXY_HOPS` | non | `1` | Proxys de confiance (IP rate-limit) |
| `MAX_FILE_SIZE` | non | `10485760` | Octets, plafond 10 Mo imposé |
| `NODE_ENV` | non | `development` | `production` active HSTS/CSP stricte, coupe Swagger |
| `STORAGE_DRIVER` | non | `r2` | `r2` (prod) ou `local` (dev/test uniquement, interdit en prod) |
| `UPLOAD_DIR` | non | `./uploads/resources` | Dossier du driver local |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `R2_ENDPOINT` | oui si `r2` | — | Cloudflare R2 |
| `R2_PUBLIC_URL` | non | — | URL publique du bucket (optionnel) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | oui (seed) | — | Compte admin initial |
| `SEED_RESET` / `CONFIRM_WIPE` / `ALLOW_SEED` | non | — | Reset destructif : `SEED_RESET=true` + `CONFIRM_WIPE=<nom exact de la base>` (+ `ALLOW_SEED=true` en prod) |

### Frontend (`frontend/.env.local`, voir `.env.example`)
| Variable | Obligatoire | Défaut | Rôle |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | non | `http://localhost:4000/api` | URL de l'API. **Recommandé en prod : `/api`** (via rewrites, même origine, cookie first-party) |
| `BACKEND_URL` | non (serveur uniquement) | — | Cible des rewrites `/api/:path*` (dev : `http://localhost:4000` ; prod : URL interne de l'API) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | non | adresse de repli | Contact unique (mentions légales, CGU, signalement) |

## Déploiement
- **Recommandé** : frontend et API sur le **même domaine** (`NEXT_PUBLIC_API_URL=/api` + `BACKEND_URL` interne) : le cookie `HttpOnly; Secure; SameSite=Strict` est first-party, pas de CORS/CSRF inter-sites.
- Sinon (deux domaines) : renseigner `FRONTEND_URL` exact côté API (CORS + CSRF à origines exactes) et servir en HTTPS (`Secure`).
- Sessions : JWT 15 min + renouvellement glissant (< 5 min restantes, session < `SESSION_MAX_HOURS`) ; déconnexion = révocation (`tokenVersion++`, tous appareils).
- Limiteur : mémoire **mono-instance** (verrouillage anti-bruteforce inclus). Plusieurs instances ⇒ Redis requis.
- Conteneurs : `docker build ./backend`, `./frontend` (non-root, healthchecks). Services `backend`/`frontend` sous profil `app` (`docker compose --profile app up -d`).

## Appliquer les migrations (production)
```bash
cd backend
npx prisma migrate deploy   # avec la DATABASE_URL de production
```
Les fichiers de `prisma/migrations/` sont versionnés ; c'est au propriétaire de les appliquer.
Note Neon : les migrations via le pooler nécessiteront plus tard `DIRECT_URL` (connexion directe) — **non ajouté pour l'instant** (variable absente), documenté ici uniquement.

## Sécurité
bcrypt (coût 12), JWT révocables, anti-bruteforce (5 échecs/15 min ⇒ verrou 15 min + throttle IP), CSRF à origines exactes, ValidationPipe stricte, Helmet/CSP, CORS whitelist, Ownership stricte (pas de fail-open), suppressions protégées (409 + `Restrict` en base), validation MIME + magic bytes, clés `uuid.ext`, rate-limit, `mustChangePassword` imposé, comptes désactivables.

## Livrable propre (`npm run pack`)
À la racine : `npm run pack` produit `../ism_agi_clean.zip` via `git archive HEAD`
(n'embarque que les fichiers suivis ⇒ jamais `.env`, `node_modules`, `dist`, logs).
Sans dépôt git, la commande échoue avec un message explicite.

## Écoles du seed (5 officielles ISM)
- École de Droit (`ecole-de-droit`)
- École d’Ingénieurs (`ecole-ingenieurs`)
- École de Management (`ecole-management`)
- Madiba Leadership Institute (`madiba-leadership-institute`)
- Digital Campus (`digital-campus`)
- 69 matières (source : groupeism.sn), 0 ressource initiale.

## Design
- Terracotta #C1502E (accent), Gold #B9975B, Green #2E7D6F, Ink #1B2A4E, Sand #F5F1EB
- Poppins (titres) + Plus Jakarta Sans (texte)
- Responsive 320→1440, labels/aria-labels, focus visible
