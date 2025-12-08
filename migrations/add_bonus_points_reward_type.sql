-- Add bonus_points column to rewards table for rewards that give points
-- This allows advent calendar presents to award bonus points instead of vouchers

-- Add bonus_points column to store the amount of points to award
ALTER TABLE rewards
ADD COLUMN IF NOT EXISTS bonus_points INTEGER DEFAULT 0;

-- Add reward_type column if it doesn't exist (for clearer distinction between reward types)
ALTER TABLE rewards
ADD COLUMN IF NOT EXISTS reward_type TEXT DEFAULT 'discount';

-- Add comments for clarity
COMMENT ON COLUMN rewards.bonus_points IS 'Number of points to award when this reward is claimed (used for bonus_points reward type)';
COMMENT ON COLUMN rewards.reward_type IS 'Type of reward: discount, free_item, free_delivery, bonus_points';

-- Create index for reward_type
CREATE INDEX IF NOT EXISTS idx_rewards_reward_type ON rewards(reward_type);

-- Update existing rewards to have reward_type based on discount_type
UPDATE rewards
SET reward_type = CASE
  WHEN discount_type = 'delivery_fee' THEN 'free_delivery'
  WHEN free_item_menu_id IS NOT NULL OR free_item IS NOT NULL THEN 'free_item'
  ELSE 'discount'
END
WHERE reward_type IS NULL OR reward_type = 'discount';

-- Verification
SELECT
  'Bonus points reward type added' as status,
  COUNT(*) as total_rewards,
  COUNT(CASE WHEN reward_type = 'bonus_points' THEN 1 END) as bonus_points_rewards
FROM rewards;
