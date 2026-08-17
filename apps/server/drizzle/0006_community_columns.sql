-- Drizzle migration: sync products/trades columns with apps/server/src/db/schema.ts
-- (production schema was drifted from the SQL migration history)

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "seller_id" integer REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "media_type" text;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "preview_url" text;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "video_url" text;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "audio_url" text;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "before_url" text;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "after_url" text;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "server_name" text;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "params" jsonb;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "moderation_status" text NOT NULL DEFAULT 'approved';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_seller_idx" ON "products" ("seller_id");
--> statement-breakpoint

ALTER TABLE "trades" ADD COLUMN IF NOT EXISTS "peer_user_id" integer REFERENCES "users"("id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trades_creator_idx" ON "trades" ("creator_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trades_peer_user_idx" ON "trades" ("peer_user_id");
