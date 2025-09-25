-- Fixed SQL to move specialty gourmet pizza items

-- Step 1: Show the exact old category name with items (FIXED QUERY)
SELECT 'OLD CATEGORY WITH ITEMS:' as status;
SELECT category, COUNT(*) as item_count
FROM menu_items 
WHERE category LIKE '%specialty%' 
   OR category LIKE '%gourmet%'
   OR category LIKE '%10%'
GROUP BY category
ORDER BY item_count DESC;

-- Step 2: Show available categories in categories table
SELECT 'AVAILABLE CATEGORIES:' as status;
SELECT id, name 
FROM categories 
WHERE name LIKE '%pecialty%'
   OR name LIKE '%ourmet%'
   OR name LIKE '%izza%'
ORDER BY name;

-- Step 3: Once you identify the old name with items, use this:
-- UPDATE menu_items 
-- SET category = 'Specialty Gourmet Pizzas'
-- WHERE category = 'OLD_NAME_FROM_STEP_1';

-- Step 4: Verify the move worked:
-- SELECT category, COUNT(*) as item_count
-- FROM menu_items 
-- WHERE category = 'Specialty Gourmet Pizzas'
-- GROUP BY category;
