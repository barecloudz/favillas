-- Migration: Add category availability tracking
-- Run this first

-- Add temporary unavailability tracking to categories table
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS is_temporarily_unavailable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS unavailability_reason TEXT,
ADD COLUMN IF NOT EXISTS unavailable_since TIMESTAMP,
ADD COLUMN IF NOT EXISTS unavailable_until TIMESTAMP;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_categories_availability
ON categories(is_active, is_temporarily_unavailable);

-- Add comment
COMMENT ON COLUMN categories.is_temporarily_unavailable IS 'True when category is temporarily out of stock (separate from permanent is_active flag)';
COMMENT ON COLUMN categories.unavailability_reason IS 'Optional reason for unavailability (e.g., "Out of ingredients")';
COMMENT ON COLUMN categories.unavailable_since IS 'Timestamp when category was marked unavailable';
COMMENT ON COLUMN categories.unavailable_until IS 'Optional timestamp for automatic re-enabling';
