-- Migration to add supabase_user_id support to user_points_redemptions table
-- This fixes the foreign key constraint error for Google OAuth users

-- Add supabase_user_id column to user_points_redemptions table
ALTER TABLE user_points_redemptions ADD COLUMN IF NOT EXISTS supabase_user_id TEXT;

-- Add index on supabase_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_points_redemptions_supabase_user_id
ON user_points_redemptions(supabase_user_id) WHERE supabase_user_id IS NOT NULL;

-- Modify the user_id constraint to allow NULL values when supabase_user_id is used
ALTER TABLE user_points_redemptions ALTER COLUMN user_id DROP NOT NULL;

-- Add check constraint to ensure either user_id or supabase_user_id is provided
ALTER TABLE user_points_redemptions ADD CONSTRAINT IF NOT EXISTS chk_user_points_redemptions_user_reference
CHECK ((user_id IS NOT NULL AND supabase_user_id IS NULL) OR (user_id IS NULL AND supabase_user_id IS NOT NULL));

-- Add comment explaining the purpose
COMMENT ON COLUMN user_points_redemptions.supabase_user_id IS 'Supabase UUID for Google OAuth users - mutually exclusive with user_id';