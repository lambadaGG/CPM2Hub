-- Drizzle migration: add trades.updated_at
ALTER TABLE "trades" ADD COLUMN IF NOT EXISTS "updated_at" BIGINT NOT NULL DEFAULT 0;
