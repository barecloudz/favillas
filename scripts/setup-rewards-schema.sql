-- Rewards system database schema

-- Table to store available rewards that customers can redeem
CREATE TABLE IF NOT EXISTS rewards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'discount', -- 'discount', 'free_item', 'free_delivery', 'priority'
  points_required INTEGER NOT NULL DEFAULT 0,
  discount INTEGER, -- percentage discount (e.g., 10 for 10% off)
  free_item VARCHAR(255), -- name of free item
  min_order_amount DECIMAL(10,2), -- minimum order amount to qualify
  max_uses INTEGER, -- maximum number of times this reward can be used (null = unlimited)
  times_used INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table to track user point transactions
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

-- Table to track reward redemptions
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id INTEGER NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  order_id INTEGER, -- which order this was used on (if applicable)
  is_used BOOLEAN DEFAULT false,
  redeemed_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP,
  expires_at TIMESTAMP -- when this specific redemption expires
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_type ON user_points(transaction_type);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user_id ON reward_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_id ON reward_redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_rewards_active ON rewards(is_active);

-- Insert some default rewards
INSERT INTO rewards (name, description, type, points_required, discount, is_active) VALUES
('10% Off Your Order', 'Get 10% discount on your entire order', 'discount', 100, 10, true),
('Free Garlic Bread', 'Get a free order of garlic bread with any pizza', 'free_item', 150, null, true),
('Free Delivery', 'Get free delivery on your next order', 'free_delivery', 75, null, true),
('20% Off Large Pizza', 'Get 20% off any large pizza', 'discount', 200, 20, true),
('Free 2-Liter Soda', 'Get a free 2-liter soda with any order', 'free_item', 125, null, true)
ON CONFLICT DO NOTHING;