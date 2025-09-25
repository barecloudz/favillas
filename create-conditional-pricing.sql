-- Create conditional pricing system for choice items
-- This allows toppings to have different prices based on size selection

-- Create choice_item_pricing table
CREATE TABLE IF NOT EXISTS choice_item_pricing (
  id SERIAL PRIMARY KEY,
  choice_item_id INTEGER NOT NULL REFERENCES choice_items(id) ON DELETE CASCADE,
  condition_choice_item_id INTEGER NOT NULL REFERENCES choice_items(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(choice_item_id, condition_choice_item_id)
);

-- Add comment for clarity
COMMENT ON TABLE choice_item_pricing IS 'Stores conditional prices for choice items based on other selected choices (e.g., topping prices based on size)';
COMMENT ON COLUMN choice_item_pricing.choice_item_id IS 'The choice item whose price varies (e.g., pepperoni topping)';
COMMENT ON COLUMN choice_item_pricing.condition_choice_item_id IS 'The choice item that affects the price (e.g., large size)';
COMMENT ON COLUMN choice_item_pricing.price IS 'The price when the condition choice is selected';

-- Example data: Pepperoni pricing based on pizza size
-- First, let's see what choice items exist for sizes and toppings

SELECT 'EXISTING SIZE CHOICES:' as info;
SELECT ci.id, ci.name, cg.name as group_name
FROM choice_items ci
JOIN choice_groups cg ON ci.choice_group_id = cg.id
WHERE cg.name ILIKE '%size%'
ORDER BY ci.price;

SELECT 'EXISTING TOPPING CHOICES:' as info;
SELECT ci.id, ci.name, ci.price as current_price, cg.name as group_name
FROM choice_items ci
JOIN choice_groups cg ON ci.choice_group_id = cg.id
WHERE cg.name ILIKE '%topping%' OR cg.name ILIKE '%extra%'
ORDER BY ci.name;

-- Instructions for setting up conditional pricing:
-- 1. Run the above SELECTs to see available size and topping IDs
-- 2. Use INSERT statements like this example:

-- Example: Pepperoni costs $2 on small, $3 on medium, $4 on large
-- INSERT INTO choice_item_pricing (choice_item_id, condition_choice_item_id, price)
-- VALUES 
--   (pepperoni_id, small_size_id, 2.00),
--   (pepperoni_id, medium_size_id, 3.00),
--   (pepperoni_id, large_size_id, 4.00);
