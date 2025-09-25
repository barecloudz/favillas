-- Move specialty gourmet pizza items from old category name to new category name

-- Step 1: Show the exact old category name with items
SELECT 'OLD CATEGORY WITH 23 ITEMS:' as status;
SELECT DISTINCT category, COUNT(*) as item_count
FROM menu_items 
WHERE category LIKE '%specialty%' 
   OR category LIKE '%gourmet%'
   OR category LIKE '%10%'
GROUP BY category
HAVING COUNT(*) = 23;

-- Step 2: Show the new category name with 0 items
SELECT 'NEW CATEGORY WITH 0 ITEMS:' as status;
SELECT name as category_name 
FROM categories 
WHERE name LIKE '%Specialty%Gourmet%Pizza%'
   OR name = 'Specialty Gourmet Pizzas';

-- Step 3: Once you see both exact names above, use this template:
-- Replace OLD_EXACT_NAME and NEW_EXACT_NAME with what you see above

-- TEMPLATE (uncomment and replace names):
-- UPDATE menu_items 
-- SET category = 'NEW_EXACT_NAME'
-- WHERE category = 'OLD_EXACT_NAME';

-- Example (you'll need to replace with actual names):
-- UPDATE menu_items 
-- SET category = 'Specialty Gourmet Pizzas'
-- WHERE category = '10 inch specialty Gourmet Pizzas';

-- Step 4: After running the update, verify:
-- SELECT 'VERIFICATION:' as status;
-- SELECT category, COUNT(*) as item_count
-- FROM menu_items 
-- WHERE category = 'Specialty Gourmet Pizzas';
