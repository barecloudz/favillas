-- ========================================
-- ADD MISSING OPTIONS TO SALAD CHOICE GROUPS
-- ========================================
-- This adds the choice items to existing choice groups

-- 1. Add sizes to Garden Salad Size
INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
VALUES
  ((SELECT id FROM choice_groups WHERE name = 'Garden Salad Size'), 'Small', 4.45, 1, true),
  ((SELECT id FROM choice_groups WHERE name = 'Garden Salad Size'), 'Large', 8.95, 2, true)
ON CONFLICT (choice_group_id, name) DO UPDATE
SET price = EXCLUDED.price, "order" = EXCLUDED."order";

-- 2. Add dressings to Salad Dressing
INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
VALUES
  ((SELECT id FROM choice_groups WHERE name = 'Salad Dressing'), 'Balsamic', 0.00, 1, true),
  ((SELECT id FROM choice_groups WHERE name = 'Salad Dressing'), 'Ranch', 0.00, 2, true),
  ((SELECT id FROM choice_groups WHERE name = 'Salad Dressing'), 'Caesar', 0.00, 3, true),
  ((SELECT id FROM choice_groups WHERE name = 'Salad Dressing'), 'Honey Mustard', 0.00, 4, true),
  ((SELECT id FROM choice_groups WHERE name = 'Salad Dressing'), 'Greek', 0.00, 5, true),
  ((SELECT id FROM choice_groups WHERE name = 'Salad Dressing'), 'Italian', 0.00, 6, true)
ON CONFLICT (choice_group_id, name) DO UPDATE
SET price = EXCLUDED.price, "order" = EXCLUDED."order";

-- 3. Add styles to Dressing Style
INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
VALUES
  ((SELECT id FROM choice_groups WHERE name = 'Dressing Style'), 'On the Side', 0.00, 1, true),
  ((SELECT id FROM choice_groups WHERE name = 'Dressing Style'), 'Tossed', 0.00, 2, true)
ON CONFLICT (choice_group_id, name) DO UPDATE
SET price = EXCLUDED.price, "order" = EXCLUDED."order";

-- 4. Add toppings to Salad Toppings
INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
VALUES
  ((SELECT id FROM choice_groups WHERE name = 'Salad Toppings'), 'Grilled Chicken', 5.00, 1, true),
  ((SELECT id FROM choice_groups WHERE name = 'Salad Toppings'), 'Cheese', 2.99, 2, true)
ON CONFLICT (choice_group_id, name) DO UPDATE
SET price = EXCLUDED.price, "order" = EXCLUDED."order";

-- 5. Add extra dressings to Extra Dressing
INSERT INTO choice_items (choice_group_id, name, price, "order", is_active, description)
VALUES
  ((SELECT id FROM choice_groups WHERE name = 'Extra Dressing'), 'Extra Balsamic', 1.00, 1, true, 'Additional Balsamic dressing'),
  ((SELECT id FROM choice_groups WHERE name = 'Extra Dressing'), 'Extra Ranch', 1.00, 2, true, 'Additional Ranch dressing'),
  ((SELECT id FROM choice_groups WHERE name = 'Extra Dressing'), 'Extra Caesar', 1.00, 3, true, 'Additional Caesar dressing'),
  ((SELECT id FROM choice_groups WHERE name = 'Extra Dressing'), 'Extra Honey Mustard', 1.00, 4, true, 'Additional Honey Mustard dressing'),
  ((SELECT id FROM choice_groups WHERE name = 'Extra Dressing'), 'Extra Greek', 1.00, 5, true, 'Additional Greek dressing'),
  ((SELECT id FROM choice_groups WHERE name = 'Extra Dressing'), 'Extra Italian', 1.00, 6, true, 'Additional Italian dressing')
ON CONFLICT (choice_group_id, name) DO UPDATE
SET price = EXCLUDED.price, "order" = EXCLUDED."order", description = EXCLUDED.description;

-- Verification: Check all items were added
SELECT cg.name as group_name, ci.name as item_name, ci.price, ci."order"
FROM choice_groups cg
LEFT JOIN choice_items ci ON ci.choice_group_id = cg.id
WHERE cg.name IN ('Garden Salad Size', 'Salad Dressing', 'Dressing Style', 'Salad Toppings', 'Extra Dressing')
ORDER BY cg.name, ci."order";
