-- Insert delivery zones using the existing table structure
-- This works with the delivery_zones table that already exists

-- Insert the 3-tier delivery zones using correct column names
INSERT INTO delivery_zones (zone_name, min_distance_miles, max_distance_miles, delivery_fee, estimated_time_minutes, is_active) VALUES
('Close Range', 0.0, 3.0, 2.99, 30, true),
('Medium Range', 3.0, 6.0, 4.99, 40, true),
('Far Range', 6.0, 10.0, 7.99, 50, true);

-- Check what was inserted
SELECT
  zone_name,
  min_distance_miles || '-' || max_distance_miles || ' miles' as distance_range,
  '$' || delivery_fee as fee,
  estimated_time_minutes || ' min' as estimated_time,
  CASE WHEN is_active THEN 'Active' ELSE 'Inactive' END as status
FROM delivery_zones
ORDER BY min_distance_miles;