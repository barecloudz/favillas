-- Migration to add supabase_user_id support to points system tables
-- This enables proper points tracking for both legacy users and Google OAuth users

-- Add supabase_user_id to user_points table
ALTER TABLE user_points ADD COLUMN IF NOT EXISTS supabase_user_id TEXT;

-- Add unique index on supabase_user_id to prevent duplicate point records for Supabase users
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_points_supabase_user_id
ON user_points(supabase_user_id) WHERE supabase_user_id IS NOT NULL;

-- Add supabase_user_id to points_transactions table
ALTER TABLE points_transactions ADD COLUMN IF NOT EXISTS supabase_user_id TEXT;

-- Add index on points_transactions.supabase_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_points_transactions_supabase_user_id
ON points_transactions(supabase_user_id) WHERE supabase_user_id IS NOT NULL;

-- Modify the user_id constraint to allow NULL values when supabase_user_id is used
ALTER TABLE points_transactions ALTER COLUMN user_id DROP NOT NULL;

-- Add check constraint to ensure either user_id or supabase_user_id is provided
ALTER TABLE user_points ADD CONSTRAINT IF NOT EXISTS chk_user_points_user_reference
CHECK ((user_id IS NOT NULL AND supabase_user_id IS NULL) OR (user_id IS NULL AND supabase_user_id IS NOT NULL));

ALTER TABLE points_transactions ADD CONSTRAINT IF NOT EXISTS chk_points_transactions_user_reference
CHECK ((user_id IS NOT NULL AND supabase_user_id IS NULL) OR (user_id IS NULL AND supabase_user_id IS NOT NULL));

-- Add comments explaining the purpose
COMMENT ON COLUMN user_points.supabase_user_id IS 'Supabase UUID for Google OAuth users - mutually exclusive with user_id';
COMMENT ON COLUMN points_transactions.supabase_user_id IS 'Supabase UUID for Google OAuth users - mutually exclusive with user_id';