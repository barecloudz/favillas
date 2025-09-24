-- Debug categories and menu items relationship in detail

SELECT 'CATEGORIES TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;

SELECT 'MENU_ITEMS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'menu_items'
ORDER BY ordinal_position;

SELECT 'CATEGORIES DATA:' as info;
SELECT id, name, "order", is_active FROM categories ORDER BY "order";

SELECT 'MENU ITEMS SAMPLE:' as info;
SELECT id, name, category, is_available FROM menu_items LIMIT 5;

SELECT 'CATEGORIES WITH ITEM COUNTS:' as info;
SELECT
    c.id,
    c.name as category_name,
    c."order",
    c.is_active,
    COUNT(m.id) as item_count
FROM categories c
LEFT JOIN menu_items m ON c.name = m.category
GROUP BY c.id, c.name, c."order", c.is_active
ORDER BY c."order";

SELECT 'MENU ITEMS WITHOUT MATCHING CATEGORIES:' as info;
SELECT DISTINCT category as orphaned_category, COUNT(*) as item_count
FROM menu_items m
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.name = m.category
)
GROUP BY category;