-- Create order_refunds table for audit trail
CREATE TABLE IF NOT EXISTS order_refunds (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  refund_id VARCHAR(255) NOT NULL UNIQUE, -- Stripe refund ID
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  refund_type VARCHAR(20) NOT NULL CHECK (refund_type IN ('full', 'partial')),
  processed_by VARCHAR(255) NOT NULL, -- Staff email
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_order_refunds_order_id ON order_refunds(order_id);
CREATE INDEX idx_order_refunds_created_at ON order_refunds(created_at);

-- Add comment
COMMENT ON TABLE order_refunds IS 'Audit trail for all order refunds processed through Stripe';
