-- Add Pizza by the Slice category and initial items
-- This creates the category and starter menu items

-- 1. Create Pizza by the Slice category if it doesn't exist
INSERT INTO categories (name, "order", is_active, created_at)
VALUES ('Pizza by the Slice', 99, true, NOW())
ON CONFLICT (name) DO NOTHING;

-- 2. Create initial slice menu items
-- Cheese Slice
INSERT INTO menu_items (
  name,
  description,
  base_price,
  category,
  is_available,
  is_popular,
  is_new,
  image_url,
  created_at
)
VALUES (
  'Cheese Slice',
  'Classic NY-style cheese pizza slice with our signature tomato sauce and mozzarella',
  4.99,
  'Pizza by the Slice',
  true,
  false,
  true,
  '',
  NOW()
)
ON CONFLICT DO NOTHING;

-- Pepperoni Slice
INSERT INTO menu_items (
  name,
  description,
  base_price,
  category,
  is_available,
  is_popular,
  is_new,
  image_url,
  created_at
)
VALUES (
  'Pepperoni Slice',
  'Classic NY-style pepperoni pizza slice with our signature tomato sauce, mozzarella, and premium pepperoni',
  5.49,
  'Pizza by the Slice',
  true,
  false,
  true,
  '',
  NOW()
)
ON CONFLICT DO NOTHING;
