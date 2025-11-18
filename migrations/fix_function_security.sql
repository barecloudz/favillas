-- Fix function security: Set search_path to prevent injection attacks
-- This addresses the "mutable search_path" security warning

-- Drop and recreate the function with a safe search_path
DROP FUNCTION IF EXISTS public.get_choice_item_price(integer, integer);

CREATE OR REPLACE FUNCTION public.get_choice_item_price(
  p_choice_item_id integer,
  p_menu_item_id integer DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- Explicit search_path prevents injection
AS $$
DECLARE
  v_price numeric;
BEGIN
  -- First try to get menu-item-specific pricing
  IF p_menu_item_id IS NOT NULL THEN
    SELECT price INTO v_price
    FROM choice_item_pricing
    WHERE choice_item_id = p_choice_item_id
      AND menu_item_id = p_menu_item_id;

    IF v_price IS NOT NULL THEN
      RETURN v_price;
    END IF;
  END IF;

  -- Fall back to default choice item price
  SELECT additional_price INTO v_price
  FROM choice_items
  WHERE id = p_choice_item_id;

  RETURN COALESCE(v_price, 0);
END;
$$;

-- Grant execute permission to authenticated and service roles
GRANT EXECUTE ON FUNCTION public.get_choice_item_price(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_choice_item_price(integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_choice_item_price(integer, integer) TO anon;
