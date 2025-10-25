-- Add email column to orders table for order confirmations
ALTER TABLE orders ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Add index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);

-- Add comment
COMMENT ON COLUMN orders.email IS 'Customer email for order confirmation (optional for guests, required for logged-in users)';
