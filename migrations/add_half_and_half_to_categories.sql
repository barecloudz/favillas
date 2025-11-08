-- Add enable_half_and_half field to categories table
-- This allows admins to enable the "Customize each half" feature for specific categories

ALTER TABLE categories ADD COLUMN IF NOT EXISTS enable_half_and_half BOOLEAN DEFAULT FALSE;

-- Enable half-and-half for Traditional and Specialty Gourmet Pizza categories by default
UPDATE categories
SET enable_half_and_half = TRUE
WHERE name IN ('Traditional Pizza', 'Specialty Gourmet Pizza');
