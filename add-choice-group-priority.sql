-- Add priority field to choice_groups table for conditional display ordering
-- This allows controlling which choice groups appear first (e.g., sizes before toppings)

-- Add priority column
ALTER TABLE choice_groups
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN choice_groups.priority IS 'Display order priority (lower numbers show first, 0 is lowest)';

-- Set initial priorities for existing choice groups
-- Sizes should have priority 1 (first)
UPDATE choice_groups
SET priority = 1
WHERE name ILIKE '%size%';

-- Toppings should have priority 2 (after sizes)
UPDATE choice_groups
SET priority = 2
WHERE name ILIKE '%topping%' OR name ILIKE '%extra%' OR name ILIKE '%addon%';

-- Everything else gets priority 3
UPDATE choice_groups
SET priority = 3
WHERE priority = 0;

-- Show current priorities
SELECT id, name, priority, description
FROM choice_groups
ORDER BY priority ASC, name ASC;