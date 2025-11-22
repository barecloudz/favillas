-- Add payment link fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_token TEXT,
ADD COLUMN IF NOT EXISTS payment_token_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'web';

-- Create index on payment_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_payment_token ON orders(payment_token);

-- Create index on order_source for analytics
CREATE INDEX IF NOT EXISTS idx_orders_order_source ON orders(order_source);
