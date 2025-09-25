-- Check current categories and orphaned menu items
-- This will help identify what category name was changed and what items need fixing

-- 1. Current categories
SELECT 'CURRENT CATEGORIES:' as section, id, name, "order", is_active
FROM categories
ORDER BY "order", name;

-- 2. Distinct category values from menu items
SELECT 'MENU ITEM CATEGORIES:' as section, category as name, COUNT(*) as item_count
FROM menu_items
GROUP BY category
ORDER BY item_count DESC;

-- 3. Categories that exist in categories table but have no menu items
SELECT 'CATEGORIES WITH NO ITEMS:' as section, c.name, c.id
FROM categories c
LEFT JOIN menu_items m ON c.name = m.category
WHERE m.category IS NULL;

-- 4. Menu items with categories that don't exist in categories table
SELECT 'ORPHANED MENU ITEMS:' as section, m.category, COUNT(*) as orphaned_items
FROM menu_items m
LEFT JOIN categories c ON m.category = c.name
WHERE c.name IS NULL
GROUP BY m.category;

-- 5. Sample orphaned menu items to see what they are
SELECT 'SAMPLE ORPHANED ITEMS:' as section, id, name, category, base_price
FROM menu_items m
LEFT JOIN categories c ON m.category = c.name
WHERE c.name IS NULL
LIMIT 10;
