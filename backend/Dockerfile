# ---- build ----
FROM node:20-bookworm-slim AS build
# CLI OpenSSL requis pour que Prisma détecte openssl-3.0.x
# (sans lui : fallback silencieux vers openssl-1.1.x puis crash au runtime).
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
# Échoue explicitement si le moteur 3.0.x n'est pas généré (au lieu d'un crash runtime obscur).
RUN npx prisma generate && ls node_modules/.prisma/client | grep -q "debian-openssl-3.0.x"
COPY . .
RUN npm run build

# ---- runtime ----
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd -r app && useradd -r -g app app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma
USER app
EXPOSE 4000
# Les migrations ne sont PAS exécutées au démarrage (commande séparée : npx prisma migrate deploy).
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||'4000')+'/api/health').then(function(r){if(!r.ok)process.exit(1)}).catch(function(){process.exit(1)})"
CMD ["node", "dist/main"]
