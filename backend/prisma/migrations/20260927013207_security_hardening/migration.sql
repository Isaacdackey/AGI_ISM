-- DropIndex
DROP INDEX "Resource_description_trgm_idx";

-- DropIndex
DROP INDEX "Resource_title_trgm_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;
