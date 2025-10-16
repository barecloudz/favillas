-- =====================================================
-- CRITICAL FIX: Run this SQL in Supabase SQL Editor
-- =====================================================
-- This will fix the duplicate points records bug for ALL users
--
-- HOW TO RUN:
-- 1. Go to your Supabase project dashboard
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Copy/paste ALL of this SQL
-- 5. Click "Run" button
-- =====================================================

-- Step 1: Show ALL duplicate records across all users
SELECT 'BEFORE FIX - ALL duplicate records:' as status;
SELECT supabase_user_id, user_id, COUNT(*) as duplicate_count, array_agg(id) as record_ids
FROM user_points
GROUP BY supabase_user_id, user_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- Step 2: Delete ALL duplicate records by supabase_user_id (keep oldest for each user)
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY supabase_user_id ORDER BY created_at ASC, id ASC) as rn
  FROM user_points
  WHERE supabase_user_id IS NOT NULL
)
DELETE FROM user_points
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 3: Delete ALL duplicate records by user_id (keep oldest for each user)
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC, id ASC) as rn
  FROM user_points
  WHERE user_id IS NOT NULL
)
DELETE FROM user_points
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

SELECT 'AFTER DELETION - Check for remaining duplicates:' as status;
SELECT supabase_user_id, user_id, COUNT(*) as count
FROM user_points
GROUP BY supabase_user_id, user_id
HAVING COUNT(*) > 1;

-- Step 3: Create unique constraints to prevent future duplicates
DROP INDEX IF EXISTS idx_user_points_user_id;
DROP INDEX IF EXISTS idx_user_points_supabase_user_id;

CREATE UNIQUE INDEX idx_user_points_user_id
ON user_points(user_id)
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX idx_user_points_supabase_user_id
ON user_points(supabase_user_id)
WHERE supabase_user_id IS NOT NULL;

SELECT 'UNIQUE CONSTRAINTS CREATED!' as status;

-- Step 4: Show final state
SELECT 'FINAL CHECK:' as status;
SELECT
  up.supabase_user_id,
  up.points,
  up.total_earned,
  up.total_redeemed,
  up.created_at,
  up.updated_at,
  COUNT(pt.id) as transaction_count
FROM user_points up
LEFT JOIN points_transactions pt ON pt.supabase_user_id = up.supabase_user_id
WHERE up.supabase_user_id = 'ba1a4039-521c-4634-9393-5333edbec807'
GROUP BY up.supabase_user_id, up.points, up.total_earned, up.total_redeemed, up.created_at, up.updated_at;

-- SUCCESS MESSAGE
SELECT '✅ DUPLICATE RECORDS DELETED!' as message,
       '✅ UNIQUE CONSTRAINTS CREATED!' as protection,
       '✅ YOUR POINTS SYSTEM IS NOW FIXED!' as result;
