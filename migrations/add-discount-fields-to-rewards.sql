-- Add discount fields to rewards table for voucher functionality
-- These fields define how the reward discount works when redeemed

ALTER TABLE rewards
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS min_order_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_discount_amount DECIMAL(10,2);

-- Add comments for clarity
COMMENT ON COLUMN rewards.discount_amount IS 'Dollar amount or percentage value (e.g., 5.00 for $5 off or 10.00 for 10% off)';
COMMENT ON COLUMN rewards.discount_type IS 'Either "fixed" ($5 off) or "percentage" (10% off)';
COMMENT ON COLUMN rewards.min_order_amount IS 'Minimum order total required to use this reward (e.g., 20.00 for orders $20+)';
COMMENT ON COLUMN rewards.max_discount_amount IS 'Maximum discount cap for percentage discounts (e.g., 10.00 to cap 50% off at $10 max)';

-- Add index for discount_type for faster queries
CREATE INDEX IF NOT EXISTS idx_rewards_discount_type ON rewards(discount_type);

-- Verification
SELECT
  'Discount fields added to rewards table' as status,
  COUNT(*) as total_rewards
FROM rewards;
