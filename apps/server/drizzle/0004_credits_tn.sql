-- Drizzle migration: internal TN currency on users
-- Generated from apps/server/src/db/schema.ts (users.creditsTn)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "credits_tn" integer NOT NULL DEFAULT 0;
