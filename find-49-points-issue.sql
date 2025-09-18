-- FIND THE SPECIFIC 49 POINTS ISSUE
-- Locate the user who earned 49 points but can't see them on rewards page

-- =========================================
-- 1. FIND RECENT 49 POINT TRANSACTIONS
-- =========================================

-- Look for recent transactions with exactly 49 points
SELECT
    'Recent 49 Point Transactions' as search_type,
    pt.id as transaction_id,
    pt.user_id,
    pt.order_id,
    pt.points,
    pt.description,
    pt.created_at as transaction_date,

    -- User information
    u.email,
    u.phone,
    u.supabase_user_id,
    u.uuid_id,
    CASE WHEN u.supabase_user_id IS NOT NULL THEN 'Google User' ELSE 'Legacy User' END as user_type,

    -- Order information
    o.total as order_total,
    o.status as order_status,
    o.created_at as order_date,

    -- Check user_points record
    up.points as current_balance,
    up.total_earned,
    up.last_earned_at,
    CASE WHEN up.user_id IS NULL THEN 'NO USER_POINTS RECORD' ELSE 'HAS USER_POINTS' END as balance_record_status

FROM points_transactions pt
JOIN users u ON pt.user_id = u.id
LEFT JOIN orders o ON pt.order_id = o.id
LEFT JOIN user_points up ON pt.user_id = up.user_id
WHERE pt.points = 49
    AND pt.type = 'earned'
    AND pt.created_at >= NOW() - INTERVAL '14 days'
ORDER BY pt.created_at DESC;

-- =========================================
-- 2. FIND ORDERS TOTALING ~$49
-- =========================================

-- Look for recent orders with totals around $49 that should have earned 49 points
SELECT
    'Orders Around $49' as search_type,
    o.id as order_id,
    o.user_id,
    o.supabase_user_id,
    o.user_uuid,
    o.phone,
    o.total,
    o.status,
    o.created_at as order_date,

    -- Expected points
    FLOOR(o.total) as expected_points,

    -- User information
    u.email,
    CASE WHEN u.supabase_user_id IS NOT NULL THEN 'Google User' ELSE 'Legacy User' END as user_type,

    -- Check if points transaction exists
    pt.id as transaction_id,
    pt.points as actual_points,
    pt.created_at as points_date,

    -- Check user balance
    up.points as current_balance,
    CASE WHEN up.user_id IS NULL THEN 'NO USER_POINTS RECORD' ELSE 'HAS USER_POINTS' END as balance_status

FROM orders o
LEFT JOIN users u ON (
    o.user_id = u.id
    OR u.supabase_user_id = o.supabase_user_id
    OR u.uuid_id = o.user_uuid
)
LEFT JOIN points_transactions pt ON (
    o.id = pt.order_id
    AND pt.type = 'earned'
    AND u.id = pt.user_id
)
LEFT JOIN user_points up ON u.id = up.user_id
WHERE o.total BETWEEN 48.50 AND 49.99  -- Orders that would earn ~49 points
    AND o.created_at >= NOW() - INTERVAL '14 days'
    AND o.status IN ('completed', 'delivered')
ORDER BY o.created_at DESC;

-- =========================================
-- 3. CHECK FOR GOOGLE USERS WITH MISSING POINTS
-- =========================================

-- Focus specifically on Google users who might have points transactions but no visible balance
SELECT
    'Google Users with Points Issues' as search_type,
    u.id as user_id,
    u.email,
    u.phone,
    u.supabase_user_id,
    u.uuid_id,
    u.created_at as user_registered,

    -- Transaction summary
    COUNT(pt.id) as transaction_count,
    SUM(CASE WHEN pt.points > 0 THEN pt.points ELSE 0 END) as total_earned_from_transactions,
    MAX(pt.created_at) as last_transaction_date,
    STRING_AGG(pt.points::text || ' pts (' || pt.description || ')', ', ' ORDER BY pt.created_at DESC) as recent_transactions,

    -- Balance record status
    up.points as stored_balance,
    up.total_earned as stored_total_earned,
    up.last_earned_at as stored_last_earned,
    CASE WHEN up.user_id IS NULL THEN 'MISSING USER_POINTS RECORD' ELSE 'HAS USER_POINTS RECORD' END as balance_status,

    -- Discrepancy check
    CASE
        WHEN up.user_id IS NULL THEN 'MISSING_RECORD'
        WHEN up.points != COALESCE(SUM(pt.points), 0) THEN 'BALANCE_MISMATCH'
        WHEN COUNT(pt.id) > 0 AND up.points = 0 THEN 'ZERO_BALANCE_WITH_TRANSACTIONS'
        ELSE 'OK'
    END as issue_type

FROM users u
LEFT JOIN points_transactions pt ON u.id = pt.user_id
LEFT JOIN user_points up ON u.id = up.user_id
WHERE u.supabase_user_id IS NOT NULL  -- Google users only
    AND u.created_at >= NOW() - INTERVAL '30 days'  -- Recent users
GROUP BY u.id, u.email, u.phone, u.supabase_user_id, u.uuid_id, u.created_at,
         up.points, up.total_earned, up.last_earned_at, up.user_id
HAVING COUNT(pt.id) > 0  -- Has transactions
    OR up.user_id IS NULL  -- Or missing balance record
ORDER BY total_earned_from_transactions DESC, last_transaction_date DESC;

-- =========================================
-- 4. DETAILED LOOKUP BY PHONE NUMBER
-- =========================================

-- If you have the phone number of the affected user, use this query
-- Replace 'USER_PHONE_HERE' with the actual phone number
/*
SELECT
    'User Lookup by Phone' as search_type,
    u.id as user_id,
    u.email,
    u.phone,
    u.supabase_user_id,
    u.uuid_id,
    CASE WHEN u.supabase_user_id IS NOT NULL THEN 'Google User' ELSE 'Legacy User' END as user_type,

    -- Recent orders
    o.id as order_id,
    o.total,
    o.status,
    o.created_at as order_date,

    -- Points transactions
    pt.id as transaction_id,
    pt.points,
    pt.description,
    pt.created_at as points_date,

    -- Current balance
    up.points as current_balance,
    up.total_earned,
    up.total_redeemed

FROM users u
LEFT JOIN orders o ON (
    u.id = o.user_id
    OR u.supabase_user_id = o.supabase_user_id
    OR u.uuid_id = o.user_uuid
)
LEFT JOIN points_transactions pt ON (
    o.id = pt.order_id
    AND pt.user_id = u.id
)
LEFT JOIN user_points up ON u.id = up.user_id
WHERE u.phone = 'USER_PHONE_HERE'
    OR o.phone = 'USER_PHONE_HERE'
ORDER BY o.created_at DESC, pt.created_at DESC;
*/

-- =========================================
-- 5. SUMMARY OF ISSUES TO INVESTIGATE
-- =========================================

-- Get a quick overview of common issues
SELECT
    issue_category,
    COUNT(*) as count,
    STRING_AGG(DISTINCT user_info, '; ') as examples
FROM (
    -- Users with transactions but no balance record
    SELECT
        'Missing user_points record' as issue_category,
        u.email || ' (ID: ' || u.id || ')' as user_info
    FROM users u
    JOIN points_transactions pt ON u.id = pt.user_id
    LEFT JOIN user_points up ON u.id = up.user_id
    WHERE up.user_id IS NULL
    GROUP BY u.id, u.email

    UNION ALL

    -- Users with balance mismatches
    SELECT
        'Balance calculation mismatch' as issue_category,
        u.email || ' (Stored: ' || up.points || ', Calculated: ' || COALESCE(SUM(pt.points), 0) || ')' as user_info
    FROM user_points up
    JOIN users u ON up.user_id = u.id
    LEFT JOIN points_transactions pt ON up.user_id = pt.user_id
    GROUP BY up.user_id, up.points, u.email
    HAVING up.points != COALESCE(SUM(pt.points), 0)

    UNION ALL

    -- Recent completed orders without points
    SELECT
        'Recent orders missing points' as issue_category,
        'Order #' || o.id || ' ($' || o.total || ') - ' || COALESCE(u.email, o.phone) as user_info
    FROM orders o
    LEFT JOIN users u ON (
        o.user_id = u.id
        OR u.supabase_user_id = o.supabase_user_id
        OR u.uuid_id = o.user_uuid
    )
    LEFT JOIN points_transactions pt ON (
        o.id = pt.order_id
        AND pt.type = 'earned'
        AND (pt.user_id = u.id OR pt.user_id = o.user_id)
    )
    WHERE o.created_at >= NOW() - INTERVAL '7 days'
        AND o.status IN ('completed', 'delivered')
        AND o.total >= 10
        AND pt.id IS NULL
) issues
GROUP BY issue_category
ORDER BY count DESC;