-- Insert default delivery zones with three different pricing tiers
-- This uses the existing table structure with zone_name, min_distance_miles, max_distance_miles

-- Insert three default delivery zones (only if they don't exist)
INSERT INTO delivery_zones (zone_name, min_distance_miles, max_distance_miles, delivery_fee, is_active)
SELECT 'Close Range', 0, 3.0, 2.99, true
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones WHERE zone_name = 'Close Range');

INSERT INTO delivery_zones (zone_name, min_distance_miles, max_distance_miles, delivery_fee, is_active)
SELECT 'Medium Range', 3.0, 6.0, 4.99, true
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones WHERE zone_name = 'Medium Range');

INSERT INTO delivery_zones (zone_name, min_distance_miles, max_distance_miles, delivery_fee, is_active)
SELECT 'Far Range', 6.0, 10.0, 7.99, true
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones WHERE zone_name = 'Far Range');