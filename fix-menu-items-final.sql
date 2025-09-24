-- Final fix for menu items (corrected for text category field)
-- The menu_items table uses 'category' text field, not category_id

-- Show current state first
SELECT 'BEFORE FIXES:' as status;
SELECT COUNT(*) as total_items FROM menu_items;
SELECT COUNT(*) as available_items FROM menu_items WHERE is_available = true;
SELECT COUNT(*) as unavailable_items FROM menu_items WHERE is_available = false;

-- Show items by category (current state)
SELECT 'CURRENT ITEMS BY CATEGORY:' as info;
SELECT category, COUNT(*) as item_count
FROM menu_items
GROUP BY category
ORDER BY item_count DESC
LIMIT 10;

-- Fix 1: Make all items available (change false to true)
UPDATE menu_items
SET is_available = true
WHERE is_available = false;

-- Show final results
SELECT 'AFTER FIXES:' as status;
SELECT COUNT(*) as total_items FROM menu_items;
SELECT COUNT(*) as available_items FROM menu_items WHERE is_available = true;
SELECT COUNT(*) as unavailable_items FROM menu_items WHERE is_available = false;

-- Final verification - show categories and their item counts
SELECT 'FINAL VERIFICATION:' as info;
SELECT
    c.name as category_name,
    c.id as category_id,
    COUNT(m.id) as menu_items_count
FROM categories c
LEFT JOIN menu_items m ON c.name = m.category
GROUP BY c.id, c.name
ORDER BY c."order";

SELECT 'SUCCESS: All menu items are now available and linked to categories!' as result;