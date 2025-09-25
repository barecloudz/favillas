-- Check points system tables and data

-- 1. Check if tables exist
SELECT 'POINTS TABLES CHECK:' as info;
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('user_points', 'points_transactions')
ORDER BY table_name;

-- 2. Check user_points table structure
SELECT 'USER_POINTS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_points'
ORDER BY ordinal_position;

-- 3. Check points_transactions table structure
SELECT 'POINTS_TRANSACTIONS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'points_transactions'
ORDER BY ordinal_position;

-- 4. Sample user points data
SELECT 'SAMPLE USER POINTS:' as info;
SELECT
  u.id, u.first_name, u.last_name, u.email, u.role,
  COALESCE(up.points, 0) as current_points
FROM users u
LEFT JOIN user_points up ON u.id = up.user_id
WHERE u.role = 'customer'
ORDER BY u.id
LIMIT 5;

-- 5. Recent points transactions
SELECT 'RECENT POINTS TRANSACTIONS:' as info;
SELECT COUNT(*) as total_transactions FROM points_transactions;

SELECT
  pt.id, pt.user_id, pt.points, pt.type, pt.description, pt.created_at,
  u.first_name, u.last_name
FROM points_transactions pt
LEFT JOIN users u ON pt.user_id = u.id
ORDER BY pt.created_at DESC
LIMIT 5;

-- 6. Users with zero points
SELECT 'USERS WITH ZERO POINTS:' as info;
SELECT COUNT(*) as users_with_zero_points
FROM users u
LEFT JOIN user_points up ON u.id = up.user_id
WHERE u.role = 'customer' AND COALESCE(up.points, 0) = 0;