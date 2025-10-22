-- Migration: Fix garlic knot slider choice prices
-- Purpose: Set garlic knot slider choice items to $0.00 (they should be free selections like wing flavors)
-- Date: 2025-10-21

-- Find and fix choice items in "Garlic Rolls" or "Garlic Roll Size" groups
-- These should be free selections, not add-ons
UPDATE choice_items
SET price = 0.00
WHERE choice_group_id IN (
  SELECT id FROM choice_groups
  WHERE name ILIKE '%garlic roll%'
);

-- Verification query
-- SELECT cg.name as group_name, ci.name as choice_name, ci.price
-- FROM choice_items ci
-- JOIN choice_groups cg ON ci.choice_group_id = cg.id
-- WHERE cg.name ILIKE '%garlic roll%';
