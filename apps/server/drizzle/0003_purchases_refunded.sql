ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "refunded" boolean NOT NULL DEFAULT false;
