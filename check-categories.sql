-- Check current database state
SELECT 'CATEGORIES COUNT:' as info, COUNT(*) as count FROM categories;

SELECT 'ALL CATEGORIES:' as info;
SELECT id, name, "order", is_active, created_at FROM categories ORDER BY "order", name;

SELECT 'MENU ITEMS COUNT:' as info, COUNT(*) as count FROM menu_items;

SELECT 'ITEMS BY CATEGORY:' as info;
SELECT category, COUNT(*) as item_count FROM menu_items GROUP BY category ORDER BY item_count DESC LIMIT 10;