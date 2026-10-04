-- Gère les index trigram via Prisma (map sur ceux de 20260911000000_pg_trgm_gin).
-- IF NOT EXISTS : idempotent sur les bases où l'ancienne migration les a déjà créés (ex. Neon).
CREATE INDEX IF NOT EXISTS "Resource_title_trgm_idx" ON "Resource" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Resource_description_trgm_idx" ON "Resource" USING GIN ("description" gin_trgm_ops);
