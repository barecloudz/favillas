-- POINTS SYSTEM DIAGNOSTIC QUERIES
-- Identifies discrepancies between points transactions and user balances
-- Focus on Google users (supabase_user_id) vs legacy users (user_id)

-- =========================================
-- 1. RECENT ORDERS AND POINTS TRANSACTIONS
-- =========================================

-- Find recent orders with their associated points transactions
SELECT
    o.id as order_id,
    o.user_id as legacy_user_id,
    o.supabase_user_id,
    o.user_uuid,
    o.phone,
    o.total,
    o.created_at as order_date,
    o.status as order_status,

    -- Points transaction info
    pt.id as transaction_id,
    pt.user_id as transaction_user_id,
    pt.type as points_type,
    pt.points as points_awarded,
    pt.description as points_description,
    pt.created_at as points_date

FROM orders o
LEFT JOIN points_transactions pt ON (
    o.id = pt.order_id
    AND (
        pt.user_id = o.user_id
        OR pt.user_id = (
            SELECT id FROM users
            WHERE supabase_user_id = o.supabase_user_id
            OR uuid_id = o.user_uuid
        )
    )
)
WHERE o.created_at >= NOW() - INTERVAL '7 days'
    AND o.status IN ('completed', 'delivered')
ORDER BY o.created_at DESC, o.id DESC;

-- =========================================
-- 2. POINTS TRANSACTION SUMMARY BY USER TYPE
-- =========================================

-- Compare points transactions between legacy and Google users
SELECT
    'Transaction Summary' as analysis_type,
    COUNT(*) as total_transactions,
    SUM(CASE WHEN pt.points > 0 THEN pt.points ELSE 0 END) as total_points_awarded,
    SUM(CASE WHEN pt.points < 0 THEN ABS(pt.points) ELSE 0 END) as total_points_redeemed,

    -- User type classification
    COUNT(CASE WHEN u.supabase_user_id IS NOT NULL THEN 1 END) as google_user_transactions,
    COUNT(CASE WHEN u.supabase_user_id IS NULL THEN 1 END) as legacy_user_transactions,

    -- Points by user type
    SUM(CASE WHEN u.supabase_user_id IS NOT NULL AND pt.points > 0 THEN pt.points ELSE 0 END) as google_points_awarded,
    SUM(CASE WHEN u.supabase_user_id IS NULL AND pt.points > 0 THEN pt.points ELSE 0 END) as legacy_points_awarded

FROM points_transactions pt
JOIN users u ON pt.user_id = u.id
WHERE pt.created_at >= NOW() - INTERVAL '30 days';

-- =========================================
-- 3. USER POINTS BALANCE SUMMARY
-- =========================================

-- Check user_points table balances by user type
SELECT
    'User Balance Summary' as analysis_type,
    COUNT(*) as total_user_records,
    SUM(up.points) as total_current_points,
    SUM(up.total_earned) as total_lifetime_earned,
    SUM(up.total_redeemed) as total_lifetime_redeemed,

    -- User type classification
    COUNT(CASE WHEN u.supabase_user_id IS NOT NULL THEN 1 END) as google_user_records,
    COUNT(CASE WHEN u.supabase_user_id IS NULL THEN 1 END) as legacy_user_records,

    -- Points by user type
    SUM(CASE WHEN u.supabase_user_id IS NOT NULL THEN up.points ELSE 0 END) as google_current_points,
    SUM(CASE WHEN u.supabase_user_id IS NULL THEN up.points ELSE 0 END) as legacy_current_points

FROM user_points up
JOIN users u ON up.user_id = u.id;

-- =========================================
-- 4. IDENTIFY ORPHANED TRANSACTIONS
-- =========================================

-- Find points transactions without corresponding user_points records
SELECT
    'Orphaned Transactions' as issue_type,
    pt.id as transaction_id,
    pt.user_id,
    u.email,
    u.supabase_user_id,
    u.uuid_id,
    pt.type,
    pt.points,
    pt.description,
    pt.order_id,
    pt.created_at,

    -- Check if user_points record exists
    CASE WHEN up.user_id IS NULL THEN 'NO USER_POINTS RECORD' ELSE 'HAS USER_POINTS' END as user_points_status

FROM points_transactions pt
JOIN users u ON pt.user_id = u.id
LEFT JOIN user_points up ON pt.user_id = up.user_id
WHERE pt.created_at >= NOW() - INTERVAL '7 days'
    AND pt.type = 'earned'
    AND pt.points > 0
ORDER BY pt.created_at DESC;

-- =========================================
-- 5. IDENTIFY GOOGLE USERS WITH MISSING USER_POINTS
-- =========================================

-- Find Google users who have points transactions but no user_points record
SELECT
    'Google Users Missing Points Records' as issue_type,
    u.id as user_id,
    u.email,
    u.supabase_user_id,
    u.uuid_id,
    u.created_at as user_created,

    -- Transaction summary
    COUNT(pt.id) as transaction_count,
    SUM(CASE WHEN pt.points > 0 THEN pt.points ELSE 0 END) as total_earned,
    SUM(CASE WHEN pt.points < 0 THEN ABS(pt.points) ELSE 0 END) as total_redeemed,
    MAX(pt.created_at) as last_transaction_date,

    -- User points record status
    CASE WHEN up.user_id IS NULL THEN 'MISSING' ELSE 'EXISTS' END as user_points_record

FROM users u
LEFT JOIN points_transactions pt ON u.id = pt.user_id
LEFT JOIN user_points up ON u.id = up.user_id
WHERE u.supabase_user_id IS NOT NULL  -- Google users only
    AND pt.id IS NOT NULL  -- Has transactions
GROUP BY u.id, u.email, u.supabase_user_id, u.uuid_id, u.created_at, up.user_id
HAVING COUNT(pt.id) > 0  -- Has at least one transaction
ORDER BY total_earned DESC;

-- =========================================
-- 6. VALIDATE POINTS CALCULATION ACCURACY
-- =========================================

-- Compare calculated points vs stored points for users with both records
SELECT
    'Points Calculation Validation' as analysis_type,
    u.id as user_id,
    u.email,
    u.supabase_user_id,

    -- From user_points table
    up.points as stored_current_points,
    up.total_earned as stored_total_earned,
    up.total_redeemed as stored_total_redeemed,

    -- Calculated from transactions
    COALESCE(SUM(CASE WHEN pt.points > 0 THEN pt.points ELSE 0 END), 0) as calculated_total_earned,
    COALESCE(SUM(CASE WHEN pt.points < 0 THEN ABS(pt.points) ELSE 0 END), 0) as calculated_total_redeemed,
    COALESCE(SUM(pt.points), 0) as calculated_current_points,

    -- Discrepancy flags
    CASE
        WHEN up.points != COALESCE(SUM(pt.points), 0) THEN 'CURRENT_MISMATCH'
        WHEN up.total_earned != COALESCE(SUM(CASE WHEN pt.points > 0 THEN pt.points ELSE 0 END), 0) THEN 'EARNED_MISMATCH'
        WHEN up.total_redeemed != COALESCE(SUM(CASE WHEN pt.points < 0 THEN ABS(pt.points) ELSE 0 END), 0) THEN 'REDEEMED_MISMATCH'
        ELSE 'ACCURATE'
    END as validation_status

FROM user_points up
JOIN users u ON up.user_id = u.id
LEFT JOIN points_transactions pt ON u.id = pt.user_id
GROUP BY u.id, u.email, u.supabase_user_id, up.points, up.total_earned, up.total_redeemed
HAVING COUNT(pt.id) > 0  -- Only users with transactions
ORDER BY validation_status DESC, calculated_total_earned DESC;

-- =========================================
-- 7. RECENT HIGH-VALUE TRANSACTIONS
-- =========================================

-- Find recent orders that should have awarded significant points
SELECT
    'High Value Recent Orders' as analysis_type,
    o.id as order_id,
    o.user_id as legacy_user_id,
    o.supabase_user_id,
    o.phone,
    o.total,
    o.created_at as order_date,

    -- Expected points (assuming 1 point per dollar)
    FLOOR(o.total) as expected_points,

    -- Actual points transaction
    pt.id as transaction_id,
    pt.points as actual_points,
    pt.description,

    -- Status
    CASE
        WHEN pt.id IS NULL THEN 'NO_TRANSACTION'
        WHEN pt.points != FLOOR(o.total) THEN 'POINT_MISMATCH'
        ELSE 'CORRECT'
    END as points_status

FROM orders o
LEFT JOIN points_transactions pt ON o.id = pt.order_id
WHERE o.created_at >= NOW() - INTERVAL '3 days'
    AND o.status IN ('completed', 'delivered')
    AND o.total >= 25  -- High value orders
ORDER BY o.total DESC, o.created_at DESC;