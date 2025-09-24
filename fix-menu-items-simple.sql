-- Simple fix for menu items
-- 1. Make all items available
-- 2. Link items to category IDs

-- Show current state first
SELECT 'BEFORE FIXES:' as status;
SELECT COUNT(*) as total_items FROM menu_items;
SELECT COUNT(*) as available_items FROM menu_items WHERE is_available = true;
SELECT COUNT(*) as items_with_category_id FROM menu_items WHERE category_id IS NOT NULL;

-- Fix 1: Make all items available
UPDATE menu_items SET is_available = true;

-- Fix 2: Link menu items to category IDs based on category names
UPDATE menu_items
SET category_id = (
  SELECT id FROM categories
  WHERE categories.name = menu_items.category
  LIMIT 1
)
WHERE category_id IS NULL;

-- Show results
SELECT 'AFTER FIXES:' as status;
SELECT COUNT(*) as total_items FROM menu_items;
SELECT COUNT(*) as available_items FROM menu_items WHERE is_available = true;
SELECT COUNT(*) as items_with_category_id FROM menu_items WHERE category_id IS NOT NULL;

-- Show sample of items by category
SELECT 'ITEMS BY CATEGORY:' as info;
SELECT c.name as category, COUNT(m.id) as item_count
FROM categories c
LEFT JOIN menu_items m ON c.id = m.category_id
GROUP BY c.id, c.name
ORDER BY c."order"
LIMIT 10;

SELECT 'Menu items fixed successfully!' as result;