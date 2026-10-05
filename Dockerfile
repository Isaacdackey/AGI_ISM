# Service unique : backend Nest (interne :4000) + frontend Next standalone (public :$PORT).
# Le front rewrite /api/* -> backend interne => même origine, cookie first-party.
# Contexte de build : racine du repo. Dockerfile Path Render : ./Dockerfile

# ---- backend build ----
FROM node:20-bookworm-slim AS backend-build
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /build/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/prisma ./prisma
RUN npx prisma generate && ls node_modules/.prisma/client | grep -q "debian-openssl-3.0.x"
COPY backend/ ./
RUN npm run build

# ---- frontend build (NEXT_PUBLIC_API_URL=/api gravé au build : même origine) ----
# BACKEND_URL gravé AUSSI au build : Next bake les rewrites dans le standalone,
# la valeur runtime seule ne suffit pas. Le backend interne est toujours 127.0.0.1:4000.
FROM node:20-bookworm-slim AS frontend-build
WORKDIR /build/frontend
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=/api
ENV BACKEND_URL=http://127.0.0.1:4000
ENV BACKEND_PORT=4000
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- runtime combiné ----
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/* \
  && groupadd -r app && useradd -r -g app app

# Backend : deps prod + dist + client Prisma + migrations
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev && npm cache clean --force
COPY --from=backend-build /build/backend/dist ./backend/dist
COPY --from=backend-build /build/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY --from=backend-build /build/backend/node_modules/@prisma ./backend/node_modules/@prisma
COPY backend/prisma ./backend/prisma

# Frontend standalone : server.js + statiques + public
COPY --from=frontend-build /build/frontend/public ./frontend/public
COPY --from=frontend-build --chown=app:app /build/frontend/.next/standalone ./frontend/
COPY --from=frontend-build --chown=app:app /build/frontend/.next/static ./frontend/.next/static

# Lanceur combiné
COPY scripts/start-combined.cjs ./scripts/start-combined.cjs
RUN chown -R app:app /app/frontend /app/backend ./scripts
USER app
EXPOSE 3000
# Healthcheck sur le front public (PORT dynamique Render), qui prouve aussi le rewrite /api.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||'3000')+'/').then(function(r){if(!r.ok)process.exit(1)}).catch(function(){process.exit(1)})"
CMD ["node", "scripts/start-combined.cjs"]
