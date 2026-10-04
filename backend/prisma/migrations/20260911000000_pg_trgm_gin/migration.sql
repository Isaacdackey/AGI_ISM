-- Enable pg_trgm for trigram GIN indexes (recherche insensible à la casse)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes for Resource title/description (utilisés par `contains` mode insensitive)
CREATE INDEX IF NOT EXISTS "Resource_title_trgm_idx" ON "Resource" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Resource_description_trgm_idx" ON "Resource" USING GIN ("description" gin_trgm_ops);
