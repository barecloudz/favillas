-- Simple fix if you know the exact new category name
-- Replace 'NEW_CATEGORY_NAME_HERE' with the actual new category name

-- Show orphaned items first
SELECT 'Orphaned items that need fixing:' as info;
SELECT id, name, category, base_price
FROM menu_items 
WHERE category = '10 inch specialty Gourmet Pizzas';

-- Update to new category name (REPLACE 'NEW_CATEGORY_NAME_HERE' with actual name)
-- UPDATE menu_items 
-- SET category = 'NEW_CATEGORY_NAME_HERE'
-- WHERE category = '10 inch specialty Gourmet Pizzas';

-- Verify fix
-- SELECT 'Items after fix:' as info;
-- SELECT id, name, category, base_price
-- FROM menu_items 
-- WHERE category = 'NEW_CATEGORY_NAME_HERE';

-- Instructions:
-- 1. First run the SELECT to see what items need fixing
-- 2. Replace 'NEW_CATEGORY_NAME_HERE' with your actual new category name
-- 3. Uncomment and run the UPDATE statement
-- 4. Run the final SELECT to verify
