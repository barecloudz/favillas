-- Function to calculate the correct price for a choice item based on other selections
-- This will be used by the frontend to show dynamic pricing

CREATE OR REPLACE FUNCTION get_choice_item_price(
  p_choice_item_id INTEGER,
  p_selected_choice_items INTEGER[]
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  base_price DECIMAL(10,2);
  conditional_price DECIMAL(10,2);
BEGIN
  -- Get the base price from choice_items
  SELECT price INTO base_price
  FROM choice_items
  WHERE id = p_choice_item_id;

  -- Check if there's a conditional price based on selected items
  SELECT price INTO conditional_price
  FROM choice_item_pricing
  WHERE choice_item_id = p_choice_item_id
    AND condition_choice_item_id = ANY(p_selected_choice_items)
  LIMIT 1;

  -- Return conditional price if found, otherwise base price
  RETURN COALESCE(conditional_price, base_price, 0.00);
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT get_choice_item_price(pepperoni_id, ARRAY[large_size_id]);
-- This would return the price of pepperoni when large size is selected
