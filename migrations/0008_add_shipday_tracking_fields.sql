-- Migration to add ShipDay tracking fields to orders table
-- This enables proper tracking and delivery status updates

-- Add tracking URL field for customer order tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;

-- Add estimated delivery time from ShipDay
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_time TIMESTAMP;

-- Add driver location data (stored as JSON)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_location JSONB;

-- Add index on shipday_order_id for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_orders_shipday_order_id ON orders(shipday_order_id) WHERE shipday_order_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN orders.tracking_url IS 'ShipDay tracking URL for customer order tracking';
COMMENT ON COLUMN orders.estimated_delivery_time IS 'Estimated delivery time from ShipDay API';
COMMENT ON COLUMN orders.driver_location IS 'Real-time driver location data from ShipDay (lat, lng, timestamp)';

-- Update existing orders to have proper shipday_status if they have shipday_order_id
UPDATE orders
SET shipday_status = 'pending'
WHERE shipday_order_id IS NOT NULL
  AND (shipday_status IS NULL OR shipday_status = '');