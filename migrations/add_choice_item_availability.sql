-- Migration: Add choice item (size) availability tracking
-- Run this second

-- Add temporary unavailability tracking to choice_items table
ALTER TABLE choice_items
ADD COLUMN IF NOT EXISTS is_temporarily_unavailable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS unavailability_reason TEXT,
ADD COLUMN IF NOT EXISTS unavailable_since TIMESTAMP;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_choice_items_availability
ON choice_items(is_active, is_temporarily_unavailable);

-- Add comment
COMMENT ON COLUMN choice_items.is_temporarily_unavailable IS 'True when size/option is temporarily out of stock (separate from permanent is_active flag)';
COMMENT ON COLUMN choice_items.unavailability_reason IS 'Optional reason for unavailability (e.g., "Out of large dough")';
COMMENT ON COLUMN choice_items.unavailable_since IS 'Timestamp when choice item was marked unavailable';
