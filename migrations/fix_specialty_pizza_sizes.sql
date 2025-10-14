-- ========================================
-- FIX SPECIALTY GOURMET PIZZA SIZE GROUPS
-- ========================================
-- Remove "Traditional Pizza Size" from Specialty Gourmet pizzas
-- They should only have "Specialty Gourmet Pizza Size"

-- Step 1: Find and display the issue (for verification)
-- Uncomment to see which items have both size groups:
-- SELECT
--   mi.name,
--   cg.name as choice_group
-- FROM menu_items mi
-- JOIN menu_item_choice_groups micg ON mi.id = micg.menu_item_id
-- JOIN choice_groups cg ON micg.choice_group_id = cg.id
-- WHERE mi.category = 'Specialty Gourmet Pizzas'
--   AND cg.name IN ('Traditional Pizza Size', 'Specialty Gourmet Pizza Size')
-- ORDER BY mi.name, cg.name;

-- Step 2: Remove "Traditional Pizza Size" from Specialty Gourmet pizzas
DELETE FROM menu_item_choice_groups
WHERE menu_item_id IN (
  SELECT id FROM menu_items WHERE category = 'Specialty Gourmet Pizzas'
)
AND choice_group_id = (
  SELECT id FROM choice_groups WHERE name = 'Traditional Pizza Size'
);

-- Step 3: Verification - show remaining size groups for Specialty Gourmet pizzas
-- SELECT
--   mi.name,
--   cg.name as choice_group
-- FROM menu_items mi
-- JOIN menu_item_choice_groups micg ON mi.id = micg.menu_item_id
-- JOIN choice_groups cg ON micg.choice_group_id = cg.id
-- WHERE mi.category = 'Specialty Gourmet Pizzas'
--   AND cg.name LIKE '%Size%'
-- ORDER BY mi.name;
