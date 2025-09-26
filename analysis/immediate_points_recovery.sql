-- IMMEDIATE POINTS RECOVERY SCRIPT
-- For User: phone 8039774285, supabase_user_id: bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a
-- Expected: 1,090+ points from $1,108 in orders
-- Current: 22 points
-- Discrepancy: ~1,068 points missing

-- =============================================================================
-- STEP 1: VERIFY CURRENT STATE BEFORE RECOVERY
-- =============================================================================

-- Check current orders for this phone
SELECT 'CURRENT ORDERS' as check_type, COUNT(*) as count, SUM(total::numeric) as total_spent, SUM(FLOOR(total::numeric)) as expected_points
FROM orders
WHERE phone = '8039774285'
  AND created_at >= NOW() - INTERVAL '30 days'
  AND status != 'cancelled'
  AND payment_status IN ('completed', 'succeeded', 'paid');

-- Check current points transactions
SELECT 'CURRENT TRANSACTIONS' as check_type, COUNT(*) as count,
       SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END) as earned,
       SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END) as redeemed
FROM points_transactions
WHERE supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a';

-- Check current points balance
SELECT 'CURRENT BALANCE' as check_type, points, total_earned, total_redeemed
FROM user_points
WHERE supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a';

-- Check user record existence
SELECT 'USER RECORD' as check_type, COUNT(*) as exists
FROM users
WHERE supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a';

-- =============================================================================
-- STEP 2: IDENTIFY MISSING POINTS TRANSACTIONS
-- =============================================================================

-- Show orders that are missing points transactions
SELECT
    o.id as order_id,
    o.total,
    o.status,
    o.payment_status,
    o.created_at,
    FLOOR(o.total::numeric) as should_award_points,
    pt.id as transaction_id,
    CASE
        WHEN pt.id IS NULL THEN 'MISSING TRANSACTION'
        ELSE 'HAS TRANSACTION'
    END as status
FROM orders o
LEFT JOIN points_transactions pt ON (
    o.id = pt.order_id
    AND pt.supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a'
)
WHERE (o.phone = '8039774285' OR o.supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a')
  AND o.status != 'cancelled'
  AND o.payment_status IN ('completed', 'succeeded', 'paid')
ORDER BY o.created_at DESC;

-- =============================================================================
-- STEP 3: CREATE MISSING USER RECORD (IF NEEDED)
-- =============================================================================

-- Ensure user record exists for this Supabase user
INSERT INTO users (
    supabase_user_id,
    username,
    email,
    role,
    phone,
    first_name,
    last_name,
    password,
    created_at,
    updated_at
)
VALUES (
    'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a',
    'customer_user',
    'customer@example.com',
    'customer',
    '8039774285',
    'Customer',
    'User',
    'SUPABASE_USER',
    NOW(),
    NOW()
)
ON CONFLICT (supabase_user_id) DO UPDATE SET
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), users.phone),
    updated_at = NOW();

-- =============================================================================
-- STEP 4: AWARD MISSING POINTS TRANSACTIONS
-- =============================================================================

-- Create points transactions for orders that don't have them
WITH missing_points AS (
    SELECT
        o.id as order_id,
        o.total,
        FLOOR(o.total::numeric) as points_to_award,
        o.created_at as order_date
    FROM orders o
    LEFT JOIN points_transactions pt ON (
        o.id = pt.order_id
        AND pt.supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a'
    )
    WHERE (o.phone = '8039774285' OR o.supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a')
      AND o.status != 'cancelled'
      AND o.payment_status IN ('completed', 'succeeded', 'paid')
      AND pt.id IS NULL  -- Only orders without existing transactions
)
INSERT INTO points_transactions (
    user_id,
    supabase_user_id,
    order_id,
    type,
    points,
    description,
    order_amount,
    created_at
)
SELECT
    NULL,  -- user_id is NULL for Supabase users
    'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a',
    order_id,
    'earned',
    points_to_award,
    'Recovered points for Order #' || order_id || ' (Manual Recovery)',
    total,
    order_date  -- Use original order date for proper chronology
FROM missing_points;

-- =============================================================================
-- STEP 5: UPDATE USER POINTS BALANCE
-- =============================================================================

-- Calculate correct totals from all transactions
WITH transaction_totals AS (
    SELECT
        SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END) as total_earned,
        SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END) as total_redeemed,
        SUM(CASE WHEN type = 'earned' THEN points ELSE -points END) as net_points,
        MAX(CASE WHEN type = 'earned' THEN created_at ELSE NULL END) as last_earned_at
    FROM points_transactions
    WHERE supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a'
)
INSERT INTO user_points (
    user_id,
    supabase_user_id,
    points,
    total_earned,
    total_redeemed,
    last_earned_at,
    created_at,
    updated_at
)
SELECT
    NULL,
    'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a',
    net_points,
    total_earned,
    total_redeemed,
    last_earned_at,
    NOW(),
    NOW()
FROM transaction_totals
ON CONFLICT (supabase_user_id) DO UPDATE SET
    points = EXCLUDED.points,
    total_earned = EXCLUDED.total_earned,
    total_redeemed = EXCLUDED.total_redeemed,
    last_earned_at = EXCLUDED.last_earned_at,
    updated_at = NOW();

-- =============================================================================
-- STEP 6: VERIFY RECOVERY RESULTS
-- =============================================================================

-- Check final state after recovery
SELECT 'RECOVERY RESULTS' as check_type;

-- Final order count and totals
SELECT 'ORDERS TOTAL' as metric, COUNT(*) as count, SUM(total::numeric) as total_spent, SUM(FLOOR(total::numeric)) as expected_points
FROM orders
WHERE phone = '8039774285'
  AND created_at >= NOW() - INTERVAL '30 days'
  AND status != 'cancelled'
  AND payment_status IN ('completed', 'succeeded', 'paid');

-- Final transaction count and totals
SELECT 'TRANSACTIONS TOTAL' as metric, COUNT(*) as count,
       SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END) as earned,
       SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END) as redeemed,
       SUM(CASE WHEN type = 'earned' THEN points ELSE -points END) as net_points
FROM points_transactions
WHERE supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a';

-- Final points balance
SELECT 'FINAL BALANCE' as metric, points, total_earned, total_redeemed, (total_earned - total_redeemed) as calculated_balance
FROM user_points
WHERE supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a';

-- Show all orders with their transaction status after recovery
SELECT
    o.id as order_id,
    o.total,
    o.created_at::date as order_date,
    FLOOR(o.total::numeric) as points_awarded,
    pt.id as transaction_id,
    pt.created_at::date as transaction_date,
    pt.description,
    CASE
        WHEN pt.id IS NULL THEN '❌ STILL MISSING'
        WHEN pt.description LIKE '%Manual Recovery%' THEN '✅ RECOVERED'
        ELSE '✅ ORIGINAL'
    END as recovery_status
FROM orders o
LEFT JOIN points_transactions pt ON (
    o.id = pt.order_id
    AND pt.supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a'
)
WHERE (o.phone = '8039774285' OR o.supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a')
  AND o.status != 'cancelled'
  AND o.payment_status IN ('completed', 'succeeded', 'paid')
ORDER BY o.created_at DESC;

-- =============================================================================
-- STEP 7: CREATE AUDIT LOG ENTRY
-- =============================================================================

-- Log this recovery operation for audit purposes
INSERT INTO points_transactions (
    user_id,
    supabase_user_id,
    order_id,
    type,
    points,
    description,
    order_amount,
    created_at
)
VALUES (
    NULL,
    'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a',
    NULL,  -- No specific order for audit entry
    'audit',
    0,  -- No points change for audit entry
    'MANUAL RECOVERY OPERATION - Fixed missing points transactions for phone 8039774285. Root cause: Silent failures in atomic transaction error handling.',
    0,
    NOW()
);

-- =============================================================================
-- SUMMARY
-- =============================================================================

-- Expected outcome:
-- - User should have ~1,090+ points (based on $1,108 spent at 1 point per $1)
-- - All orders should have corresponding points transactions
-- - user_points table should reflect correct totals
-- - Future orders should not have this issue (requires code fixes in orders.ts)

SELECT 'RECOVERY COMPLETE' as status,
       'User should now have correct points balance' as message,
       'Next step: Deploy code fixes to prevent future occurrences' as next_action;