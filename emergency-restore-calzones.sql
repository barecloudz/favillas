-- Emergency restore of calzones items that were orphaned
-- Items were updated to "calzones H" but category is still "calzones"

-- Show current state
SELECT 'CURRENT CALZONES CATEGORY:' as status;
SELECT id, name FROM categories WHERE name LIKE '%calzone%';

SELECT 'ORPHANED CALZONES ITEMS:' as status;
SELECT id, name, category, base_price FROM menu_items WHERE category = 'calzones H';

-- Restore items back to original category
UPDATE menu_items 
SET category = 'calzones'
WHERE category = 'calzones H';

-- Verify restore
SELECT 'RESTORED ITEMS:' as status;
SELECT id, name, category, base_price FROM menu_items WHERE category = 'calzones';

-- Check for any remaining orphaned items
SELECT 'REMAINING ORPHANS:' as status;
SELECT COUNT(*) as orphaned_count
FROM menu_items m
LEFT JOIN categories c ON m.category = c.name
WHERE c.name IS NULL;
