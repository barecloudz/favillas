-- Clean up delivery zones to ensure exactly 3 zones exist
-- This will remove any duplicates and set up the correct 3-tier pricing

-- First, let's see what currently exists
SELECT
  id,
  zone_name,
  min_distance_miles || '-' || max_distance_miles || ' miles' as distance_range,
  '$' || delivery_fee as fee,
  is_active
FROM delivery_zones
ORDER BY min_distance_miles;

-- Delete all existing delivery zones to start fresh
DELETE FROM delivery_zones;

-- Insert exactly 3 delivery zones with the correct pricing structure
INSERT INTO delivery_zones (zone_name, min_distance_miles, max_distance_miles, delivery_fee, estimated_time_minutes, is_active) VALUES
('Close Range', 0.0, 3.0, 2.99, 30, true),
('Medium Range', 3.0, 6.0, 4.99, 40, true),
('Far Range', 6.0, 10.0, 7.99, 50, true);

-- Verify we now have exactly 3 zones
SELECT
  'Total zones: ' || COUNT(*) as summary
FROM delivery_zones;

-- Show the final 3-tier pricing structure
SELECT
  zone_name as "Zone Name",
  min_distance_miles || '-' || max_distance_miles || ' miles' as "Distance Range",
  '$' || delivery_fee as "Delivery Fee",
  estimated_time_minutes || ' minutes' as "Estimated Time",
  CASE WHEN is_active THEN 'Active' ELSE 'Inactive' END as "Status"
FROM delivery_zones
ORDER BY min_distance_miles;