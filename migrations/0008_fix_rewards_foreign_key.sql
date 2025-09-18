-- Migration to fix foreign key constraint mismatch in user_points_redemptions table
-- The application code fetches from 'rewards' table but the foreign key references 'points_rewards'
-- This migration fixes the constraint to reference the correct table

-- Drop the incorrect foreign key constraint
ALTER TABLE user_points_redemptions
DROP CONSTRAINT IF EXISTS user_points_redemptions_points_reward_id_points_rewards_id_fk;

-- Rename the column to make it clear it references rewards table
ALTER TABLE user_points_redemptions
RENAME COLUMN points_reward_id TO reward_id;

-- Add the correct foreign key constraint referencing rewards table
ALTER TABLE user_points_redemptions
ADD CONSTRAINT user_points_redemptions_reward_id_rewards_id_fk
FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE;

-- Add comment explaining the fix
COMMENT ON COLUMN user_points_redemptions.reward_id IS 'References rewards.id - the main rewards table used by the application';