-- Setup Calzone and Stromboli customization options with size-dependent pricing
-- This creates a collapsible "Customize My Calzone/Stromboli" section with toppings

-- ============================================
-- 1. CREATE SIZE CHOICE GROUP (Required - Must Pick One)
-- ============================================
INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
VALUES
  ('Size', 'Choose your size', 1, true, true, 1, 1)
ON CONFLICT DO NOTHING;

-- Get the size group ID for reference
DO $$
DECLARE
  size_group_id integer;
  normal_toppings_small_group_id integer;
  normal_toppings_medium_group_id integer;
  normal_toppings_large_group_id integer;
  specialty_toppings_small_group_id integer;
  specialty_toppings_medium_group_id integer;
  specialty_toppings_large_group_id integer;
BEGIN
  SELECT id INTO size_group_id FROM choice_groups WHERE name = 'Size' LIMIT 1;

  -- Add size options
  INSERT INTO choice_items (choice_group_id, name, price, "order", is_active, is_default)
  VALUES
    (size_group_id, 'Small', 0.00, 1, true, false),
    (size_group_id, 'Medium', 0.00, 2, true, true),
    (size_group_id, 'Large', 0.00, 3, true, false)
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- 2. NORMAL TOPPINGS - SMALL
  -- ============================================
  INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
  VALUES
    ('Normal Toppings (Small)', 'Add regular toppings - $1.50 each', 10, true, false, NULL, 0)
  ON CONFLICT DO NOTHING
  RETURNING id INTO normal_toppings_small_group_id;

  IF normal_toppings_small_group_id IS NULL THEN
    SELECT id INTO normal_toppings_small_group_id FROM choice_groups WHERE name = 'Normal Toppings (Small)' LIMIT 1;
  END IF;

  INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
  VALUES
    (normal_toppings_small_group_id, 'Pepperoni', 1.50, 1, true),
    (normal_toppings_small_group_id, 'Ham', 1.50, 2, true),
    (normal_toppings_small_group_id, 'Sausage', 1.50, 3, true),
    (normal_toppings_small_group_id, 'Ground Beef', 1.50, 4, true),
    (normal_toppings_small_group_id, 'Anchovies', 1.50, 5, true),
    (normal_toppings_small_group_id, 'Bacon', 1.50, 6, true),
    (normal_toppings_small_group_id, 'Green Olives', 1.50, 7, true),
    (normal_toppings_small_group_id, 'Black Olives', 1.50, 8, true),
    (normal_toppings_small_group_id, 'Mushrooms', 1.50, 9, true),
    (normal_toppings_small_group_id, 'Tomato', 1.50, 10, true),
    (normal_toppings_small_group_id, 'Bell Peppers', 1.50, 11, true),
    (normal_toppings_small_group_id, 'Garlic', 1.50, 12, true),
    (normal_toppings_small_group_id, 'Roasted Red Peppers', 1.50, 13, true),
    (normal_toppings_small_group_id, 'Pineapple', 1.50, 14, true),
    (normal_toppings_small_group_id, 'Banana Peppers', 1.50, 15, true),
    (normal_toppings_small_group_id, 'Jalapeno Peppers', 1.50, 16, true),
    (normal_toppings_small_group_id, 'Red Onion', 1.50, 17, true),
    (normal_toppings_small_group_id, 'Extra Sauce', 1.50, 18, true),
    (normal_toppings_small_group_id, 'Extra Cheese', 1.50, 19, true)
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- 3. SPECIALTY TOPPINGS - SMALL
  -- ============================================
  INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
  VALUES
    ('Specialty Toppings (Small)', 'Add premium toppings - $2.00 each', 11, true, false, NULL, 0)
  ON CONFLICT DO NOTHING
  RETURNING id INTO specialty_toppings_small_group_id;

  IF specialty_toppings_small_group_id IS NULL THEN
    SELECT id INTO specialty_toppings_small_group_id FROM choice_groups WHERE name = 'Specialty Toppings (Small)' LIMIT 1;
  END IF;

  INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
  VALUES
    (specialty_toppings_small_group_id, 'Spinach', 2.00, 1, true),
    (specialty_toppings_small_group_id, 'Feta', 2.00, 2, true),
    (specialty_toppings_small_group_id, 'Artichokes', 2.00, 3, true),
    (specialty_toppings_small_group_id, 'Ricotta', 2.00, 4, true),
    (specialty_toppings_small_group_id, 'Fresh Mozzarella', 2.00, 5, true),
    (specialty_toppings_small_group_id, 'Chicken', 2.00, 6, true),
    (specialty_toppings_small_group_id, 'Meatballs', 2.00, 7, true),
    (specialty_toppings_small_group_id, 'Eggplant', 2.00, 8, true)
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- 4. NORMAL TOPPINGS - MEDIUM
  -- ============================================
  INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
  VALUES
    ('Normal Toppings (Medium)', 'Add regular toppings - $3.00 each', 20, true, false, NULL, 0)
  ON CONFLICT DO NOTHING
  RETURNING id INTO normal_toppings_medium_group_id;

  IF normal_toppings_medium_group_id IS NULL THEN
    SELECT id INTO normal_toppings_medium_group_id FROM choice_groups WHERE name = 'Normal Toppings (Medium)' LIMIT 1;
  END IF;

  INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
  VALUES
    (normal_toppings_medium_group_id, 'Pepperoni', 3.00, 1, true),
    (normal_toppings_medium_group_id, 'Ham', 3.00, 2, true),
    (normal_toppings_medium_group_id, 'Sausage', 3.00, 3, true),
    (normal_toppings_medium_group_id, 'Ground Beef', 3.00, 4, true),
    (normal_toppings_medium_group_id, 'Anchovies', 3.00, 5, true),
    (normal_toppings_medium_group_id, 'Bacon', 3.00, 6, true),
    (normal_toppings_medium_group_id, 'Green Olives', 3.00, 7, true),
    (normal_toppings_medium_group_id, 'Black Olives', 3.00, 8, true),
    (normal_toppings_medium_group_id, 'Mushrooms', 3.00, 9, true),
    (normal_toppings_medium_group_id, 'Tomato', 3.00, 10, true),
    (normal_toppings_medium_group_id, 'Bell Peppers', 3.00, 11, true),
    (normal_toppings_medium_group_id, 'Garlic', 3.00, 12, true),
    (normal_toppings_medium_group_id, 'Roasted Red Peppers', 3.00, 13, true),
    (normal_toppings_medium_group_id, 'Pineapple', 3.00, 14, true),
    (normal_toppings_medium_group_id, 'Banana Peppers', 3.00, 15, true),
    (normal_toppings_medium_group_id, 'Jalapeno Peppers', 3.00, 16, true),
    (normal_toppings_medium_group_id, 'Red Onion', 3.00, 17, true),
    (normal_toppings_medium_group_id, 'Extra Sauce', 3.00, 18, true),
    (normal_toppings_medium_group_id, 'Extra Cheese', 3.00, 19, true)
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- 5. SPECIALTY TOPPINGS - MEDIUM
  -- ============================================
  INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
  VALUES
    ('Specialty Toppings (Medium)', 'Add premium toppings - $3.50 each', 21, true, false, NULL, 0)
  ON CONFLICT DO NOTHING
  RETURNING id INTO specialty_toppings_medium_group_id;

  IF specialty_toppings_medium_group_id IS NULL THEN
    SELECT id INTO specialty_toppings_medium_group_id FROM choice_groups WHERE name = 'Specialty Toppings (Medium)' LIMIT 1;
  END IF;

  INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
  VALUES
    (specialty_toppings_medium_group_id, 'Spinach', 3.50, 1, true),
    (specialty_toppings_medium_group_id, 'Feta', 3.50, 2, true),
    (specialty_toppings_medium_group_id, 'Artichokes', 3.50, 3, true),
    (specialty_toppings_medium_group_id, 'Ricotta', 3.50, 4, true),
    (specialty_toppings_medium_group_id, 'Fresh Mozzarella', 3.50, 5, true),
    (specialty_toppings_medium_group_id, 'Chicken', 3.50, 6, true),
    (specialty_toppings_medium_group_id, 'Meatballs', 3.50, 7, true),
    (specialty_toppings_medium_group_id, 'Eggplant', 3.50, 8, true)
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- 6. NORMAL TOPPINGS - LARGE
  -- ============================================
  INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
  VALUES
    ('Normal Toppings (Large)', 'Add regular toppings - $4.00 each', 30, true, false, NULL, 0)
  ON CONFLICT DO NOTHING
  RETURNING id INTO normal_toppings_large_group_id;

  IF normal_toppings_large_group_id IS NULL THEN
    SELECT id INTO normal_toppings_large_group_id FROM choice_groups WHERE name = 'Normal Toppings (Large)' LIMIT 1;
  END IF;

  INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
  VALUES
    (normal_toppings_large_group_id, 'Pepperoni', 4.00, 1, true),
    (normal_toppings_large_group_id, 'Ham', 4.00, 2, true),
    (normal_toppings_large_group_id, 'Sausage', 4.00, 3, true),
    (normal_toppings_large_group_id, 'Ground Beef', 4.00, 4, true),
    (normal_toppings_large_group_id, 'Anchovies', 4.00, 5, true),
    (normal_toppings_large_group_id, 'Bacon', 4.00, 6, true),
    (normal_toppings_large_group_id, 'Green Olives', 4.00, 7, true),
    (normal_toppings_large_group_id, 'Black Olives', 4.00, 8, true),
    (normal_toppings_large_group_id, 'Mushrooms', 4.00, 9, true),
    (normal_toppings_large_group_id, 'Tomato', 4.00, 10, true),
    (normal_toppings_large_group_id, 'Bell Peppers', 4.00, 11, true),
    (normal_toppings_large_group_id, 'Garlic', 4.00, 12, true),
    (normal_toppings_large_group_id, 'Roasted Red Peppers', 4.00, 13, true),
    (normal_toppings_large_group_id, 'Pineapple', 4.00, 14, true),
    (normal_toppings_large_group_id, 'Banana Peppers', 4.00, 15, true),
    (normal_toppings_large_group_id, 'Jalapeno Peppers', 4.00, 16, true),
    (normal_toppings_large_group_id, 'Red Onion', 4.00, 17, true),
    (normal_toppings_large_group_id, 'Extra Sauce', 4.00, 18, true),
    (normal_toppings_large_group_id, 'Extra Cheese', 4.00, 19, true)
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- 7. SPECIALTY TOPPINGS - LARGE
  -- ============================================
  INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
  VALUES
    ('Specialty Toppings (Large)', 'Add premium toppings - $4.50 each', 31, true, false, NULL, 0)
  ON CONFLICT DO NOTHING
  RETURNING id INTO specialty_toppings_large_group_id;

  IF specialty_toppings_large_group_id IS NULL THEN
    SELECT id INTO specialty_toppings_large_group_id FROM choice_groups WHERE name = 'Specialty Toppings (Large)' LIMIT 1;
  END IF;

  INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
  VALUES
    (specialty_toppings_large_group_id, 'Spinach', 4.50, 1, true),
    (specialty_toppings_large_group_id, 'Feta', 4.50, 2, true),
    (specialty_toppings_large_group_id, 'Artichokes', 4.50, 3, true),
    (specialty_toppings_large_group_id, 'Ricotta', 4.50, 4, true),
    (specialty_toppings_large_group_id, 'Fresh Mozzarella', 4.50, 5, true),
    (specialty_toppings_large_group_id, 'Chicken', 4.50, 6, true),
    (specialty_toppings_large_group_id, 'Meatballs', 4.50, 7, true),
    (specialty_toppings_large_group_id, 'Eggplant', 4.50, 8, true)
  ON CONFLICT DO NOTHING;

END $$;

-- Now you need to manually link these choice groups to your Calzone and Stromboli menu items
-- in the Admin Dashboard > Menu Editor
-- The frontend will automatically show/hide the appropriate topping groups based on size selection
