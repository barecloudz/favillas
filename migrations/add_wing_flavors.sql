-- ========================================
-- ADD WING FLAVORS CHOICE GROUP
-- ========================================
-- This creates a required selection for wing flavors (no extra cost)
-- Similar to size selection but for flavor choices

-- Step 1: Insert the Wing Flavors choice group
INSERT INTO choice_groups (name, required, allow_multiple, min_selections, max_selections, display_order)
VALUES ('Wing Flavors', true, false, 1, 1, 2)
ON CONFLICT (name) DO NOTHING;

-- Step 2: Add wing flavor choices (all $0.00 - no extra cost)
INSERT INTO choices (choice_group_id, name, price, display_order)
VALUES
  ((SELECT id FROM choice_groups WHERE name = 'Wing Flavors'), 'Plain', 0.00, 1),
  ((SELECT id FROM choice_groups WHERE name = 'Wing Flavors'), 'BBQ', 0.00, 2),
  ((SELECT id FROM choice_groups WHERE name = 'Wing Flavors'), 'Hot', 0.00, 3),
  ((SELECT id FROM choice_groups WHERE name = 'Wing Flavors'), 'Honey Garlic', 0.00, 4),
  ((SELECT id FROM choice_groups WHERE name = 'Wing Flavors'), 'Lemon Pepper', 0.00, 5),
  ((SELECT id FROM choice_groups WHERE name = 'Wing Flavors'), 'Italian', 0.00, 6),
  ((SELECT id FROM choice_groups WHERE name = 'Wing Flavors'), 'Mango Habanero', 0.00, 7)
ON CONFLICT (choice_group_id, name) DO NOTHING;

-- Step 3: Link Wing Flavors to all wings menu items
-- This will link to any menu item with "wing" in the name (case insensitive)
INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, display_order)
SELECT
  mi.id,
  (SELECT id FROM choice_groups WHERE name = 'Wing Flavors'),
  2  -- Display after size selection
FROM menu_items mi
WHERE mi.name ILIKE '%wing%'
  AND mi.id NOT IN (
    -- Don't add if already linked
    SELECT menu_item_id FROM menu_item_choice_groups
    WHERE choice_group_id = (SELECT id FROM choice_groups WHERE name = 'Wing Flavors')
  );

-- Verification queries (run these to check the results)
-- SELECT * FROM choice_groups WHERE name = 'Wing Flavors';
-- SELECT * FROM choices WHERE choice_group_id = (SELECT id FROM choice_groups WHERE name = 'Wing Flavors');
-- SELECT mi.name, cg.name as choice_group FROM menu_items mi JOIN menu_item_choice_groups micg ON mi.id = micg.menu_item_id JOIN choice_groups cg ON micg.choice_group_id = cg.id WHERE mi.name ILIKE '%wing%';
