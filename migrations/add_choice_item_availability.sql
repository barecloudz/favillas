-- Add availability columns to choice_items table
ALTER TABLE choice_items
ADD COLUMN IF NOT EXISTS is_temporarily_unavailable BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS unavailable_reason TEXT;

-- Add index for faster queries on availability status
CREATE INDEX IF NOT EXISTS idx_choice_items_availability
ON choice_items(is_temporarily_unavailable)
WHERE is_temporarily_unavailable = TRUE;
