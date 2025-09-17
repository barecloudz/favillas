-- VOUCHER SYSTEM: Complete rewards redemption flow with admin control
-- This creates a proper voucher system where redeeming points gives users actual usable benefits
-- All voucher properties are configurable by admins through the rewards table

-- Create user vouchers table
CREATE TABLE IF NOT EXISTS user_vouchers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  supabase_user_id TEXT, -- For Google users
  reward_id INTEGER, -- Reference to the reward that was redeemed
  voucher_code TEXT UNIQUE NOT NULL, -- Unique code like "SAVE5-ABC123"

  -- Discount details
  discount_amount DECIMAL(10,2) NOT NULL, -- Dollar amount or percentage value
  discount_type TEXT NOT NULL DEFAULT 'fixed', -- 'fixed' ($5 off) or 'percentage' (10% off)
  min_order_amount DECIMAL(10,2) DEFAULT 0, -- Minimum order required to use voucher

  -- Voucher lifecycle
  points_used INTEGER NOT NULL, -- Points spent to get this voucher
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'used', 'expired'
  expires_at TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '30 days',

  -- Usage tracking
  applied_to_order_id INTEGER REFERENCES orders(id),
  created_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP,

  -- Metadata
  title TEXT, -- "5% Off Your Order"
  description TEXT -- "Save 5% on any order over $20"
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_vouchers_user_id ON user_vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vouchers_supabase_user_id ON user_vouchers(supabase_user_id) WHERE supabase_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_vouchers_code ON user_vouchers(voucher_code);
CREATE INDEX IF NOT EXISTS idx_user_vouchers_status ON user_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_user_vouchers_expires ON user_vouchers(expires_at);

-- Unique constraint to prevent duplicate voucher codes
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_vouchers_code_unique ON user_vouchers(voucher_code);

-- Comments
COMMENT ON TABLE user_vouchers IS 'Stores redeemable vouchers/coupons that users get when they redeem rewards points';
COMMENT ON COLUMN user_vouchers.voucher_code IS 'Unique voucher code displayed to user, e.g., SAVE5-ABC123';
COMMENT ON COLUMN user_vouchers.discount_type IS 'Either fixed (dollar amount) or percentage discount';
COMMENT ON COLUMN user_vouchers.status IS 'active = can be used, used = already applied to order, expired = past expiration date';

-- Sample data for testing (optional)
-- INSERT INTO user_vouchers (user_id, voucher_code, discount_amount, discount_type, points_used, title, description)
-- VALUES (1, 'SAVE5-TEST123', 5.00, 'fixed', 50, '$5 Off', 'Save $5 on any order');

-- Verification query
SELECT
  'Voucher system table created' as status,
  COUNT(*) as existing_vouchers
FROM user_vouchers;