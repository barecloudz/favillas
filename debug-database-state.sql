-- Debug script to check the current database state

-- Check categories table structure
SELECT 'CATEGORIES TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;

-- Check if categories table exists and what's in it
SELECT 'CATEGORIES IN DATABASE:' as info;
SELECT COUNT(*) as category_count FROM categories;

-- Show all categories
SELECT 'ALL CATEGORIES:' as info;
SELECT id, name, "order", is_active, created_at FROM categories ORDER BY "order", name;

-- Check menu_items table
SELECT 'MENU ITEMS COUNT:' as info;
SELECT COUNT(*) as item_count FROM menu_items;

-- Check menu items without valid categories
SELECT 'MENU ITEMS WITH INVALID CATEGORIES:' as info;
SELECT DISTINCT m.category, COUNT(*) as item_count
FROM menu_items m
LEFT JOIN categories c ON m.category = c.name
WHERE c.name IS NULL
GROUP BY m.category
ORDER BY item_count DESC;

-- Check menu items by category
SELECT 'MENU ITEMS BY CATEGORY:' as info;
SELECT m.category, COUNT(*) as item_count
FROM menu_items m
GROUP BY m.category
ORDER BY item_count DESC;

-- Show sample menu items
SELECT 'SAMPLE MENU ITEMS:' as info;
SELECT id, name, category, base_price, is_available FROM menu_items LIMIT 10;