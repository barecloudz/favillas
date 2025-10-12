-- Link Size and Topping choice groups to Calzone and Stromboli items
-- This script automatically finds your calzone/stromboli items and links the option groups

DO $$
DECLARE
  calzone_size_group_id integer;
  stromboli_size_group_id integer;
  normal_small_id integer;
  specialty_small_id integer;
  normal_medium_id integer;
  specialty_medium_id integer;
  normal_large_id integer;
  specialty_large_id integer;
  item record;
BEGIN
  -- Get all the choice group IDs
  SELECT id INTO calzone_size_group_id FROM choice_groups WHERE name = 'Calzone Size' LIMIT 1;
  SELECT id INTO stromboli_size_group_id FROM choice_groups WHERE name = 'Stromboli Size' LIMIT 1;
  SELECT id INTO normal_small_id FROM choice_groups WHERE name = 'Normal Toppings (Small)' LIMIT 1;
  SELECT id INTO specialty_small_id FROM choice_groups WHERE name = 'Specialty Toppings (Small)' LIMIT 1;
  SELECT id INTO normal_medium_id FROM choice_groups WHERE name = 'Normal Toppings (Medium)' LIMIT 1;
  SELECT id INTO specialty_medium_id FROM choice_groups WHERE name = 'Specialty Toppings (Medium)' LIMIT 1;
  SELECT id INTO normal_large_id FROM choice_groups WHERE name = 'Normal Toppings (Large)' LIMIT 1;
  SELECT id INTO specialty_large_id FROM choice_groups WHERE name = 'Specialty Toppings (Large)' LIMIT 1;

  -- Check if we found the choice groups
  IF calzone_size_group_id IS NULL THEN
    RAISE EXCEPTION 'Calzone Size choice group not found. Please run setup_calzone_stromboli_options.sql first.';
  END IF;

  IF stromboli_size_group_id IS NULL THEN
    RAISE EXCEPTION 'Stromboli Size choice group not found. Please run setup_calzone_stromboli_options.sql first.';
  END IF;

  RAISE NOTICE 'Found choice groups - Calzone Size: %, Stromboli Size: %, Normal Small: %', calzone_size_group_id, stromboli_size_group_id, normal_small_id;

  -- Find all Calzone items (category = 'Calzones')
  FOR item IN
    SELECT id, name FROM menu_items WHERE category = 'Calzones'
  LOOP
    RAISE NOTICE 'Linking choice groups to: % (ID: %)', item.name, item.id;

    -- Link Size (Required)
    INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
    VALUES (item.id, calzone_size_group_id, true)
    ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
    SET is_required = true;

    -- Link Normal Toppings - Small (Optional)
    IF normal_small_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, normal_small_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    -- Link Specialty Toppings - Small (Optional)
    IF specialty_small_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, specialty_small_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    -- Link Normal Toppings - Medium (Optional)
    IF normal_medium_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, normal_medium_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    -- Link Specialty Toppings - Medium (Optional)
    IF specialty_medium_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, specialty_medium_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    -- Link Normal Toppings - Large (Optional)
    IF normal_large_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, normal_large_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    -- Link Specialty Toppings - Large (Optional)
    IF specialty_large_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, specialty_large_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    RAISE NOTICE 'Successfully linked all choice groups to: %', item.name;
  END LOOP;

  -- Find all Stromboli items (category = 'Strombolis')
  FOR item IN
    SELECT id, name FROM menu_items WHERE category = 'Strombolis'
  LOOP
    RAISE NOTICE 'Linking choice groups to: % (ID: %)', item.name, item.id;

    -- Link Size (Required)
    INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
    VALUES (item.id, stromboli_size_group_id, true)
    ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
    SET is_required = true;

    -- Link Normal Toppings - Small (Optional)
    IF normal_small_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, normal_small_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    -- Link Specialty Toppings - Small (Optional)
    IF specialty_small_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, specialty_small_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    -- Link Normal Toppings - Medium (Optional)
    IF normal_medium_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, normal_medium_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    -- Link Specialty Toppings - Medium (Optional)
    IF specialty_medium_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, specialty_medium_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    -- Link Normal Toppings - Large (Optional)
    IF normal_large_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, normal_large_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    -- Link Specialty Toppings - Large (Optional)
    IF specialty_large_id IS NOT NULL THEN
      INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, is_required)
      VALUES (item.id, specialty_large_id, false)
      ON CONFLICT (menu_item_id, choice_group_id) DO UPDATE
      SET is_required = false;
    END IF;

    RAISE NOTICE 'Successfully linked all choice groups to: %', item.name;
  END LOOP;

  RAISE NOTICE 'All calzone and stromboli items have been configured with size-based toppings!';
END $$;
