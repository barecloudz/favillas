-- Restore menu items that were orphaned when category name was changed
-- Original category: "10 inch specialty Gourmet Pizzas" 
-- Need to find what the new category name is and update the menu items

-- First, let's see what categories exist now
SELECT 'CURRENT CATEGORIES:' as info;
SELECT id, name, "order", is_active FROM categories ORDER BY "order";

-- Check for orphaned items with the old category name
SELECT 'ORPHANED ITEMS WITH OLD CATEGORY NAME:' as info;
SELECT id, name, category, base_price 
FROM menu_items 
WHERE category = '10 inch specialty Gourmet Pizzas';

-- Check all menu items with category patterns containing "pizza", "gourmet", or "specialty"
SELECT 'ITEMS WITH PIZZA/GOURMET/SPECIALTY IN CATEGORY:' as info;
SELECT DISTINCT category, COUNT(*) as item_count
FROM menu_items 
WHERE category ILIKE '%pizza%' OR category ILIKE '%gourmet%' OR category ILIKE '%specialty%'
GROUP BY category
ORDER BY item_count DESC;

-- Find the most likely new category name (probably something with Pizza in it)
SELECT 'CATEGORIES CONTAINING PIZZA:' as info;
SELECT id, name 
FROM categories 
WHERE name ILIKE '%pizza%' 
ORDER BY "order";

-- Once we identify the correct new category name, we'll update the orphaned items
-- This is a diagnostic script - the actual fix will be in the next script
