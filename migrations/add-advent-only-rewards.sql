-- Add is_advent_only flag to rewards table
-- This allows rewards to be hidden from the regular rewards page

ALTER TABLE rewards
ADD COLUMN IF NOT EXISTS is_advent_only BOOLEAN DEFAULT false;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_rewards_advent_only ON rewards(is_advent_only);

COMMENT ON COLUMN rewards.is_advent_only IS 'If true, this reward only appears in advent calendar, not regular rewards page';
