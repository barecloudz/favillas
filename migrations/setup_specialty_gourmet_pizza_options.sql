-- Setup Specialty Gourmet Pizza customization with size-dependent pricing
-- 4 sizes: 10" ($16.49), 14" ($23.49), 16" ($26.49), Sicilian ($28.99)
-- Uses the SAME topping groups as Traditional Pizza (since pricing is identical)

-- ============================================
-- 1. CREATE SPECIALTY GOURMET PIZZA SIZE GROUP
-- ============================================
INSERT INTO choice_groups (name, description, "order", is_active, is_required, max_selections, min_selections)
VALUES
  ('Specialty Gourmet Pizza Size', 'Choose your pizza size', 1, true, true, 1, 1)
ON CONFLICT DO NOTHING;

-- Add size options with Specialty Gourmet pricing
DO $$
DECLARE
  specialty_size_group_id integer;
BEGIN
  SELECT id INTO specialty_size_group_id FROM choice_groups WHERE name = 'Specialty Gourmet Pizza Size' LIMIT 1;

  INSERT INTO choice_items (choice_group_id, name, price, "order", is_active, is_default)
  VALUES
    (specialty_size_group_id, '10"', 16.49, 1, true, true),
    (specialty_size_group_id, '14"', 23.49, 2, true, false),
    (specialty_size_group_id, '16"', 26.49, 3, true, false),
    (specialty_size_group_id, 'Sicilian', 28.99, 4, true, false)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created Specialty Gourmet Pizza Size group with prices: 10" $16.49, 14" $23.49, 16" $26.49, Sicilian $28.99';
END $$;
