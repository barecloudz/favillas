-- Restore menu items that were orphaned when category was renamed
-- From: "10 inch specialty Gourmet Pizzas"
-- To: "Specialty Gourmet Pizzas"

-- First, show what items need to be restored
SELECT 'ITEMS TO RESTORE:' as info;
SELECT id, name, category, base_price, is_available
FROM menu_items 
WHERE category = '10 inch specialty Gourmet Pizzas'
ORDER BY name;

-- Show count of items to be moved
SELECT 'COUNT OF ITEMS TO RESTORE:' as info;
SELECT COUNT(*) as items_to_restore
FROM menu_items 
WHERE category = '10 inch specialty Gourmet Pizzas';

-- Restore the items to the correct category
UPDATE menu_items 
SET category = 'Specialty Gourmet Pizzas'
WHERE category = '10 inch specialty Gourmet Pizzas';

-- Verify the fix
SELECT 'ITEMS AFTER RESTORE:' as info;
SELECT id, name, category, base_price, is_available
FROM menu_items 
WHERE category = 'Specialty Gourmet Pizzas'
ORDER BY name;

-- Show final count
SELECT 'FINAL COUNT IN SPECIALTY GOURMET PIZZAS:' as info;
SELECT COUNT(*) as total_items
FROM menu_items 
WHERE category = 'Specialty Gourmet Pizzas';

-- Verify no orphaned items remain
SELECT 'REMAINING ORPHANED ITEMS:' as info;
SELECT COUNT(*) as orphaned_count
FROM menu_items m
LEFT JOIN categories c ON m.category = c.name
WHERE c.name IS NULL;
