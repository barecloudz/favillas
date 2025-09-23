-- Check the current delivery_zones table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'delivery_zones'
ORDER BY ordinal_position;

-- Check the current delivery_settings table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'delivery_settings'
ORDER BY ordinal_position;

-- Check current data in delivery_zones
SELECT * FROM delivery_zones LIMIT 5;

-- Check current data in delivery_settings
SELECT * FROM delivery_settings LIMIT 5;