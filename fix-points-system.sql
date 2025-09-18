-- POINTS SYSTEM DATA FIXES
-- Addresses discrepancies between points transactions and user balances
-- Specifically handles Google users (supabase_user_id) missing user_points records

-- =========================================
-- 1. CREATE MISSING USER_POINTS RECORDS
-- =========================================

-- First, let's identify users who have points transactions but no user_points record
WITH users_needing_points_records AS (
    SELECT DISTINCT
        pt.user_id,
        u.email,
        u.supabase_user_id,
        u.uuid_id,

        -- Calculate aggregated values from transactions
        SUM(CASE WHEN pt.points > 0 THEN pt.points ELSE 0 END) as total_earned,
        SUM(CASE WHEN pt.points < 0 THEN ABS(pt.points) ELSE 0 END) as total_redeemed,
        SUM(pt.points) as current_balance,
        MAX(CASE WHEN pt.points > 0 THEN pt.created_at END) as last_earned_at,
        MIN(pt.created_at) as first_transaction_at

    FROM points_transactions pt
    JOIN users u ON pt.user_id = u.id
    LEFT JOIN user_points up ON pt.user_id = up.user_id
    WHERE up.user_id IS NULL  -- Users without user_points records
    GROUP BY pt.user_id, u.email, u.supabase_user_id, u.uuid_id
)
-- Insert missing user_points records
INSERT INTO user_points (
    user_id,
    points,
    total_earned,
    total_redeemed,
    last_earned_at,
    created_at,
    updated_at
)
SELECT
    user_id,
    current_balance,
    total_earned,
    total_redeemed,
    last_earned_at,
    first_transaction_at,
    NOW()
FROM users_needing_points_records
ON CONFLICT (user_id) DO UPDATE SET
    points = EXCLUDED.points,
    total_earned = EXCLUDED.total_earned,
    total_redeemed = EXCLUDED.total_redeemed,
    last_earned_at = EXCLUDED.last_earned_at,
    updated_at = NOW();

-- =========================================
-- 2. SYNC EXISTING USER_POINTS WITH TRANSACTIONS
-- =========================================

-- Update existing user_points records to match transaction totals
WITH transaction_totals AS (
    SELECT
        pt.user_id,
        SUM(CASE WHEN pt.points > 0 THEN pt.points ELSE 0 END) as earned_total,
        SUM(CASE WHEN pt.points < 0 THEN ABS(pt.points) ELSE 0 END) as redeemed_total,
        SUM(pt.points) as current_total,
        MAX(CASE WHEN pt.points > 0 THEN pt.created_at END) as last_earned_at
    FROM points_transactions pt
    GROUP BY pt.user_id
)
UPDATE user_points up
SET
    points = tt.current_total,
    total_earned = tt.earned_total,
    total_redeemed = tt.redeemed_total,
    last_earned_at = COALESCE(tt.last_earned_at, up.last_earned_at),
    updated_at = NOW()
FROM transaction_totals tt
WHERE up.user_id = tt.user_id
    AND (
        up.points != tt.current_total
        OR up.total_earned != tt.earned_total
        OR up.total_redeemed != tt.redeemed_total
    );

-- =========================================
-- 3. IDENTIFY RECENT ORDERS MISSING POINTS
-- =========================================

-- Find recent completed orders that should have points but don't
SELECT
    'Orders Missing Points' as issue_type,
    o.id as order_id,
    o.user_id,
    o.supabase_user_id,
    o.user_uuid,
    o.phone,
    o.total,
    o.created_at,

    -- Expected points (1 point per dollar)
    FLOOR(o.total) as expected_points,

    -- Check if transaction exists
    pt.id as existing_transaction,
    pt.points as existing_points,

    -- User identification
    u.email,
    CASE
        WHEN u.supabase_user_id IS NOT NULL THEN 'Google User'
        ELSE 'Legacy User'
    END as user_type

FROM orders o
JOIN users u ON (
    o.user_id = u.id
    OR u.supabase_user_id = o.supabase_user_id
    OR u.uuid_id = o.user_uuid
)
LEFT JOIN points_transactions pt ON (
    o.id = pt.order_id
    AND pt.user_id = u.id
    AND pt.type = 'earned'
)
WHERE o.created_at >= NOW() - INTERVAL '7 days'
    AND o.status IN ('completed', 'delivered')
    AND o.total >= 10  -- Minimum order for points
    AND pt.id IS NULL  -- No existing points transaction
ORDER BY o.created_at DESC;

-- =========================================
-- 4. CREATE MISSING POINTS TRANSACTIONS
-- =========================================

-- Insert missing points transactions for recent completed orders
-- This should be run carefully, potentially with additional filters
INSERT INTO points_transactions (
    user_id,
    order_id,
    type,
    points,
    description,
    order_amount,
    created_at
)
SELECT
    u.id as user_id,
    o.id as order_id,
    'earned' as type,
    FLOOR(o.total) as points,
    CONCAT('Points earned from order #', o.id, ' - $', o.total) as description,
    o.total as order_amount,
    o.created_at
FROM orders o
JOIN users u ON (
    o.user_id = u.id
    OR u.supabase_user_id = o.supabase_user_id
    OR u.uuid_id = o.user_uuid
)
LEFT JOIN points_transactions pt ON (
    o.id = pt.order_id
    AND pt.user_id = u.id
    AND pt.type = 'earned'
)
WHERE o.created_at >= NOW() - INTERVAL '7 days'
    AND o.status IN ('completed', 'delivered')
    AND o.total >= 10  -- Minimum order for points
    AND pt.id IS NULL  -- No existing transaction
    AND FLOOR(o.total) > 0  -- Valid points amount
ON CONFLICT DO NOTHING;

-- =========================================
-- 5. VERIFICATION QUERIES
-- =========================================

-- Verify the fixes worked
SELECT
    'Fix Verification' as check_type,
    COUNT(*) as total_users_with_points,
    SUM(up.points) as total_current_points,
    COUNT(CASE WHEN u.supabase_user_id IS NOT NULL THEN 1 END) as google_users_with_points,
    COUNT(CASE WHEN u.supabase_user_id IS NULL THEN 1 END) as legacy_users_with_points
FROM user_points up
JOIN users u ON up.user_id = u.id;

-- Check for remaining discrepancies
SELECT
    'Remaining Issues' as check_type,
    COUNT(*) as users_with_discrepancies
FROM (
    SELECT
        up.user_id,
        up.points as stored_points,
        COALESCE(SUM(pt.points), 0) as calculated_points
    FROM user_points up
    LEFT JOIN points_transactions pt ON up.user_id = pt.user_id
    GROUP BY up.user_id, up.points
    HAVING up.points != COALESCE(SUM(pt.points), 0)
) discrepancies;

-- Show recent successful transactions
SELECT
    'Recent Transactions After Fix' as info_type,
    u.email,
    CASE WHEN u.supabase_user_id IS NOT NULL THEN 'Google' ELSE 'Legacy' END as user_type,
    pt.type,
    pt.points,
    pt.description,
    pt.created_at
FROM points_transactions pt
JOIN users u ON pt.user_id = u.id
WHERE pt.created_at >= NOW() - INTERVAL '1 day'
ORDER BY pt.created_at DESC
LIMIT 20;