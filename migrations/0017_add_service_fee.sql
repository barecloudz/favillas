-- Add service fee column to orders table
-- This tracks the card processing fee (e.g., 3.5%) charged on each order

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10, 2) DEFAULT 0 NOT NULL;

-- Add comment
COMMENT ON COLUMN orders.service_fee IS 'Card processing or service fee charged on the order';

-- Add service fee settings to restaurant_settings table
ALTER TABLE restaurant_settings
ADD COLUMN IF NOT EXISTS service_fee_percentage DECIMAL(5, 2) DEFAULT 3.50 NOT NULL,
ADD COLUMN IF NOT EXISTS service_fee_enabled BOOLEAN DEFAULT true NOT NULL;

-- Add comments for new settings
COMMENT ON COLUMN restaurant_settings.service_fee_percentage IS 'Service fee percentage (e.g., 3.50 for 3.5%)';
COMMENT ON COLUMN restaurant_settings.service_fee_enabled IS 'Whether to apply service fee to orders';

-- Update existing orders to have 0 service fee (retroactively)
UPDATE orders SET service_fee = 0 WHERE service_fee IS NULL;
