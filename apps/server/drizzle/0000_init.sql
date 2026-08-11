-- Drizzle migration: initial schema (PostgreSQL)
-- Generated from apps/server/src/db/schema.ts

-- USERS
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "telegram_id" BIGINT NOT NULL,
  "username" TEXT,
  "first_name" TEXT NOT NULL,
  "language" TEXT,
  "credits_stars" INTEGER NOT NULL DEFAULT 0,
  "created_at" BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_telegram_id_idx" ON "users" ("telegram_id");

-- PRODUCTS
CREATE TABLE IF NOT EXISTS "products" (
  "id" SERIAL PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT NOT NULL,
  "price_stars" INTEGER NOT NULL,
  "downloads" INTEGER NOT NULL DEFAULT 0,
  "verified" BOOLEAN NOT NULL DEFAULT TRUE,
  "glyph" TEXT NOT NULL,
  "config_code" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "sort_order" INTEGER NOT NULL DEFAULT 0
);

-- PURCHASES
CREATE TABLE IF NOT EXISTS "purchases" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "product_id" INTEGER NOT NULL REFERENCES "products"("id"),
  "charge_id" TEXT,
  "payload" TEXT NOT NULL,
  "amount_stars" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS "purchases_user_idx" ON "purchases" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "purchases_charge_idx" ON "purchases" ("charge_id");
CREATE UNIQUE INDEX IF NOT EXISTS "purchases_payload_idx" ON "purchases" ("payload");

-- TRADES
CREATE TABLE IF NOT EXISTS "trades" (
  "id" SERIAL PRIMARY KEY,
  "creator_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "kind" TEXT NOT NULL,
  "offer" TEXT NOT NULL,
  "receive" TEXT NOT NULL,
  "peer" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'waiting',
  "created_at" BIGINT NOT NULL
);

-- Drizzle journal marker
CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
  "id" SERIAL PRIMARY KEY,
  "hash" TEXT NOT NULL,
  "created_at" BIGINT
);
