# Rapport de correction — audit senior Ism_Agi

> En français. Réalisé phase par phase selon le prompt de correction.
> **Contrainte respectée** : `backend/.env` et `frontend/.env.local` n'ont été ni lus,
> ni affichés, ni modifiés, ni committés. Aucune commande Prisma/seed/test n'a visé
> la base distante (garde-fou `assert-local-db` + `DATABASE_URL` locale inline ;
> conteneur éphémère `pg-e2e-tmp` sur `127.0.0.1:5433`, distant jamais touché).

## 0. Contexte d'exécution (écarts au prompt)
- **Pas de dépôt git** dans `Ism_Agi/` (`fatal: not a git repository`). Variante sûre
  appliquée : **aucun `git init`, aucune branche, aucun commit, aucun push**.
  Colonne « commit » ci-dessous = `n/a`. Le script `npm run pack` (`git archive HEAD`)
  est en place mais échouera avec un message explicite tant qu'il n'y a pas de dépôt.
- **Port 5432 occupé** par le Postgres système local (`postgresql-x64-17`, arrêt
  impossible sans admin). Variante sûre : fichiers validés pour `127.0.0.1:5432`
  (spec), vérifications e2e/migrations exécutées contre un conteneur éphémère sur
  **`127.0.0.1:5433`** via `DATABASE_URL` inline. Pour utiliser les scripts
  `db:migrate:local` / `test:e2e` tels quels, stopper le Postgres système (admin requis).
- `npx prisma migrate deploy` sur la base de test locale : OK. **Neon non touché.**
- Pas de nouvelle dépendance runtime ajoutée (que des dev : jest, ts-jest,
  @types/jest, @nestjs/testing@10, supertest, @types/supertest, cross-env —
  nécessité : infra e2e exigée par le prompt).

## 1. Tableau constat → statut → fichiers (commit : n/a, pas de git)

| # | Constat d'audit | Statut | Fichiers touchés |
|---|---|---|---|
| 1.1 | `start:prod` cassé (`dist/src/main` vs `dist/main`) | **Corrigé** | `backend/tsconfig.build.json` (nouveau) |
| 1.2 | Config éparpillée dans `main.ts` | **Corrigé** | `backend/src/app.setup.ts` (nouveau, `TRUST_PROXY_HOPS` défaut 1), `main.ts` allégé + `enableShutdownHooks()` |
| 1.3 | Pas de healthcheck | **Corrigé** | `backend/src/health/` (contrôleur `GET /api/health` public, `@SkipThrottle`, 200/503) + `app.module.ts` |
| 1.4 | Pas de tests e2e | **Corrigé** | `test/jest-e2e.json`, `test/setup-env.ts`, `test/helpers.ts`, `scripts/assert-local-db.js`, `.env.test.example`, scripts `test:e2e`/`db:migrate:local`/`db:seed:local`, `lint:ci`, compose (healthcheck, init `ism_agi_test`, `127.0.0.1`) |
| 2.1 | CSRF `startsWith` contournable | **Corrigé** | `common/guards/csrf.guard.ts` (origines exactes via `URL.origin`, login testé sur `req.path`) + 5 tests |
| 2.2 | `POST /auth/register` (STUDENT inutile + écrase cookie admin) | **Corrigé** | Route + `AuthService.register` + `dto/register.dto.ts` + `api.register` + `lib/auth` + `app/register/page.tsx` supprimés ; test 404 |
| 2.3 | `DUMMY_HASH` coût 10 vs 12 | **Corrigé** | `common/utils/bcrypt-cost.ts` (`BCRYPT_COST=12`), `DUMMY_HASH` calculé au démarrage au même coût |
| 2.4 | Pas d'anti-bruteforce par compte | **Corrigé** | `auth/login-attempts.service.ts` (5 échecs/15 min ⇒ verrou 15 min, emails inconnus inclus, 429, mémoire mono-instance documentée) + tests |
| 2.5 | `mustChangePassword` jamais appliqué, pas de changement mdp | **Corrigé** | `POST /auth/change-password` (règles 12–72, ≠ ancien, sans identifiant, `tv++`, re-cookie), `PasswordChangeGuard` global (403 `PASSWORD_CHANGE_REQUIRED`, exemptions me/logout/change-password), flag dans réponse login + tests |
| 2.6 | Pas de cycle de vie modérateurs | **Corrigé** | Migration `user_is_active` (`User.isActive`), `PATCH …/disable|enable`, `POST …/reset-password` (403 si ADMIN/soi-même, `tv++`), `JwtStrategy`+`login` rejettent inactifs, `isActive` exposé + tests |
| 2.7 | JWT 15 min sans refresh (déconnexion en plein upload) | **Corrigé** | Claim `at`, `SlidingSessionInterceptor` global (renouvellement si `exp-now < 5 min` et session < `SESSION_MAX_HOURS` défaut 8), `session` retirée des réponses + tests |
| 2.8 | `/auth/me` 401 pour chaque anonyme | **Corrigé** | `GET /auth/me` public → `{ user }`/`{ user: null }` (200 toujours) ; `lib/auth.tsx` adapté |
| 2.9 | Logout sans révocation | **Corrigé (conservé)** | `tokenVersion++` (tous appareils, documenté), jamais d'échec |
| 3.1 | Ownership fail-open (`uploadedById null` modifiable) | **Corrigé** | `resources.service` update/remove stricts + tests (orpheline réservée admin) |
| 3.2 | Déplacement école/matière sans recâblage | **Corrigé** | `campusId`/`schoolId` réservés ADMIN (403 modo), recâblage `updateMany` en `$transaction` + tests |
| 3.3 | Cascades + R2 orphelins | **Corrigé** | 409 si ressources (campus/école/matière), migration `Restrict` sur les 3 relations `Resource` + tests |
| 3.4 | 200 + corps vide, `findAll` campus lourd | **Corrigé** | 404 sur les 3 `findOne`, `campuses.findAll` en `select` + `_count` (compat frontend vérifiée) + tests |
| 4.1 | DTO sans bornes, `2030` en dur | **Corrigé** | Tous DTO resserrés (titres 3–200, desc ≤2000/500, L1–M2, S1–S6, année dynamique `MaxAcademicYearConstraint`, tags ≤10 × 1–30, slugs regex, couleur hex, `IsNotEmpty` FK, `CreateModeratorDto.email` 254 + minuscules) ; tags normalisés (minuscules/dédupliqués) + recherche compatible historique + tests |
| 4.2 | Index trigram hors Prisma (drift) | **Corrigé** | `postgresqlExtensions` + `extensions=[pg_trgm]` + 2 index `Gin` mappés sur les existants ; migration `trigram_managed` **idempotente** (`IF NOT EXISTS`, sûre pour Neon) ; `prisma validate` OK |
| 4.3 | Streams non détruits, compteur bloquant/compté en double, nom interne exposé | **Corrigé** | `stream.destroy()` sur `close`, `countDownloadOnce` (fire-and-forget, dédup ip+ressource 10 min, ignore `Range`), nom exposé `${slug}.${ext}` (streams + signées) + tests ; pool Neon documenté (`.env.example` + README, pas de `DIRECT_URL`) |
| 5 | Seed destructif par défaut, secrets en dur | **Corrigé** | `seed.ts` idempotent (upserts, admin créé seulement si absent, ressources jamais touchées), reset triple-verrou (`SEED_RESET`+`CONFIRM_WIPE`=nom base+`ALLOW_SEED` en prod, alerte R2), plus aucun défaut codé en dur, mdp validé (warn dev / erreur prod), textes « l'ISM » ; vérifié en local (idempotence ×2, refus, reset) |
| 6 | Vulnérabilités dépendances | **Corrigé (partiel, voir §4)** | Backend : multer `1.4.5`→`2.4.0` (+`overrides`), bcrypt `5`→`6.0.0`, express explicite `4.22.3` (**version unique**, y compris swagger), `npm update` mineurs/patch, `audit fix` dev. Runtime : **0 critical** (était 1), high 6→2. Frontend : next déjà en dernière `14.2.x` (14.2.35), postcss/tailwind patchés, build vert. Racine : doublon `@aws-sdk/client-s3` supprimé. Vérifié : build + 31 e2e + seed local |
| 7.1 | Erreurs API avalées/JSON brut | **Corrigé** | `ApiError(status,message,code)` + `apiPost/apiPatch/apiDelete/apiUpload`, réseau ⇒ `ApiError(0, …)` |
| 7.2 | Échecs silencieux admin/upload | **Corrigé** | Helpers partout, messages `role="status"`, 401 upload ⇒ « session expirée » **sans perdre le formulaire**, `PASSWORD_CHANGE_REQUIRED` ⇒ redirection |
| 7.3 | Auth frontend | **Corrigé** | `lib/auth` (`{ user }`, plus de `register`, `refresh()`), login 401/429/0 distincts, `type=email`/`autoComplete`, page `/compte/mot-de-passe` + redirection auto, lien Header |
| 7.4 | Admin incomplet | **Corrigé** | Ressources paginées tous statuts (filtres+recherche, édition, suppression confirmée, boutons selon ownership), écoles/matières (liste, édition, suppression confirmée, 409 affichée), modérateurs (statut, activer/désactiver, reset + affichage unique) |
| 7.5 | Détail ressource | **Corrigé** | Download `${slug}.${ext}`, statut masqué au public, blob révoqué via ref (fuite corrigée) |
| 7.6 | Next/cookie inter-sites | **Corrigé** | `connect-src` déduit de `NEXT_PUBLIC_API_URL` (`/api` ⇒ `'self'`), rewrites aussi en prod si `BACKEND_URL`, `output: standalone`, doc first-party (`/api` + `BACKEND_URL`) |
| 7.7 | Accessibilité | **Corrigé** | `<label>`/`aria-label` sur tous les champs (login, upload, admin, mot de passe, filtres, recherche), `aria-label` boutons-icônes, `:focus-visible`, `role=status/alert`. Badges : aucune non-conformité de contraste relevée visuellement (à valider au lecteur d'écran) |
| 7.8 | Légal/retrait/contact | **Corrigé** | Pages `/mentions-legales` + `/cgu` (mentions **À COMPLÉTER** signalées, rien d'inventé), lien « Signaler » (`mailto` + titre/slug), `CONTACT_EMAIL` unique (`NEXT_PUBLIC_CONTACT_EMAIL`, repli inchangé) — corrige aussi le `mailto` ≠ texte affiché |
| 7.9 | BOM/`any` | **Corrigé** | BOM retirés (14 fichiers), `frontend/types/` + usages typés, `tsc` vert |
| 8.1 | Pas de Dockerfiles | **Corrigé** | `backend/Dockerfile` + `frontend/Dockerfile` (multi-étapes, `node:20-bookworm-slim`, non-root, `HEALTHCHECK`, migrations **hors** démarrage) + `.dockerignore` (jamais de `.env` réel) — images **non buildées** (long, à faire au déploiement) |
| 8.2 | Compose dev-only | **Corrigé** | `127.0.0.1:5432`, `POSTGRES_PASSWORD` via env, healthcheck, init `ism_agi_test`, services `backend`/`frontend` sous `profiles: ["app"]` ; `docker compose config` vert |
| 8.3 | Pas de CI | **Corrigé** | `.github/workflows/ci.yml` (Node 20 + Postgres service, backend : ci→generate→migrate→`lint:ci`→build→e2e, frontend : ci→tsc→build, audits `continue-on-error`) — **non exécutée ici** (pas d'Actions en local) |
| 8.4 | README obsolète/fuitard | **Corrigé** | Réécriture complète (seed exact, ADMIN-only, endpoints à jour dont health/change-password/modérateurs, **aucun hostname/valeur réelle**, tableau de **toutes** les variables, déploiement/cookie/sessions/mono-instance, migrations, note `DIRECT_URL`, `pack`) |
| 8.5 | Livrable propre | **Corrigé (partiel)** | `.gitignore` (+`*.tsbuildinfo`, `.env.test`, `test/tmp/`), `npm run pack` ajouté, `backend/*.log` + `backend/dist` + `frontend/.next` + `tsconfig.tsbuildinfo` supprimés (`.env`, `.env.local`, PDF conservés). **Non vérifiable par `git ls-files` : pas de dépôt git** |
| 9 | Hygiène | **Corrigé** | Legacy `StorageService` (3 méthodes), `ALLOWED_MIMES`, `&& false` supprimés (recherche repo préalable) ; `getSignedUrl` **conservé** (fallback d'interface utilisé) ; `AuthUser`/`AuthenticatedRequest`/`SessionInfo`, `findOne` factorisé (`isVisible`), import `NotFoundException` statique ; **`noImplicitAny: true` activé** (build vert) ; `strict` global non activé (volontaire, risque de régression) |

## 2. Écarts au prompt et décisions (variante la plus sûre)
1. Pas de git → aucun commit/push ; travail direct, rapport en lieu et place.
2. Port 5432 occupé → vérifications sur conteneur éphémère `:5433` (distant jamais touché) ; fichiers validés pour `:5432`.
3. `handleRequest` du `JwtAuthGuard` : `any` **explicites** conservés (l'interface générique `IAuthGuard` de passport les impose ; `unknown` casse l'assignation — vérifié).
4. Trigram : syntaxe `ops: raw()` acceptée (`prisma validate` OK) ; migration éditée `IF NOT EXISTS` (idempotente Neon, `migrate status` propre en local).
5. Bruteforce e2e : `X-Forwarded-For` distincts par tentative pour isoler le verrou-compte du throttle IP (les deux couches renvoient 429) ; test service blanc en complément.
6. `strict` global non activé ; `noImplicitAny` activé (0 erreur, build vert).
7. Images Docker non buildées, CI non exécutée (impossibles/sensées uniquement au déploiement/CI).
8. Dette `any` résiduelle : décorateurs/guards liés aux types Nest (`getRequest()`, stratégies passport), DTO runtime `tags`, réponses `fetch().blob()` — 42 warnings `no-explicit-any` restants (0 erreur), traçabilité conservée.

## 3. Commandes manuelles (propriétaire, dans l'ordre)
```bash
# 1. Sauvegarde/snapshot Neon (dashboard)
# 2. Appliquer les migrations (depuis backend/, DATABASE_URL de production) :
npx prisma migrate deploy
# Migrations livrées : user_is_active, restrict_resource_relations, trigram_managed (+ antérieures)
# 3. Redémarrer l'API (node dist/main ou npm run start:prod)
# 4. Vérifier : GET /api/health → { "status": "ok", "db": "up" }
# 5. Re-seed si besoin (additif, sans wipe) : SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… npx prisma db seed
```

## 4. Variables ajoutées (toutes optionnelles, avec défaut)
`TRUST_PROXY_HOPS` (1), `SESSION_MAX_HOURS` (8), `NEXT_PUBLIC_CONTACT_EMAIL` (repli existant),
`SEED_RESET`/`CONFIRM_WIPE`/`ALLOW_SEED` (seed), `BACKEND_URL` (rewrites prod), `POSTGRES_PASSWORD` (compose local).
Aucune dépendance runtime ajoutée.

## 5. Risques restants et prochaines étapes
1. **Secrets toujours exposés** (mot de passe Neon, clés R2, `JWT_SECRET`, mdp admin) tant que l'archive d'origine circule : **rotation impérative avant toute mise en ligne publique** (reporté §12 du prompt).
2. Vulnérabilités majeures uniquement : `next` (critical) + `postcss` imbriqué, `js-yaml`/`lodash` via `@nestjs/swagger`, `@nestjs/*` (moderate, fix v12) → **phase séparée Next 15/16 + React 19 + Nest 11** (risques : breaking changes SSR, React 19, décorateurs).
3. `DIRECT_URL` Neon à ajouter plus tard pour les migrations via pooler.
4. Redis si multi-instances (throttle + verrouillage) ; refresh tokens persistants/SSO hors périmètre.
5. CI à observer au premier push ; images Docker à builder au déploiement.

## 6. Dette volontairement non traitée
`strict` global, `any` framework (passport/Nest), refonte streaming→signed-URLs par défaut,
scan antivirus uploads, CAPTCHA login, pagination `users.findAll`, compteur via file d'attente,
tests unitaires purs (couverture via e2e : **31/31 verts** en local).
