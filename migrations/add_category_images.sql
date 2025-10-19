-- Add image_url column to categories table for category cards
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;
