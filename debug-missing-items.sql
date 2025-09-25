-- Debug why items aren't showing up in menu editor after SQL update

-- 1. Check if any items still have the old category name
SELECT 'ITEMS WITH OLD CATEGORY NAME:' as status;
SELECT COUNT(*) as count, 'items still with old name' as description
FROM menu_items 
WHERE category = '10 inch specialty Gourmet Pizzas';

-- Show specific items if any exist with old name
SELECT 'SPECIFIC ITEMS WITH OLD NAME:' as status;
SELECT id, name, category, base_price, is_available
FROM menu_items 
WHERE category = '10 inch specialty Gourmet Pizzas'
LIMIT 5;

-- 2. Check if items now have the new category name
SELECT 'ITEMS WITH NEW CATEGORY NAME:' as status;
SELECT COUNT(*) as count, 'items with new category name' as description
FROM menu_items 
WHERE category = 'Specialty Gourmet Pizzas';

-- Show specific items with new name
SELECT 'SPECIFIC ITEMS WITH NEW NAME:' as status;
SELECT id, name, category, base_price, is_available
FROM menu_items 
WHERE category = 'Specialty Gourmet Pizzas'
ORDER BY name
LIMIT 10;

-- 3. Check if the category exists in categories table
SELECT 'CATEGORY EXISTS CHECK:' as status;
SELECT id, name, is_active, "order"
FROM categories 
WHERE name = 'Specialty Gourmet Pizzas';

-- 4. Check all categories that exist
SELECT 'ALL CATEGORIES:' as status;
SELECT id, name, is_active, "order"
FROM categories 
ORDER BY "order", name;

-- 5. Check all distinct categories in menu_items
SELECT 'ALL MENU ITEM CATEGORIES:' as status;
SELECT DISTINCT category, COUNT(*) as item_count
FROM menu_items 
GROUP BY category
ORDER BY item_count DESC;

-- 6. Check for any items that might be inactive
SELECT 'INACTIVE ITEMS IN NEW CATEGORY:' as status;
SELECT COUNT(*) as inactive_count
FROM menu_items 
WHERE category = 'Specialty Gourmet Pizzas' 
AND is_available = false;

-- 7. Look for any similar category names
SELECT 'SIMILAR CATEGORY NAMES:' as status;
SELECT DISTINCT category
FROM menu_items 
WHERE category ILIKE '%specialty%' 
   OR category ILIKE '%gourmet%'
   OR category ILIKE '%pizza%'
ORDER BY category;
