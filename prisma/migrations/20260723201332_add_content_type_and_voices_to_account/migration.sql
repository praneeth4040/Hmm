-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "content_type_id" TEXT,
ADD COLUMN     "voices" JSONB DEFAULT '[]';
