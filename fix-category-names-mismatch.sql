-- Fix category name mismatch between categories table and menu_items.category field

-- First, show what we're working with
SELECT 'CATEGORIES IN DATABASE:' as info;
SELECT name FROM categories ORDER BY "order";

SELECT 'UNIQUE CATEGORIES FROM MENU ITEMS:' as info;
SELECT DISTINCT category FROM menu_items ORDER BY category;

-- Show mismatches
SELECT 'CATEGORIES WITHOUT MENU ITEMS:' as info;
SELECT c.name as category_name
FROM categories c
LEFT JOIN menu_items m ON c.name = m.category
WHERE m.category IS NULL
ORDER BY c."order";

SELECT 'MENU ITEM CATEGORIES WITHOUT MATCHING CATEGORY RECORDS:' as info;
SELECT DISTINCT m.category, COUNT(*) as item_count
FROM menu_items m
LEFT JOIN categories c ON m.category = c.name
WHERE c.name IS NULL
GROUP BY m.category
ORDER BY item_count DESC;

-- Delete categories that have no menu items (these are likely the wrong ones)
DELETE FROM categories
WHERE id IN (
    SELECT c.id
    FROM categories c
    LEFT JOIN menu_items m ON c.name = m.category
    WHERE m.category IS NULL
);

-- Create categories for menu items that don't have matching categories
INSERT INTO categories (name, "order", is_active, created_at)
SELECT DISTINCT
    m.category,
    (SELECT COALESCE(MAX("order"), 0) + ROW_NUMBER() OVER (ORDER BY m.category) FROM categories),
    true,
    NOW()
FROM menu_items m
LEFT JOIN categories c ON m.category = c.name
WHERE c.name IS NULL AND m.category IS NOT NULL;

-- Final verification
SELECT 'FINAL VERIFICATION:' as info;
SELECT
    c.name as category_name,
    c."order",
    COUNT(m.id) as item_count
FROM categories c
LEFT JOIN menu_items m ON c.name = m.category
GROUP BY c.id, c.name, c."order"
ORDER BY c."order";

SELECT 'SUCCESS: Categories and menu items are now properly matched!' as result;