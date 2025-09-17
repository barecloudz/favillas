-- CRITICAL DATA MIGRATION: Fix missing supabase_user_id associations
--
-- PROBLEM: Users who had orders before the Google auth migration (commit 0cde8e0)
-- now see 0 orders because their existing orders have supabase_user_id = NULL
-- but the API now queries for orders using supabase_user_id.
--
-- SOLUTION: This migration attempts to associate existing orders with Google users
-- based on available data patterns.

-- Step 1: Analysis - Find orders without supabase_user_id that might belong to Google users
SELECT
  'ANALYSIS: Orders without supabase_user_id' as analysis_type,
  COUNT(*) as count,
  MIN(created_at) as earliest_order,
  MAX(created_at) as latest_order
FROM orders
WHERE supabase_user_id IS NULL;

-- Step 2: Check if we can identify Google users by email patterns or other data
SELECT
  'ANALYSIS: Users with supabase_user_id' as analysis_type,
  COUNT(*) as count,
  supabase_user_id
FROM users
WHERE supabase_user_id IS NOT NULL
GROUP BY supabase_user_id;

-- Step 3: Look for orders that might match Google users by phone number or email
-- (This requires manual review and careful execution)

-- WARNING: The following UPDATE statements should be reviewed carefully before execution
-- They attempt to match orders to Google users based on available data

-- Example approach (COMMENTED OUT FOR SAFETY):
-- UPDATE orders
-- SET supabase_user_id = (
--   SELECT u.supabase_user_id
--   FROM users u
--   WHERE u.phone = orders.phone
--   AND u.supabase_user_id IS NOT NULL
--   LIMIT 1
-- )
-- WHERE supabase_user_id IS NULL
-- AND phone IS NOT NULL
-- AND EXISTS (
--   SELECT 1 FROM users u
--   WHERE u.phone = orders.phone
--   AND u.supabase_user_id IS NOT NULL
-- );

-- Step 4: For orders that cannot be automatically matched,
-- we may need to create a mapping based on user behavior patterns

-- MANUAL INTERVENTION REQUIRED:
-- 1. Identify the specific Google user account that's missing orders
-- 2. Identify the phone number or other identifier for that user
-- 3. Update orders with matching phone numbers to use that user's supabase_user_id

-- Example (TEMPLATE - REPLACE VALUES):
-- UPDATE orders
-- SET supabase_user_id = 'REPLACE_WITH_ACTUAL_SUPABASE_UUID'
-- WHERE phone = 'REPLACE_WITH_ACTUAL_PHONE_NUMBER'
-- AND supabase_user_id IS NULL;

-- Step 5: Verification queries
SELECT
  'VERIFICATION: Orders by user type after migration' as verification_type,
  CASE
    WHEN user_id IS NOT NULL AND supabase_user_id IS NULL THEN 'legacy_only'
    WHEN user_id IS NULL AND supabase_user_id IS NOT NULL THEN 'supabase_only'
    WHEN user_id IS NOT NULL AND supabase_user_id IS NOT NULL THEN 'both'
    ELSE 'neither'
  END as user_type,
  COUNT(*) as count
FROM orders
GROUP BY user_type
ORDER BY count DESC;