-- Drizzle migration: community v2 features
-- 1. New product categories: service, smoke, character, bundle (category stays TEXT, schema-level enum)
-- 2. users: referral fields + daily streak
-- 3. New tables: product_ratings, wishlist, daily_claims

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referral_code" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referred_by" integer;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "streak" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_claim_at" bigint;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "users_referral_code_idx" ON "users" ("referral_code");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "product_ratings" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users" ("id"),
  "product_id" integer NOT NULL REFERENCES "products" ("id"),
  "value" integer NOT NULL,
  "created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ratings_user_idx" ON "product_ratings" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ratings_product_idx" ON "product_ratings" ("product_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ratings_user_product_idx" ON "product_ratings" ("user_id", "product_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "wishlist" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users" ("id"),
  "product_id" integer NOT NULL REFERENCES "products" ("id"),
  "created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wishlist_user_product_idx" ON "wishlist" ("user_id", "product_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "daily_claims" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users" ("id"),
  "claim_date" text NOT NULL,
  "streak" integer NOT NULL DEFAULT 1,
  "reward_stars" integer NOT NULL DEFAULT 0,
  "bonus_stars" integer NOT NULL DEFAULT 0,
  "created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "daily_claims_user_date_idx" ON "daily_claims" ("user_id", "claim_date");
