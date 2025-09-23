-- Check existing table structures first
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'delivery_zones'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'delivery_settings'
ORDER BY ordinal_position;

-- Show existing data if any
SELECT * FROM delivery_zones LIMIT 5;
SELECT * FROM delivery_settings LIMIT 5;