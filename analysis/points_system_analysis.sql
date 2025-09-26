-- COMPREHENSIVE PIZZA REWARDS POINTS SYSTEM ANALYSIS
-- Critical Issue: User should have 1,090+ points from $1,108 in orders but only shows 22 points
-- User: phone 8039774285, supabase_user_id: bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a

-- =============================================================================
-- 1. ORDERS DATA ANALYSIS - Last 30 Days for Phone 8039774285
-- =============================================================================

-- 1.1 All orders for the specific phone number in last 30 days
SELECT
    id as order_id,
    user_id,
    supabase_user_id,
    status,
    payment_status,
    total,
    tax,
    delivery_fee,
    tip,
    order_type,
    phone,
    created_at,
    (total::numeric) as order_total_numeric,
    FLOOR(total::numeric) as expected_points
FROM orders
WHERE phone = '8039774285'
    AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- 1.2 Summary of orders by user association
SELECT
    CASE
        WHEN user_id IS NOT NULL THEN 'Legacy User ID: ' || user_id::text
        WHEN supabase_user_id IS NOT NULL THEN 'Supabase User ID: ' || supabase_user_id
        ELSE 'No User Association'
    END as user_association,
    COUNT(*) as order_count,
    SUM(total::numeric) as total_spent,
    SUM(FLOOR(total::numeric)) as expected_total_points,
    MIN(created_at) as first_order,
    MAX(created_at) as last_order
FROM orders
WHERE phone = '8039774285'
    AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id, supabase_user_id
ORDER BY total_spent DESC;

-- =============================================================================
-- 2. POINTS TRANSACTIONS ANALYSIS for User bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a
-- =============================================================================

-- 2.1 All points transactions for the specific Supabase user
SELECT
    id,
    user_id,
    supabase_user_id,
    order_id,
    type,
    points,
    description,
    order_amount,
    created_at,
    -- Cross-reference with orders table
    CASE
        WHEN order_id IS NOT NULL THEN (
            SELECT phone FROM orders WHERE id = order_id
        )
        ELSE 'No Order Reference'
    END as order_phone
FROM points_transactions
WHERE supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a'
ORDER BY created_at DESC;

-- 2.2 Points transactions that SHOULD exist but might be missing
SELECT
    o.id as order_id,
    o.total,
    o.phone,
    o.supabase_user_id,
    o.created_at as order_date,
    FLOOR(o.total::numeric) as should_award_points,
    pt.id as transaction_id,
    pt.points as actual_points_awarded,
    CASE
        WHEN pt.id IS NULL THEN 'MISSING TRANSACTION'
        WHEN pt.points != FLOOR(o.total::numeric) THEN 'POINT MISMATCH'
        ELSE 'OK'
    END as status
FROM orders o
LEFT JOIN points_transactions pt ON (
    o.id = pt.order_id
    AND pt.supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a'
)
WHERE o.supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a'
    OR o.phone = '8039774285'
ORDER BY o.created_at DESC;

-- =============================================================================
-- 3. USER POINTS BALANCE ANALYSIS
-- =============================================================================

-- 3.1 Current points balance for the user
SELECT
    id,
    user_id,
    supabase_user_id,
    points as current_points,
    total_earned,
    total_redeemed,
    last_earned_at,
    created_at,
    updated_at,
    (total_earned - total_redeemed) as calculated_balance
FROM user_points
WHERE supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a';

-- 3.2 Calculate what the points SHOULD be based on transactions
SELECT
    'EXPECTED' as source,
    COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0) as total_earned,
    COALESCE(SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END), 0) as total_redeemed,
    COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE -points END), 0) as net_points
FROM points_transactions
WHERE supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a'

UNION ALL

SELECT
    'ACTUAL' as source,
    total_earned,
    total_redeemed,
    points as net_points
FROM user_points
WHERE supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a';

-- =============================================================================
-- 4. DATABASE INTEGRITY CHECKS
-- =============================================================================

-- 4.1 Check for orders without corresponding points transactions
SELECT
    'Orders Missing Points Transactions' as issue_type,
    COUNT(*) as count
FROM orders o
WHERE (o.supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a' OR o.phone = '8039774285')
    AND o.status != 'cancelled'
    AND o.payment_status IN ('completed', 'succeeded', 'paid')
    AND NOT EXISTS (
        SELECT 1 FROM points_transactions pt
        WHERE pt.order_id = o.id
            AND (pt.supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a' OR pt.user_id IS NOT NULL)
    );

-- 4.2 Check for points transactions without corresponding orders
SELECT
    'Points Transactions Without Orders' as issue_type,
    COUNT(*) as count
FROM points_transactions pt
WHERE pt.supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a'
    AND pt.order_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM orders o WHERE o.id = pt.order_id
    );

-- 4.3 Check for user_id vs supabase_user_id consistency issues
SELECT
    'User ID Consistency Issues' as issue_type,
    COUNT(*) as count
FROM orders o1
WHERE (o1.phone = '8039774285')
    AND EXISTS (
        SELECT 1 FROM orders o2
        WHERE o2.phone = '8039774285'
            AND o2.id != o1.id
            AND (
                (o1.user_id IS NOT NULL AND o2.supabase_user_id IS NOT NULL) OR
                (o1.supabase_user_id IS NOT NULL AND o2.user_id IS NOT NULL)
            )
    );

-- =============================================================================
-- 5. DETAILED TRANSACTION HISTORY WITH ORDER CORRELATION
-- =============================================================================

-- 5.1 Complete transaction history with order details
SELECT
    pt.id as transaction_id,
    pt.type,
    pt.points,
    pt.description,
    pt.order_amount,
    pt.created_at as transaction_date,
    o.id as order_id,
    o.total as order_total,
    o.phone as order_phone,
    o.status as order_status,
    o.payment_status,
    o.created_at as order_date,
    CASE
        WHEN pt.order_id IS NULL THEN 'Non-Order Transaction'
        WHEN o.id IS NULL THEN 'MISSING ORDER'
        WHEN ABS(pt.points - FLOOR(o.total::numeric)) > 0 THEN 'POINTS MISMATCH'
        ELSE 'OK'
    END as validation_status
FROM points_transactions pt
LEFT JOIN orders o ON pt.order_id = o.id
WHERE pt.supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a'
ORDER BY pt.created_at DESC;

-- =============================================================================
-- 6. PHONE NUMBER CROSS-REFERENCE ANALYSIS
-- =============================================================================

-- 6.1 All users associated with phone 8039774285
SELECT
    'Users Table' as source,
    id as user_id,
    supabase_user_id,
    username,
    email,
    first_name,
    last_name,
    phone,
    role,
    created_at
FROM users
WHERE phone = '8039774285'

UNION ALL

SELECT
    'Orders Table' as source,
    user_id,
    supabase_user_id,
    'N/A' as username,
    'N/A' as email,
    'N/A' as first_name,
    'N/A' as last_name,
    phone,
    'N/A' as role,
    MIN(created_at) as created_at
FROM orders
WHERE phone = '8039774285'
GROUP BY user_id, supabase_user_id, phone;

-- =============================================================================
-- 7. SUMMARY CALCULATION - WHAT SHOULD THE POINTS BE?
-- =============================================================================

-- 7.1 Expected points calculation
WITH order_summary AS (
    SELECT
        SUM(FLOOR(total::numeric)) as total_expected_points,
        COUNT(*) as total_orders,
        SUM(total::numeric) as total_spent
    FROM orders
    WHERE (supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a' OR phone = '8039774285')
        AND status != 'cancelled'
        AND payment_status IN ('completed', 'succeeded', 'paid')
),
actual_points AS (
    SELECT
        points as current_points,
        total_earned,
        total_redeemed
    FROM user_points
    WHERE supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a'
),
transaction_summary AS (
    SELECT
        SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END) as earned_from_transactions,
        SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END) as redeemed_from_transactions
    FROM points_transactions
    WHERE supabase_user_id = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a'
)
SELECT
    'EXPECTED POINTS' as metric,
    os.total_expected_points as value,
    'Based on order totals (1 point per $1)' as source
FROM order_summary os

UNION ALL

SELECT
    'ACTUAL POINTS (user_points table)' as metric,
    ap.current_points as value,
    'Current balance in user_points table' as source
FROM actual_points ap

UNION ALL

SELECT
    'POINTS EARNED (transactions)' as metric,
    ts.earned_from_transactions as value,
    'Sum of earned transactions' as source
FROM transaction_summary ts

UNION ALL

SELECT
    'POINTS REDEEMED (transactions)' as metric,
    ts.redeemed_from_transactions as value,
    'Sum of redeemed transactions' as source
FROM transaction_summary ts

UNION ALL

SELECT
    'NET POINTS (transactions)' as metric,
    (ts.earned_from_transactions - COALESCE(ts.redeemed_from_transactions, 0)) as value,
    'Earned minus redeemed from transactions' as source
FROM transaction_summary ts

UNION ALL

SELECT
    'DISCREPANCY' as metric,
    (os.total_expected_points - COALESCE(ap.current_points, 0)) as value,
    'Expected minus actual points' as source
FROM order_summary os, actual_points ap;