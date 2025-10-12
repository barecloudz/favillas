-- Update Specialty Gourmet Pizzas to use Traditional Pizza Size system
-- Remove old Size and Toppings choice groups, add new size-dependent system

DO $$
DECLARE
  pizza_size_group_id integer;
  old_size_group_id integer;
  old_toppings_group_id integer;
  nt_10_id integer;
  st_10_id integer;
  nt_14_id integer;
  st_14_id integer;
  nt_16_id integer;
  st_16_id integer;
  nt_sicilian_id integer;
  st_sicilian_id integer;
  item record;
BEGIN
  -- Get the old and new choice group IDs
  SELECT id INTO old_size_group_id FROM choice_groups WHERE name = 'Size' AND description = 'Choose your pizza size' AND priority = 1 LIMIT 1;
  SELECT id INTO old_toppings_group_id FROM choice_groups WHERE name = 'Toppings' AND description = 'Add extra toppings to your pizza' LIMIT 1;
  SELECT id INTO pizza_size_group_id FROM choice_groups WHERE name = 'Traditional Pizza Size' LIMIT 1;
  SELECT id INTO nt_10_id FROM choice_groups WHERE name = 'Normal Toppings (10")' LIMIT 1;
  SELECT id INTO st_10_id FROM choice_groups WHERE name = 'Specialty Toppings (10")' LIMIT 1;
  SELECT id INTO nt_14_id FROM choice_groups WHERE name = 'Normal Toppings (14")' LIMIT 1;
  SELECT id INTO st_14_id FROM choice_groups WHERE name = 'Specialty Toppings (14")' LIMIT 1;
  SELECT id INTO nt_16_id FROM choice_groups WHERE name = 'Normal Toppings (16")' LIMIT 1;
  SELECT id INTO st_16_id FROM choice_groups WHERE name = 'Specialty Toppings (16")' LIMIT 1;
  SELECT id INTO nt_sicilian_id FROM choice_groups WHERE name = 'Normal Toppings (Sicilian)' LIMIT 1;
  SELECT id INTO st_sicilian_id FROM choice_groups WHERE name = 'Specialty Toppings (Sicilian)' LIMIT 1;

  -- Check if we found the new system
  IF pizza_size_group_id IS NULL THEN
    RAISE EXCEPTION 'Traditional Pizza Size choice group not found. Please run setup_traditional_pizza_options.sql first.';
  END IF;

  RAISE NOTICE 'Found choice groups - Old Size: %, Old Toppings: %, New Size: %', old_size_group_id, old_toppings_group_id, pizza_size_group_id;

  -- Find all Specialty Gourmet Pizza items
  FOR item IN
    SELECT id, name FROM menu_items WHERE category = 'Specialty Gourmet Pizzas'
  LOOP
    RAISE NOTICE 'Updating choice groups for: % (ID: %)', item.name, item.id;

    -- Remove old Size and Toppings links
    IF old_size_group_id IS NOT NULL THEN
      DELETE FROM menu_item_choice_groups WHERE menu_item_id = item.id AND choice_group_id = old_size_group_id;
      RAISE NOTICE 'Removed old Size link for item %', item.id;
    END IF;

    IF old_toppings_group_id IS NOT NULL THEN
      DELETE FROM menu_item_choice_groups WHERE menu_item_id = item.id AND choice_group_id = old_toppings_group_id;
      RAISE NOTICE 'Removed old Toppings link for item %', item.id;
    END IF;

    -- Link new Traditional Pizza Size (Required)
    INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
    VALUES (item.id, pizza_size_group_id, true)
    ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
    SET is_required = true;

    -- Link all size-dependent topping groups (Optional)
    IF nt_10_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, nt_10_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    IF st_10_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, st_10_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    IF nt_14_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, nt_14_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    IF st_14_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, st_14_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    IF nt_16_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, nt_16_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    IF st_16_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, st_16_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    IF nt_sicilian_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, nt_sicilian_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    IF st_sicilian_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, st_sicilian_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    RAISE NOTICE 'Successfully updated choice groups for: %', item.name;
  END LOOP;

  RAISE NOTICE 'All Specialty Gourmet Pizza items have been updated to use the new size-based topping system!';
END $$;
