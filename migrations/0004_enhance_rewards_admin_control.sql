-- ENHANCED REWARDS: Make rewards fully configurable by admins
-- This allows admins to control all aspects of vouchers through the rewards management interface

-- Add admin-configurable columns to rewards table
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2);
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'fixed'; -- 'fixed' or 'percentage'
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS min_order_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS voucher_validity_days INTEGER DEFAULT 30;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS max_uses_per_user INTEGER DEFAULT 1;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS usage_instructions TEXT;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Update existing rewards with default values if they don't have them
UPDATE rewards SET
  discount_amount = COALESCE(discount_amount, 5.00),
  discount_type = COALESCE(discount_type, 'fixed'),
  min_order_amount = COALESCE(min_order_amount, 0),
  voucher_validity_days = COALESCE(voucher_validity_days, 30),
  max_uses_per_user = COALESCE(max_uses_per_user, 1),
  usage_instructions = COALESCE(usage_instructions, 'Apply this voucher at checkout to save money on your order.'),
  admin_notes = COALESCE(admin_notes, '')
WHERE discount_amount IS NULL;

-- Sample admin-configurable rewards
INSERT INTO rewards (
  name,
  description,
  points_required,
  discount_amount,
  discount_type,
  min_order_amount,
  voucher_validity_days,
  max_uses_per_user,
  usage_instructions,
  active
) VALUES
  (
    '$5 Off Any Order',
    'Save $5 on your next order',
    50,
    5.00,
    'fixed',
    0,
    30,
    1,
    'Apply this $5 off voucher at checkout. No minimum order required.',
    true
  ),
  (
    '10% Off Orders Over $25',
    'Get 10% off when you spend $25 or more',
    100,
    10.00,
    'percentage',
    25.00,
    30,
    1,
    'Apply this 10% discount voucher on orders of $25 or more.',
    true
  ),
  (
    'Free Delivery',
    'Free delivery on your next order',
    75,
    3.50,
    'delivery_fee',
    0,
    14,
    1,
    'Free delivery voucher - delivery fee will be waived at checkout.',
    true
  ),
  (
    '$15 Off Large Orders',
    'Save $15 on orders over $50',
    200,
    15.00,
    'fixed',
    50.00,
    60,
    1,
    'Big savings! Apply this $15 off voucher on orders of $50 or more.',
    true
  )
ON CONFLICT (name) DO NOTHING;

-- Comments for admin understanding
COMMENT ON COLUMN rewards.discount_amount IS 'Dollar amount (for fixed) or percentage value (for percentage). Admins can edit this.';
COMMENT ON COLUMN rewards.discount_type IS 'fixed = dollar off, percentage = % off, delivery_fee = free delivery. Admins can edit.';
COMMENT ON COLUMN rewards.min_order_amount IS 'Minimum order total required to use this voucher. Admins can edit.';
COMMENT ON COLUMN rewards.voucher_validity_days IS 'How many days the voucher stays valid after redemption. Admins can edit.';
COMMENT ON COLUMN rewards.max_uses_per_user IS 'How many times each user can redeem this reward. Admins can edit.';
COMMENT ON COLUMN rewards.usage_instructions IS 'Instructions shown to users about how to use the voucher. Admins can edit.';

-- Create view for admin reward management
CREATE OR REPLACE VIEW admin_rewards_view AS
SELECT
  r.id,
  r.name,
  r.description,
  r.points_required,
  r.discount_amount,
  r.discount_type,
  r.min_order_amount,
  r.voucher_validity_days,
  r.max_uses_per_user,
  r.usage_instructions,
  r.admin_notes,
  r.active,
  r.created_at,
  r.updated_at,

  -- Statistics for admins
  COUNT(uv.id) as total_redemptions,
  COUNT(CASE WHEN uv.status = 'used' THEN 1 END) as vouchers_used,
  COUNT(CASE WHEN uv.status = 'active' THEN 1 END) as vouchers_unused,
  COUNT(CASE WHEN uv.status = 'expired' THEN 1 END) as vouchers_expired,
  SUM(CASE WHEN uv.status = 'used' THEN uv.discount_amount ELSE 0 END) as total_discount_given

FROM rewards r
LEFT JOIN user_vouchers uv ON r.id = uv.reward_id
GROUP BY r.id, r.name, r.description, r.points_required, r.discount_amount,
         r.discount_type, r.min_order_amount, r.voucher_validity_days,
         r.max_uses_per_user, r.usage_instructions, r.admin_notes,
         r.active, r.created_at, r.updated_at
ORDER BY r.points_required ASC;

-- Verification
SELECT
  'Enhanced rewards system ready' as status,
  COUNT(*) as total_rewards,
  COUNT(CASE WHEN active = true THEN 1 END) as active_rewards
FROM rewards;