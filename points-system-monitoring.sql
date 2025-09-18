-- POINTS SYSTEM MONITORING AND PREVENTION
-- Comprehensive queries to monitor points system health and prevent future issues

-- =========================================
-- 1. DAILY HEALTH CHECK FUNCTION
-- =========================================

-- Function to check points system health (run daily)
CREATE OR REPLACE FUNCTION check_points_system_health()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    count_value INTEGER,
    details TEXT
) AS $$
BEGIN
    -- Check 1: Users with transactions but no user_points record
    RETURN QUERY
    SELECT
        'Users missing user_points records'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ISSUE' END::TEXT,
        COUNT(*)::INTEGER,
        STRING_AGG(u.email, ', ')::TEXT
    FROM (
        SELECT DISTINCT pt.user_id
        FROM points_transactions pt
        LEFT JOIN user_points up ON pt.user_id = up.user_id
        WHERE up.user_id IS NULL
    ) missing_records
    JOIN users u ON missing_records.user_id = u.id;

    -- Check 2: Balance calculation mismatches
    RETURN QUERY
    SELECT
        'Balance calculation mismatches'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ISSUE' END::TEXT,
        COUNT(*)::INTEGER,
        STRING_AGG(email || ' (Stored: ' || stored_points || ', Calculated: ' || calculated_points || ')', ', ')::TEXT
    FROM (
        SELECT
            u.email,
            up.points as stored_points,
            COALESCE(SUM(pt.points), 0) as calculated_points
        FROM user_points up
        JOIN users u ON up.user_id = u.id
        LEFT JOIN points_transactions pt ON up.user_id = pt.user_id
        GROUP BY up.user_id, up.points, u.email
        HAVING up.points != COALESCE(SUM(pt.points), 0)
    ) mismatches;

    -- Check 3: Recent orders missing points transactions
    RETURN QUERY
    SELECT
        'Recent orders missing points'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ISSUE' END::TEXT,
        COUNT(*)::INTEGER,
        STRING_AGG('Order #' || o.id || ' ($' || o.total || ')', ', ')::TEXT
    FROM orders o
    LEFT JOIN users u ON (
        o.user_id = u.id
        OR u.supabase_user_id = o.supabase_user_id
        OR u.uuid_id = o.user_uuid
    )
    LEFT JOIN points_transactions pt ON (
        o.id = pt.order_id
        AND pt.type = 'earned'
        AND pt.user_id = u.id
    )
    WHERE o.created_at >= NOW() - INTERVAL '24 hours'
        AND o.status IN ('completed', 'delivered')
        AND o.total >= 10
        AND pt.id IS NULL;

    -- Check 4: Google users vs Legacy users balance
    RETURN QUERY
    SELECT
        'Google users with points'::TEXT,
        'INFO'::TEXT,
        COUNT(*)::INTEGER,
        'Google users: ' || COUNT(CASE WHEN u.supabase_user_id IS NOT NULL THEN 1 END) ||
        ', Legacy users: ' || COUNT(CASE WHEN u.supabase_user_id IS NULL THEN 1 END)
    FROM user_points up
    JOIN users u ON up.user_id = u.id;

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- 2. AUTO-FIX FUNCTION FOR MISSING USER_POINTS
-- =========================================

-- Function to automatically create missing user_points records
CREATE OR REPLACE FUNCTION auto_fix_missing_user_points()
RETURNS TABLE (
    user_id INTEGER,
    email TEXT,
    points_created INTEGER,
    total_earned INTEGER
) AS $$
BEGIN
    -- Insert missing user_points records based on transactions
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
        pt.user_id,
        SUM(pt.points) as current_balance,
        SUM(CASE WHEN pt.points > 0 THEN pt.points ELSE 0 END) as total_earned,
        SUM(CASE WHEN pt.points < 0 THEN ABS(pt.points) ELSE 0 END) as total_redeemed,
        MAX(CASE WHEN pt.points > 0 THEN pt.created_at END) as last_earned_at,
        MIN(pt.created_at) as created_at,
        NOW() as updated_at
    FROM points_transactions pt
    LEFT JOIN user_points up ON pt.user_id = up.user_id
    WHERE up.user_id IS NULL
    GROUP BY pt.user_id
    ON CONFLICT (user_id) DO NOTHING;

    -- Return summary of what was fixed
    RETURN QUERY
    SELECT
        u.id,
        u.email,
        up.points,
        up.total_earned
    FROM user_points up
    JOIN users u ON up.user_id = u.id
    WHERE up.updated_at >= NOW() - INTERVAL '1 minute';

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- 3. TRIGGER TO MAINTAIN USER_POINTS INTEGRITY
-- =========================================

-- Function to handle points transaction changes
CREATE OR REPLACE FUNCTION sync_user_points_on_transaction_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_points (
            user_id,
            points,
            total_earned,
            total_redeemed,
            last_earned_at,
            created_at,
            updated_at
        )
        VALUES (
            NEW.user_id,
            NEW.points,
            CASE WHEN NEW.points > 0 THEN NEW.points ELSE 0 END,
            CASE WHEN NEW.points < 0 THEN ABS(NEW.points) ELSE 0 END,
            CASE WHEN NEW.points > 0 THEN NEW.created_at ELSE NULL END,
            NEW.created_at,
            NEW.created_at
        )
        ON CONFLICT (user_id) DO UPDATE SET
            points = user_points.points + NEW.points,
            total_earned = user_points.total_earned + CASE WHEN NEW.points > 0 THEN NEW.points ELSE 0 END,
            total_redeemed = user_points.total_redeemed + CASE WHEN NEW.points < 0 THEN ABS(NEW.points) ELSE 0 END,
            last_earned_at = CASE WHEN NEW.points > 0 THEN NEW.created_at ELSE user_points.last_earned_at END,
            updated_at = NEW.created_at;

        RETURN NEW;
    END IF;

    -- Handle UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- Recalculate user_points based on all transactions for this user
        WITH calculated_totals AS (
            SELECT
                user_id,
                SUM(points) as current_total,
                SUM(CASE WHEN points > 0 THEN points ELSE 0 END) as earned_total,
                SUM(CASE WHEN points < 0 THEN ABS(points) ELSE 0 END) as redeemed_total,
                MAX(CASE WHEN points > 0 THEN created_at END) as last_earned_at
            FROM points_transactions
            WHERE user_id = NEW.user_id
            GROUP BY user_id
        )
        UPDATE user_points
        SET
            points = ct.current_total,
            total_earned = ct.earned_total,
            total_redeemed = ct.redeemed_total,
            last_earned_at = ct.last_earned_at,
            updated_at = NOW()
        FROM calculated_totals ct
        WHERE user_points.user_id = ct.user_id;

        RETURN NEW;
    END IF;

    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        -- Recalculate user_points based on remaining transactions
        WITH calculated_totals AS (
            SELECT
                user_id,
                SUM(points) as current_total,
                SUM(CASE WHEN points > 0 THEN points ELSE 0 END) as earned_total,
                SUM(CASE WHEN points < 0 THEN ABS(points) ELSE 0 END) as redeemed_total,
                MAX(CASE WHEN points > 0 THEN created_at END) as last_earned_at
            FROM points_transactions
            WHERE user_id = OLD.user_id
            GROUP BY user_id
        )
        UPDATE user_points
        SET
            points = COALESCE(ct.current_total, 0),
            total_earned = COALESCE(ct.earned_total, 0),
            total_redeemed = COALESCE(ct.redeemed_total, 0),
            last_earned_at = ct.last_earned_at,
            updated_at = NOW()
        FROM calculated_totals ct
        WHERE user_points.user_id = ct.user_id;

        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (if it doesn't exist)
DROP TRIGGER IF EXISTS sync_user_points_trigger ON points_transactions;
CREATE TRIGGER sync_user_points_trigger
    AFTER INSERT OR UPDATE OR DELETE ON points_transactions
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_points_on_transaction_change();

-- =========================================
-- 4. MONITORING QUERIES FOR REGULAR USE
-- =========================================

-- View for easy monitoring
CREATE OR REPLACE VIEW points_system_health AS
SELECT
    check_name,
    status,
    count_value,
    details,
    NOW() as checked_at
FROM check_points_system_health();

-- View for user points summary by type
CREATE OR REPLACE VIEW user_points_summary AS
SELECT
    CASE WHEN u.supabase_user_id IS NOT NULL THEN 'Google User' ELSE 'Legacy User' END as user_type,
    COUNT(*) as user_count,
    SUM(up.points) as total_current_points,
    SUM(up.total_earned) as total_lifetime_earned,
    SUM(up.total_redeemed) as total_lifetime_redeemed,
    AVG(up.points) as avg_current_points,
    MAX(up.points) as max_current_points,
    COUNT(CASE WHEN up.points > 0 THEN 1 END) as users_with_positive_balance
FROM user_points up
JOIN users u ON up.user_id = u.id
GROUP BY CASE WHEN u.supabase_user_id IS NOT NULL THEN 'Google User' ELSE 'Legacy User' END;

-- =========================================
-- 5. EMERGENCY DIAGNOSTIC QUERY
-- =========================================

-- Quick query to run when investigating specific user issues
CREATE OR REPLACE FUNCTION diagnose_user_points(user_identifier TEXT)
RETURNS TABLE (
    info_type TEXT,
    details TEXT
) AS $$
BEGIN
    -- User basic info
    RETURN QUERY
    SELECT
        'User Info'::TEXT,
        'ID: ' || u.id || ', Email: ' || u.email || ', Phone: ' || COALESCE(u.phone, 'N/A') ||
        ', Type: ' || CASE WHEN u.supabase_user_id IS NOT NULL THEN 'Google' ELSE 'Legacy' END ||
        ', Supabase ID: ' || COALESCE(u.supabase_user_id, 'N/A')
    FROM users u
    WHERE u.email = user_identifier
        OR u.phone = user_identifier
        OR u.id::TEXT = user_identifier
        OR u.supabase_user_id = user_identifier
    LIMIT 1;

    -- Current balance
    RETURN QUERY
    SELECT
        'Current Balance'::TEXT,
        'Points: ' || COALESCE(up.points, 0) || ', Total Earned: ' || COALESCE(up.total_earned, 0) ||
        ', Total Redeemed: ' || COALESCE(up.total_redeemed, 0) ||
        ', Last Earned: ' || COALESCE(up.last_earned_at::TEXT, 'Never')
    FROM users u
    LEFT JOIN user_points up ON u.id = up.user_id
    WHERE u.email = user_identifier
        OR u.phone = user_identifier
        OR u.id::TEXT = user_identifier
        OR u.supabase_user_id = user_identifier
    LIMIT 1;

    -- Recent transactions
    RETURN QUERY
    SELECT
        'Recent Transactions'::TEXT,
        STRING_AGG(
            pt.created_at::DATE || ': ' || pt.points || ' pts (' || pt.type || ') - ' || pt.description,
            '; '
            ORDER BY pt.created_at DESC
        )
    FROM users u
    JOIN points_transactions pt ON u.id = pt.user_id
    WHERE (u.email = user_identifier
        OR u.phone = user_identifier
        OR u.id::TEXT = user_identifier
        OR u.supabase_user_id = user_identifier)
        AND pt.created_at >= NOW() - INTERVAL '30 days';

    -- Recent orders
    RETURN QUERY
    SELECT
        'Recent Orders'::TEXT,
        STRING_AGG(
            'Order #' || o.id || ': $' || o.total || ' (' || o.status || ') on ' || o.created_at::DATE,
            '; '
            ORDER BY o.created_at DESC
        )
    FROM users u
    LEFT JOIN orders o ON (
        u.id = o.user_id
        OR u.supabase_user_id = o.supabase_user_id
        OR u.uuid_id = o.user_uuid
    )
    WHERE (u.email = user_identifier
        OR u.phone = user_identifier
        OR u.id::TEXT = user_identifier
        OR u.supabase_user_id = user_identifier)
        AND o.created_at >= NOW() - INTERVAL '30 days';

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- 6. USAGE EXAMPLES
-- =========================================

/*
-- Run daily health check:
SELECT * FROM points_system_health;

-- Auto-fix missing records:
SELECT * FROM auto_fix_missing_user_points();

-- Check user points summary:
SELECT * FROM user_points_summary;

-- Diagnose specific user (replace with actual email/phone/ID):
SELECT * FROM diagnose_user_points('user@example.com');
SELECT * FROM diagnose_user_points('+1234567890');
SELECT * FROM diagnose_user_points('123');
*/