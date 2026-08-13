-- Drizzle migration: stars top-up
-- Generated from apps/server/src/db/schema.ts (topups table)

CREATE TABLE IF NOT EXISTS "topups" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "charge_id" TEXT,
  "payload" TEXT NOT NULL,
  "amount_stars" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS "topups_user_idx" ON "topups" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "topups_charge_idx" ON "topups" ("charge_id");
CREATE UNIQUE INDEX IF NOT EXISTS "topups_payload_idx" ON "topups" ("payload");
