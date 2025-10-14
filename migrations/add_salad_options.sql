-- ========================================
-- ADD SALAD CHOICE GROUPS
-- ========================================

-- 1. Garden Salad Size (only for Garden Side Salad)
INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
VALUES ('Garden Salad Size', 'Choose your salad size', 1, true, true, 1, 1);

INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
VALUES
  ((SELECT id FROM choice_groups WHERE name = 'Garden Salad Size'), 'Small', 4.45, 1, true),
  ((SELECT id FROM choice_groups WHERE name = 'Garden Salad Size'), 'Large', 8.95, 2, true);

-- 2. Salad Dressing (required selection)
INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
VALUES ('Salad Dressing', 'Choose your dressing', 2, true, true, 1, 1);

INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
VALUES
  ((SELECT id FROM choice_groups WHERE name = 'Salad Dressing'), 'Balsamic', 0.00, 1, true),
  ((SELECT id FROM choice_groups WHERE name = 'Salad Dressing'), 'Ranch', 0.00, 2, true),
  ((SELECT id FROM choice_groups WHERE name = 'Salad Dressing'), 'Caesar', 0.00, 3, true),
  ((SELECT id FROM choice_groups WHERE name = 'Salad Dressing'), 'Honey Mustard', 0.00, 4, true),
  ((SELECT id FROM choice_groups WHERE name = 'Salad Dressing'), 'Greek', 0.00, 5, true),
  ((SELECT id FROM choice_groups WHERE name = 'Salad Dressing'), 'Italian', 0.00, 6, true);

-- 3. Dressing Style (required selection)
INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
VALUES ('Dressing Style', 'How would you like your dressing?', 3, true, true, 1, 1);

INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
VALUES
  ((SELECT id FROM choice_groups WHERE name = 'Dressing Style'), 'On the Side', 0.00, 1, true),
  ((SELECT id FROM choice_groups WHERE name = 'Dressing Style'), 'Tossed', 0.00, 2, true);

-- 4. Salad Toppings (optional, multiple selections allowed)
INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
VALUES ('Salad Toppings', 'Add toppings to your salad', 4, true, false, 10, 0);

INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
VALUES
  ((SELECT id FROM choice_groups WHERE name = 'Salad Toppings'), 'Grilled Chicken', 5.00, 1, true),
  ((SELECT id FROM choice_groups WHERE name = 'Salad Toppings'), 'Cheese', 2.99, 2, true);

-- 5. Extra Dressing (optional, allows multiple with quantity)
INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
VALUES ('Extra Dressing', 'Add extra dressing ($1.00 each)', 5, true, false, 20, 0);

INSERT INTO choice_items (choice_group_id, name, price, "order", is_active, description)
VALUES
  ((SELECT id FROM choice_groups WHERE name = 'Extra Dressing'), 'Extra Balsamic', 1.00, 1, true, 'Additional Balsamic dressing'),
  ((SELECT id FROM choice_groups WHERE name = 'Extra Dressing'), 'Extra Ranch', 1.00, 2, true, 'Additional Ranch dressing'),
  ((SELECT id FROM choice_groups WHERE name = 'Extra Dressing'), 'Extra Caesar', 1.00, 3, true, 'Additional Caesar dressing'),
  ((SELECT id FROM choice_groups WHERE name = 'Extra Dressing'), 'Extra Honey Mustard', 1.00, 4, true, 'Additional Honey Mustard dressing'),
  ((SELECT id FROM choice_groups WHERE name = 'Extra Dressing'), 'Extra Greek', 1.00, 5, true, 'Additional Greek dressing'),
  ((SELECT id FROM choice_groups WHERE name = 'Extra Dressing'), 'Extra Italian', 1.00, 6, true, 'Additional Italian dressing');

-- Link to Garden Side Salad (will need the menu item ID)
-- Example: Link Garden Salad Size to Garden Side Salad
-- INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, "order", is_required)
-- SELECT id, (SELECT id FROM choice_groups WHERE name = 'Garden Salad Size'), 1, true
-- FROM menu_items WHERE name = 'Garden Side Salad';

-- Link to ALL Salads (Salad Dressing, Dressing Style, Salad Toppings, Extra Dressing)
-- Run these after creating your salad menu items:
-- INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, "order", is_required)
-- SELECT
--   mi.id,
--   (SELECT id FROM choice_groups WHERE name = 'Salad Dressing'),
--   2,
--   true
-- FROM menu_items mi
-- WHERE mi.name ILIKE '%salad%';

-- Similar queries for Dressing Style, Salad Toppings, and Extra Dressing...

-- Verification queries:
-- SELECT * FROM choice_groups WHERE name LIKE '%Salad%' OR name LIKE '%Dressing%';
-- SELECT ci.*, cg.name as group_name FROM choice_items ci JOIN choice_groups cg ON ci.choice_group_id = cg.id WHERE cg.name LIKE '%Salad%' OR cg.name LIKE '%Dressing%';
