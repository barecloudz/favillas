-- Setup Traditional Pizza customization with size-dependent pricing
-- 4 sizes: 10" ($10.99), 14" ($14.99), 16" ($16.99), Sicilian ($22.99)
-- Normal toppings: 10" $1.50, 14" $2.30, 16" $2.80, Sicilian $3.30
-- Specialty toppings: 10" $2.00, 14" $3.30, 16" $4.30, Sicilian $4.30

-- ============================================
-- 1. CREATE TRADITIONAL PIZZA SIZE GROUP
-- ============================================
INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
VALUES
  ('Traditional Pizza Size', 'Choose your pizza size', 1, true, true, 1, 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. CREATE SIZE-DEPENDENT TOPPING GROUPS
-- ============================================
DO $$
DECLARE
  pizza_size_group_id integer;
  nt_10_group_id integer;
  st_10_group_id integer;
  nt_14_group_id integer;
  st_14_group_id integer;
  nt_16_group_id integer;
  st_16_group_id integer;
  nt_sicilian_group_id integer;
  st_sicilian_group_id integer;
BEGIN
  -- Get the size group ID
  SELECT id INTO pizza_size_group_id FROM choice_groups WHERE name = 'Traditional Pizza Size' LIMIT 1;

  -- Add size options
  INSERT INTO choice_items (choice_group_id, name, price, "order", is_active, is_default)
  VALUES
    (pizza_size_group_id, '10"', 10.99, 1, true, true),
    (pizza_size_group_id, '14"', 14.99, 2, true, false),
    (pizza_size_group_id, '16"', 16.99, 3, true, false),
    (pizza_size_group_id, 'Sicilian', 22.99, 4, true, false)
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- 3. NORMAL TOPPINGS - 10"
  -- ============================================
  INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
  VALUES
    ('Normal Toppings (10")', 'Add regular toppings - $1.50 each', 10, true, false, NULL, 0)
  ON CONFLICT DO NOTHING
  RETURNING id INTO nt_10_group_id;

  IF nt_10_group_id IS NULL THEN
    SELECT id INTO nt_10_group_id FROM choice_groups WHERE name = 'Normal Toppings (10")' LIMIT 1;
  END IF;

  INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
  VALUES
    (nt_10_group_id, 'Pepperoni', 1.50, 1, true),
    (nt_10_group_id, 'Ham', 1.50, 2, true),
    (nt_10_group_id, 'Sausage', 1.50, 3, true),
    (nt_10_group_id, 'Ground Beef', 1.50, 4, true),
    (nt_10_group_id, 'Anchovies', 1.50, 5, true),
    (nt_10_group_id, 'Bacon', 1.50, 6, true),
    (nt_10_group_id, 'Green Olives', 1.50, 7, true),
    (nt_10_group_id, 'Black Olives', 1.50, 8, true),
    (nt_10_group_id, 'Mushrooms', 1.50, 9, true),
    (nt_10_group_id, 'Tomato', 1.50, 10, true),
    (nt_10_group_id, 'Bell Peppers', 1.50, 11, true),
    (nt_10_group_id, 'Garlic', 1.50, 12, true),
    (nt_10_group_id, 'Roasted Red Peppers', 1.50, 13, true),
    (nt_10_group_id, 'Pineapple', 1.50, 14, true),
    (nt_10_group_id, 'Banana Peppers', 1.50, 15, true),
    (nt_10_group_id, 'Jalapeno Peppers', 1.50, 16, true),
    (nt_10_group_id, 'Red Onion', 1.50, 17, true),
    (nt_10_group_id, 'Extra Sauce', 1.50, 18, true),
    (nt_10_group_id, 'Extra Cheese', 1.50, 19, true)
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- 4. SPECIALTY TOPPINGS - 10"
  -- ============================================
  INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
  VALUES
    ('Specialty Toppings (10")', 'Add premium toppings - $2.00 each', 11, true, false, NULL, 0)
  ON CONFLICT DO NOTHING
  RETURNING id INTO st_10_group_id;

  IF st_10_group_id IS NULL THEN
    SELECT id INTO st_10_group_id FROM choice_groups WHERE name = 'Specialty Toppings (10")' LIMIT 1;
  END IF;

  INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
  VALUES
    (st_10_group_id, 'Spinach', 2.00, 1, true),
    (st_10_group_id, 'Feta', 2.00, 2, true),
    (st_10_group_id, 'Artichokes', 2.00, 3, true),
    (st_10_group_id, 'Ricotta', 2.00, 4, true),
    (st_10_group_id, 'Fresh Mozzarella', 2.00, 5, true),
    (st_10_group_id, 'Chicken', 2.00, 6, true),
    (st_10_group_id, 'Meatballs', 2.00, 7, true),
    (st_10_group_id, 'Eggplant', 2.00, 8, true)
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- 5. NORMAL TOPPINGS - 14"
  -- ============================================
  INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
  VALUES
    ('Normal Toppings (14")', 'Add regular toppings - $2.30 each', 20, true, false, NULL, 0)
  ON CONFLICT DO NOTHING
  RETURNING id INTO nt_14_group_id;

  IF nt_14_group_id IS NULL THEN
    SELECT id INTO nt_14_group_id FROM choice_groups WHERE name = 'Normal Toppings (14")' LIMIT 1;
  END IF;

  INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
  VALUES
    (nt_14_group_id, 'Pepperoni', 2.30, 1, true),
    (nt_14_group_id, 'Ham', 2.30, 2, true),
    (nt_14_group_id, 'Sausage', 2.30, 3, true),
    (nt_14_group_id, 'Ground Beef', 2.30, 4, true),
    (nt_14_group_id, 'Anchovies', 2.30, 5, true),
    (nt_14_group_id, 'Bacon', 2.30, 6, true),
    (nt_14_group_id, 'Green Olives', 2.30, 7, true),
    (nt_14_group_id, 'Black Olives', 2.30, 8, true),
    (nt_14_group_id, 'Mushrooms', 2.30, 9, true),
    (nt_14_group_id, 'Tomato', 2.30, 10, true),
    (nt_14_group_id, 'Bell Peppers', 2.30, 11, true),
    (nt_14_group_id, 'Garlic', 2.30, 12, true),
    (nt_14_group_id, 'Roasted Red Peppers', 2.30, 13, true),
    (nt_14_group_id, 'Pineapple', 2.30, 14, true),
    (nt_14_group_id, 'Banana Peppers', 2.30, 15, true),
    (nt_14_group_id, 'Jalapeno Peppers', 2.30, 16, true),
    (nt_14_group_id, 'Red Onion', 2.30, 17, true),
    (nt_14_group_id, 'Extra Sauce', 2.30, 18, true),
    (nt_14_group_id, 'Extra Cheese', 2.30, 19, true)
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- 6. SPECIALTY TOPPINGS - 14"
  -- ============================================
  INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
  VALUES
    ('Specialty Toppings (14")', 'Add premium toppings - $3.30 each', 21, true, false, NULL, 0)
  ON CONFLICT DO NOTHING
  RETURNING id INTO st_14_group_id;

  IF st_14_group_id IS NULL THEN
    SELECT id INTO st_14_group_id FROM choice_groups WHERE name = 'Specialty Toppings (14")' LIMIT 1;
  END IF;

  INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
  VALUES
    (st_14_group_id, 'Spinach', 3.30, 1, true),
    (st_14_group_id, 'Feta', 3.30, 2, true),
    (st_14_group_id, 'Artichokes', 3.30, 3, true),
    (st_14_group_id, 'Ricotta', 3.30, 4, true),
    (st_14_group_id, 'Fresh Mozzarella', 3.30, 5, true),
    (st_14_group_id, 'Chicken', 3.30, 6, true),
    (st_14_group_id, 'Meatballs', 3.30, 7, true),
    (st_14_group_id, 'Eggplant', 3.30, 8, true)
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- 7. NORMAL TOPPINGS - 16"
  -- ============================================
  INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
  VALUES
    ('Normal Toppings (16")', 'Add regular toppings - $2.80 each', 30, true, false, NULL, 0)
  ON CONFLICT DO NOTHING
  RETURNING id INTO nt_16_group_id;

  IF nt_16_group_id IS NULL THEN
    SELECT id INTO nt_16_group_id FROM choice_groups WHERE name = 'Normal Toppings (16")' LIMIT 1;
  END IF;

  INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
  VALUES
    (nt_16_group_id, 'Pepperoni', 2.80, 1, true),
    (nt_16_group_id, 'Ham', 2.80, 2, true),
    (nt_16_group_id, 'Sausage', 2.80, 3, true),
    (nt_16_group_id, 'Ground Beef', 2.80, 4, true),
    (nt_16_group_id, 'Anchovies', 2.80, 5, true),
    (nt_16_group_id, 'Bacon', 2.80, 6, true),
    (nt_16_group_id, 'Green Olives', 2.80, 7, true),
    (nt_16_group_id, 'Black Olives', 2.80, 8, true),
    (nt_16_group_id, 'Mushrooms', 2.80, 9, true),
    (nt_16_group_id, 'Tomato', 2.80, 10, true),
    (nt_16_group_id, 'Bell Peppers', 2.80, 11, true),
    (nt_16_group_id, 'Garlic', 2.80, 12, true),
    (nt_16_group_id, 'Roasted Red Peppers', 2.80, 13, true),
    (nt_16_group_id, 'Pineapple', 2.80, 14, true),
    (nt_16_group_id, 'Banana Peppers', 2.80, 15, true),
    (nt_16_group_id, 'Jalapeno Peppers', 2.80, 16, true),
    (nt_16_group_id, 'Red Onion', 2.80, 17, true),
    (nt_16_group_id, 'Extra Sauce', 2.80, 18, true),
    (nt_16_group_id, 'Extra Cheese', 2.80, 19, true)
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- 8. SPECIALTY TOPPINGS - 16"
  -- ============================================
  INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
  VALUES
    ('Specialty Toppings (16")', 'Add premium toppings - $4.30 each', 31, true, false, NULL, 0)
  ON CONFLICT DO NOTHING
  RETURNING id INTO st_16_group_id;

  IF st_16_group_id IS NULL THEN
    SELECT id INTO st_16_group_id FROM choice_groups WHERE name = 'Specialty Toppings (16")' LIMIT 1;
  END IF;

  INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
  VALUES
    (st_16_group_id, 'Spinach', 4.30, 1, true),
    (st_16_group_id, 'Feta', 4.30, 2, true),
    (st_16_group_id, 'Artichokes', 4.30, 3, true),
    (st_16_group_id, 'Ricotta', 4.30, 4, true),
    (st_16_group_id, 'Fresh Mozzarella', 4.30, 5, true),
    (st_16_group_id, 'Chicken', 4.30, 6, true),
    (st_16_group_id, 'Meatballs', 4.30, 7, true),
    (st_16_group_id, 'Eggplant', 4.30, 8, true)
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- 9. NORMAL TOPPINGS - SICILIAN
  -- ============================================
  INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
  VALUES
    ('Normal Toppings (Sicilian)', 'Add regular toppings - $3.30 each', 40, true, false, NULL, 0)
  ON CONFLICT DO NOTHING
  RETURNING id INTO nt_sicilian_group_id;

  IF nt_sicilian_group_id IS NULL THEN
    SELECT id INTO nt_sicilian_group_id FROM choice_groups WHERE name = 'Normal Toppings (Sicilian)' LIMIT 1;
  END IF;

  INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
  VALUES
    (nt_sicilian_group_id, 'Pepperoni', 3.30, 1, true),
    (nt_sicilian_group_id, 'Ham', 3.30, 2, true),
    (nt_sicilian_group_id, 'Sausage', 3.30, 3, true),
    (nt_sicilian_group_id, 'Ground Beef', 3.30, 4, true),
    (nt_sicilian_group_id, 'Anchovies', 3.30, 5, true),
    (nt_sicilian_group_id, 'Bacon', 3.30, 6, true),
    (nt_sicilian_group_id, 'Green Olives', 3.30, 7, true),
    (nt_sicilian_group_id, 'Black Olives', 3.30, 8, true),
    (nt_sicilian_group_id, 'Mushrooms', 3.30, 9, true),
    (nt_sicilian_group_id, 'Tomato', 3.30, 10, true),
    (nt_sicilian_group_id, 'Bell Peppers', 3.30, 11, true),
    (nt_sicilian_group_id, 'Garlic', 3.30, 12, true),
    (nt_sicilian_group_id, 'Roasted Red Peppers', 3.30, 13, true),
    (nt_sicilian_group_id, 'Pineapple', 3.30, 14, true),
    (nt_sicilian_group_id, 'Banana Peppers', 3.30, 15, true),
    (nt_sicilian_group_id, 'Jalapeno Peppers', 3.30, 16, true),
    (nt_sicilian_group_id, 'Red Onion', 3.30, 17, true),
    (nt_sicilian_group_id, 'Extra Sauce', 3.30, 18, true),
    (nt_sicilian_group_id, 'Extra Cheese', 3.30, 19, true)
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- 10. SPECIALTY TOPPINGS - SICILIAN
  -- ============================================
  INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
  VALUES
    ('Specialty Toppings (Sicilian)', 'Add premium toppings - $4.30 each', 41, true, false, NULL, 0)
  ON CONFLICT DO NOTHING
  RETURNING id INTO st_sicilian_group_id;

  IF st_sicilian_group_id IS NULL THEN
    SELECT id INTO st_sicilian_group_id FROM choice_groups WHERE name = 'Specialty Toppings (Sicilian)' LIMIT 1;
  END IF;

  INSERT INTO choice_items (choice_group_id, name, price, "order", is_active)
  VALUES
    (st_sicilian_group_id, 'Spinach', 4.30, 1, true),
    (st_sicilian_group_id, 'Feta', 4.30, 2, true),
    (st_sicilian_group_id, 'Artichokes', 4.30, 3, true),
    (st_sicilian_group_id, 'Ricotta', 4.30, 4, true),
    (st_sicilian_group_id, 'Fresh Mozzarella', 4.30, 5, true),
    (st_sicilian_group_id, 'Chicken', 4.30, 6, true),
    (st_sicilian_group_id, 'Meatballs', 4.30, 7, true),
    (st_sicilian_group_id, 'Eggplant', 4.30, 8, true)
  ON CONFLICT DO NOTHING;

END $$;
