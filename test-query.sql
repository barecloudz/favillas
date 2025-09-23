SELECT
  zone_name,
  min_distance_miles || '-' || max_distance_miles || ' miles' as range,
  '$' || delivery_fee as fee,
  CASE WHEN is_active THEN 'Active' ELSE 'Inactive' END as status
FROM delivery_zones
ORDER BY min_distance_miles;