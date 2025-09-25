-- Fix using the EXACT category name from the database
-- The debug showed the actual name in the database

-- First, let's see what items have the old name pattern
SELECT 'ITEMS WITH OLD CATEGORY PATTERNS:' as status;
SELECT id, name, category, base_price, is_available
FROM menu_items 
WHERE category LIKE '%10%inch%specialty%'
   OR category LIKE '%10%specialty%'  
   OR category LIKE '%gourmet%pizza%'
ORDER BY category, name;

-- Show the exact distinct category names to copy/paste
SELECT 'EXACT CATEGORY NAMES IN DATABASE:' as status;
SELECT DISTINCT category 
FROM menu_items 
WHERE category LIKE '%specialty%' 
   OR category LIKE '%gourmet%'
   OR category LIKE '%10%'
ORDER BY category;

-- Once you see the exact old category name, use this template:
-- UPDATE menu_items 
-- SET category = 'Specialty Gourmet Pizzas'
-- WHERE category = 'EXACT_OLD_NAME_FROM_ABOVE';

-- Example (replace with actual name):
-- UPDATE menu_items 
-- SET category = 'Specialty Gourmet Pizzas'
-- WHERE category = '10" Specialty gourmet pizzas';

-- After update, verify:
-- SELECT 'ITEMS AFTER UPDATE:' as status;
-- SELECT id, name, category, base_price, is_available
-- FROM menu_items 
-- WHERE category = 'Specialty Gourmet Pizzas'
-- ORDER BY name;
