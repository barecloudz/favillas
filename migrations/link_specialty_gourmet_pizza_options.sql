-- Link Specialty Gourmet Pizza Size and topping choice groups to Specialty Gourmet Pizza items
-- Uses Specialty Gourmet pricing for sizes, but same topping groups as Traditional Pizza

DO $$
DECLARE
  specialty_size_group_id integer;
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
  -- Get all the choice group IDs
  SELECT id INTO specialty_size_group_id FROM choice_groups WHERE name = 'Specialty Gourmet Pizza Size' LIMIT 1;
  SELECT id INTO nt_10_id FROM choice_groups WHERE name = 'Normal Toppings (10")' LIMIT 1;
  SELECT id INTO st_10_id FROM choice_groups WHERE name = 'Specialty Toppings (10")' LIMIT 1;
  SELECT id INTO nt_14_id FROM choice_groups WHERE name = 'Normal Toppings (14")' LIMIT 1;
  SELECT id INTO st_14_id FROM choice_groups WHERE name = 'Specialty Toppings (14")' LIMIT 1;
  SELECT id INTO nt_16_id FROM choice_groups WHERE name = 'Normal Toppings (16")' LIMIT 1;
  SELECT id INTO st_16_id FROM choice_groups WHERE name = 'Specialty Toppings (16")' LIMIT 1;
  SELECT id INTO nt_sicilian_id FROM choice_groups WHERE name = 'Normal Toppings (Sicilian)' LIMIT 1;
  SELECT id INTO st_sicilian_id FROM choice_groups WHERE name = 'Specialty Toppings (Sicilian)' LIMIT 1;

  -- Check if we found the size group
  IF specialty_size_group_id IS NULL THEN
    RAISE EXCEPTION 'Specialty Gourmet Pizza Size choice group not found. Please run setup_specialty_gourmet_pizza_options.sql first.';
  END IF;

  RAISE NOTICE 'Found choice groups - Specialty Size: %, NT 10": %, ST 10": %', specialty_size_group_id, nt_10_id, st_10_id;

  -- Find all Specialty Gourmet Pizza items
  FOR item IN
    SELECT id, name FROM menu_items WHERE category = 'Specialty Gourmet Pizzas'
  LOOP
    RAISE NOTICE 'Linking choice groups to: % (ID: %)', item.name, item.id;

    -- Link Specialty Gourmet Size (Required)
    INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
    VALUES (item.id, specialty_size_group_id, true)
    ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
    SET is_required = true;

    -- Link Normal Toppings - 10" (Optional)
    IF nt_10_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, nt_10_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    -- Link Specialty Toppings - 10" (Optional)
    IF st_10_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, st_10_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    -- Link Normal Toppings - 14" (Optional)
    IF nt_14_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, nt_14_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    -- Link Specialty Toppings - 14" (Optional)
    IF st_14_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, st_14_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    -- Link Normal Toppings - 16" (Optional)
    IF nt_16_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, nt_16_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    -- Link Specialty Toppings - 16" (Optional)
    IF st_16_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, st_16_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    -- Link Normal Toppings - Sicilian (Optional)
    IF nt_sicilian_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, nt_sicilian_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    -- Link Specialty Toppings - Sicilian (Optional)
    IF st_sicilian_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, st_sicilian_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    RAISE NOTICE 'Successfully linked all choice groups to: %', item.name;
  END LOOP;

  RAISE NOTICE 'All Specialty Gourmet Pizza items have been configured with size-based toppings!';
END $$;
