-- Fix menu items issues
-- 1. Make sure all items are available by default
-- 2. Link menu items to proper category IDs (not just names)

-- First, show current state
SELECT 'CURRENT MENU ITEMS STATE:' as info;
SELECT 'Available items:' as label, COUNT(*) as count FROM menu_items WHERE is_available = true;
SELECT 'Unavailable items:' as label, COUNT(*) as count FROM menu_items WHERE is_available = false;

-- Show items without category_id links
SELECT 'ITEMS WITHOUT CATEGORY_ID:' as info;
SELECT COUNT(*) as count FROM menu_items WHERE category_id IS NULL;

-- Update all items to be available
UPDATE menu_items
SET is_available = true
WHERE is_available = false;

-- Link menu items to category IDs based on category names
UPDATE menu_items
SET category_id = c.id
FROM categories c
WHERE menu_items.category = c.name
AND menu_items.category_id IS NULL;

-- Show final results
SELECT 'AFTER FIXES:' as info;
SELECT 'Total items:' as label, COUNT(*) as count FROM menu_items;
SELECT 'Available items:' as label, COUNT(*) as count FROM menu_items WHERE is_available = true;
SELECT 'Items with category_id:' as label, COUNT(*) as count FROM menu_items WHERE category_id IS NOT NULL;

-- Show items by category with counts
SELECT 'ITEMS BY CATEGORY:' as info;
SELECT c.name as category_name, c.id as category_id, COUNT(m.id) as item_count
FROM categories c
LEFT JOIN menu_items m ON c.id = m.category_id
GROUP BY c.id, c.name
ORDER BY c."order";

SELECT 'SUCCESS: All menu items have been fixed!' as result;