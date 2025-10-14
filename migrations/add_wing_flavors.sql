-- ========================================
-- ADD WING FLAVORS CHOICE GROUP
-- ========================================
-- This creates a required selection for wing flavors (no extra cost)
-- Similar to size selection but for flavor choices

-- Step 1: Insert the Wing Flavors choice group
INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
VALUES ('Wing Flavors', 'Choose your wing flavor', 2, true, true, 1, 1);

-- Step 2: Add wing flavor choices (all $0.00 - no extra cost)
INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
VALUES
  ((SELECT id FROM choice_groups WHERE name = 'Wing Flavors'), 'Plain', 0.00, 1, true),
  ((SELECT id FROM choice_groups WHERE name = 'Wing Flavors'), 'BBQ', 0.00, 2, true),
  ((SELECT id FROM choice_groups WHERE name = 'Wing Flavors'), 'Hot', 0.00, 3, true),
  ((SELECT id FROM choice_groups WHERE name = 'Wing Flavors'), 'Honey Garlic', 0.00, 4, true),
  ((SELECT id FROM choice_groups WHERE name = 'Wing Flavors'), 'Lemon Pepper', 0.00, 5, true),
  ((SELECT id FROM choice_groups WHERE name = 'Wing Flavors'), 'Italian', 0.00, 6, true),
  ((SELECT id FROM choice_groups WHERE name = 'Wing Flavors'), 'Mango Habanero', 0.00, 7, true);

-- Step 3: Link Wing Flavors to all wings menu items (marked as required)
-- This will link to any menu item with "wing" in the name (case insensitive)
INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, "order", is_required)
SELECT
  mi.id,
  (SELECT id FROM choice_groups WHERE name = 'Wing Flavors'),
  2,  -- Display after size selection
  true  -- Make it required
FROM menu_items mi
WHERE mi.name ILIKE '%wing%'
  AND mi.id NOT IN (
    -- Don't add if already linked
    SELECT menu_item_id FROM menu_item_choice_groups
    WHERE choice_group_id = (SELECT id FROM choice_groups WHERE name = 'Wing Flavors')
  );

-- Verification queries (run these to check the results)
-- SELECT * FROM choice_groups WHERE name = 'Wing Flavors';
-- SELECT * FROM choice_items WHERE choice_group_id = (SELECT id FROM choice_groups WHERE name = 'Wing Flavors');
-- SELECT mi.name, cg.name as choice_group, micg.is_required FROM menu_items mi JOIN menu_item_choice_groups micg ON mi.id = micg.menu_item_id JOIN choice_groups cg ON micg.choice_group_id = cg.id WHERE mi.name ILIKE '%wing%';
