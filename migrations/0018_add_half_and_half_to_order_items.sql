-- Migration: Add half_and_half column to order_items table
-- This allows storing half-and-half pizza topping selections for kitchen display

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS half_and_half JSONB DEFAULT NULL;

COMMENT ON COLUMN order_items.half_and_half IS 'Stores half-and-half pizza topping selections as JSON: {firstHalf: [...], secondHalf: [...]}';
