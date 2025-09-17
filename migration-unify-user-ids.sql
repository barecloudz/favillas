-- CRITICAL MIGRATION: Unify User ID System to UUID Format
--
-- PROBLEM: Mixed user ID systems causing authentication and order association issues
-- - Legacy users: integer IDs (1, 2, 3...)
-- - Google users: UUID format (a1b2c3d4-...)
-- - Complex queries with OR conditions that often fail
-- - Points and order systems don't work consistently across user types
--
-- SOLUTION: Convert all user IDs to UUID format for consistency

-- Step 1: Add new UUID column for users (if not exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS uuid_id UUID;

-- Step 2: Generate UUIDs for existing users that don't have them
UPDATE users
SET uuid_id = gen_random_uuid()
WHERE uuid_id IS NULL;

-- Step 3: Create index on new UUID column
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_uuid_id ON users(uuid_id);

-- Step 4: Add new UUID foreign key column to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_uuid UUID;

-- Step 5: Populate user_uuid for existing orders with legacy user_id
UPDATE orders
SET user_uuid = (
  SELECT u.uuid_id
  FROM users u
  WHERE u.id = orders.user_id
)
WHERE user_uuid IS NULL
AND user_id IS NOT NULL;

-- Step 6: Populate user_uuid for orders with supabase_user_id
-- For Google users, we'll use their supabase_user_id as the UUID
UPDATE orders
SET user_uuid = supabase_user_id::UUID
WHERE user_uuid IS NULL
AND supabase_user_id IS NOT NULL;

-- Step 7: Update users table to use supabase_user_id as uuid_id for Google users
UPDATE users
SET uuid_id = supabase_user_id::UUID
WHERE supabase_user_id IS NOT NULL
AND uuid_id != supabase_user_id::UUID;

-- Step 8: Create index on orders.user_uuid
CREATE INDEX IF NOT EXISTS idx_orders_user_uuid ON orders(user_uuid);

-- Step 9: Verification queries
SELECT
  'Users with UUIDs' as check_type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE uuid_id IS NOT NULL) as with_uuid,
  COUNT(*) FILTER (WHERE uuid_id IS NULL) as without_uuid
FROM users;

SELECT
  'Orders with user associations' as check_type,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE user_uuid IS NOT NULL) as with_uuid,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) as with_legacy_id,
  COUNT(*) FILTER (WHERE supabase_user_id IS NOT NULL) as with_supabase_id
FROM orders;

-- Step 10: Show orders that still need manual attention
SELECT
  id,
  user_id,
  supabase_user_id,
  user_uuid,
  phone,
  total,
  created_at
FROM orders
WHERE user_uuid IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- FUTURE STEPS (after verification):
-- 1. Update all APIs to use user_uuid instead of user_id/supabase_user_id
-- 2. Drop old columns after full migration (user_id, supabase_user_id)
-- 3. Rename uuid_id to id and user_uuid to user_id for simplicity

-- ROLLBACK PLAN (if needed):
-- The original columns (user_id, supabase_user_id) are preserved
-- New columns can be dropped if migration fails:
-- ALTER TABLE users DROP COLUMN IF EXISTS uuid_id;
-- ALTER TABLE orders DROP COLUMN IF EXISTS user_uuid;