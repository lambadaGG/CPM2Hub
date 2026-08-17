-- Add guide_url column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS guide_url TEXT;
