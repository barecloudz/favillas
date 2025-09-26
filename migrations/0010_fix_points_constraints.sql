-- Migration to fix points system constraints and ensure proper Supabase user support
-- This migration addresses issues preventing points from being awarded to Supabase users

-- 1. Ensure supabase_user_id columns exist in all required tables
ALTER TABLE user_points ADD COLUMN IF NOT EXISTS supabase_user_id TEXT;
ALTER TABLE points_transactions ADD COLUMN IF NOT EXISTS supabase_user_id TEXT;

-- 2. Drop existing constraints that might be causing issues
ALTER TABLE user_points DROP CONSTRAINT IF EXISTS chk_user_points_user_reference;
ALTER TABLE points_transactions DROP CONSTRAINT IF EXISTS chk_points_transactions_user_reference;

-- 3. Modify user_id columns to allow NULL when supabase_user_id is used
ALTER TABLE user_points ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE points_transactions ALTER COLUMN user_id DROP NOT NULL;

-- 4. Create proper unique constraints
DROP INDEX IF EXISTS idx_user_points_supabase_user_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_points_supabase_user_id
ON user_points(supabase_user_id) WHERE supabase_user_id IS NOT NULL;

-- Also ensure we have a unique constraint on user_id for legacy users
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_points_user_id
ON user_points(user_id) WHERE user_id IS NOT NULL;

-- 5. Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_points_transactions_supabase_user_id
ON points_transactions(supabase_user_id) WHERE supabase_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_points_transactions_order_id
ON points_transactions(order_id);

-- 6. Add proper check constraints to ensure data integrity
ALTER TABLE user_points ADD CONSTRAINT chk_user_points_user_reference
CHECK (
  (user_id IS NOT NULL AND supabase_user_id IS NULL) OR
  (user_id IS NULL AND supabase_user_id IS NOT NULL)
);

ALTER TABLE points_transactions ADD CONSTRAINT chk_points_transactions_user_reference
CHECK (
  (user_id IS NOT NULL AND supabase_user_id IS NULL) OR
  (user_id IS NULL AND supabase_user_id IS NOT NULL)
);

-- 7. Ensure users table has proper constraints for supabase_user_id
ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_user_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_supabase_user_id
ON users(supabase_user_id) WHERE supabase_user_id IS NOT NULL;

-- 8. Add helpful comments
COMMENT ON COLUMN user_points.supabase_user_id IS 'Supabase UUID for Google OAuth users - mutually exclusive with user_id';
COMMENT ON COLUMN points_transactions.supabase_user_id IS 'Supabase UUID for Google OAuth users - mutually exclusive with user_id';

-- 9. Create a view to easily query user points regardless of user type
CREATE OR REPLACE VIEW v_user_points_unified AS
SELECT
  up.id,
  up.user_id,
  up.supabase_user_id,
  up.points,
  up.total_earned,
  up.total_redeemed,
  up.last_earned_at,
  up.created_at,
  up.updated_at,
  CASE
    WHEN up.user_id IS NOT NULL THEN 'legacy'
    WHEN up.supabase_user_id IS NOT NULL THEN 'supabase'
    ELSE 'unknown'
  END as user_type,
  COALESCE(u.email, su.email) as email,
  COALESCE(u.first_name, su.first_name) as first_name,
  COALESCE(u.last_name, su.last_name) as last_name
FROM user_points up
LEFT JOIN users u ON up.user_id = u.id
LEFT JOIN users su ON up.supabase_user_id = su.supabase_user_id;

-- Success message
SELECT 'Points system constraints migration completed successfully!' as message,
       'The points system now properly supports both legacy and Supabase users' as details;