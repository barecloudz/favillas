-- Restore calzone items that got orphaned again
-- Category was changed from "calzone h" to "calzones" but items weren't updated

-- Show current state
SELECT 'CALZONE CATEGORY:' as status;
SELECT id, name FROM categories WHERE name LIKE '%calzone%';

SELECT 'ORPHANED CALZONE ITEMS:' as status;
SELECT id, name, category, base_price FROM menu_items WHERE category LIKE '%calzone%';

-- Restore items to correct category
UPDATE menu_items 
SET category = 'calzones'
WHERE category = 'calzone h';

-- Verify
SELECT 'RESTORED ITEMS:' as status;
SELECT id, name, category, base_price FROM menu_items WHERE category = 'calzones';
