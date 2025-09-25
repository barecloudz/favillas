-- Fix orphaned menu items from category name change
-- Original: "10 inch specialty Gourmet Pizzas"
-- Need to update to match new category name

-- Step 1: Show current state
SELECT 'BEFORE FIX - Orphaned items:' as info;
SELECT COUNT(*) as orphaned_count
FROM menu_items m
LEFT JOIN categories c ON m.category = c.name  
WHERE c.name IS NULL;

-- Step 2: Show specific orphaned items from the old category
SELECT 'Items with old category name:' as info;
SELECT id, name, category, base_price
FROM menu_items 
WHERE category = '10 inch specialty Gourmet Pizzas'
LIMIT 10;

-- Step 3: Show available categories that might be the new name
SELECT 'Available pizza categories:' as info;
SELECT id, name 
FROM categories 
WHERE name ILIKE '%pizza%' 
   OR name ILIKE '%specialty%' 
   OR name ILIKE '%gourmet%'
ORDER BY "order";

-- Step 4: Update orphaned items to most likely new category
-- Based on common naming patterns, likely candidates are:
-- "Specialty Pizzas", "Gourmet Pizzas", "10\" Specialty Pizzas", etc.

-- Try to match to "Specialty Pizzas" first (most common pattern)
UPDATE menu_items 
SET category = (
  SELECT name FROM categories 
  WHERE name ILIKE '%specialty%pizza%' 
     OR name ILIKE 'specialty%pizza%'
     OR name = 'Specialty Pizzas'
  ORDER BY 
    CASE 
      WHEN name = 'Specialty Pizzas' THEN 1
      WHEN name ILIKE 'specialty pizza%' THEN 2  
      WHEN name ILIKE '%specialty%pizza%' THEN 3
      ELSE 4
    END
  LIMIT 1
)
WHERE category = '10 inch specialty Gourmet Pizzas'
  AND EXISTS (
    SELECT 1 FROM categories 
    WHERE name ILIKE '%specialty%pizza%' 
       OR name ILIKE 'specialty%pizza%'
       OR name = 'Specialty Pizzas'
  );

-- If no specialty pizza category exists, try gourmet
UPDATE menu_items 
SET category = (
  SELECT name FROM categories 
  WHERE name ILIKE '%gourmet%pizza%' 
     OR name ILIKE 'gourmet%pizza%'
     OR name = 'Gourmet Pizzas'
  ORDER BY 
    CASE 
      WHEN name = 'Gourmet Pizzas' THEN 1
      WHEN name ILIKE 'gourmet pizza%' THEN 2  
      ELSE 3
    END
  LIMIT 1
)
WHERE category = '10 inch specialty Gourmet Pizzas'
  AND EXISTS (
    SELECT 1 FROM categories 
    WHERE name ILIKE '%gourmet%pizza%' 
       OR name ILIKE 'gourmet%pizza%'
       OR name = 'Gourmet Pizzas'
  );

-- If neither exists, try any pizza category
UPDATE menu_items 
SET category = (
  SELECT name FROM categories 
  WHERE name ILIKE '%pizza%'
  ORDER BY "order"
  LIMIT 1
)
WHERE category = '10 inch specialty Gourmet Pizzas'
  AND EXISTS (SELECT 1 FROM categories WHERE name ILIKE '%pizza%');

-- Step 5: Verify the fix
SELECT 'AFTER FIX - Remaining orphaned items:' as info;
SELECT COUNT(*) as orphaned_count
FROM menu_items m
LEFT JOIN categories c ON m.category = c.name  
WHERE c.name IS NULL;

-- Show what items were moved and where
SELECT 'Items that were updated:' as info;
SELECT m.name, m.category, m.base_price
FROM menu_items m
JOIN categories c ON m.category = c.name
WHERE m.name IN (
  SELECT name FROM menu_items 
  WHERE category != '10 inch specialty Gourmet Pizzas'
)
ORDER BY m.category, m.name;

-- Show summary by category
SELECT 'Updated category summary:' as info;
SELECT c.name as category, COUNT(m.id) as item_count
FROM categories c
LEFT JOIN menu_items m ON c.name = m.category
GROUP BY c.name
ORDER BY c."order";
