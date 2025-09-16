-- Add points-based fields to existing rewards table
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS points_required INTEGER DEFAULT 0;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS reward_type VARCHAR(50) DEFAULT 'discount';
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS free_item VARCHAR(255);
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS times_used INTEGER DEFAULT 0;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS max_uses INTEGER;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create user points tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_points (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points_earned INTEGER DEFAULT 0,
  points_redeemed INTEGER DEFAULT 0,
  transaction_type VARCHAR(50) NOT NULL, -- 'earned', 'redeemed'
  reference_id INTEGER, -- order_id for earned points, reward_id for redeemed points
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create reward redemptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id INTEGER NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  order_id INTEGER, -- which order this was used on (if applicable)
  is_used BOOLEAN DEFAULT false,
  redeemed_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_type ON user_points(transaction_type);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user_id ON reward_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_id ON reward_redemptions(reward_id);

-- Update existing rewards to have points if they don't
UPDATE rewards
SET points_required = CASE
  WHEN discount IS NOT NULL AND discount > 0 THEN (discount * 10)::INTEGER
  ELSE 100
END
WHERE points_required = 0 OR points_required IS NULL;