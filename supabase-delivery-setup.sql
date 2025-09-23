-- Manual Supabase setup for delivery zones and settings
-- Copy and paste this into your Supabase SQL editor

-- Create delivery_settings table
CREATE TABLE IF NOT EXISTS delivery_settings (
  id SERIAL PRIMARY KEY,
  restaurant_address TEXT NOT NULL,
  restaurant_lat DECIMAL(10, 8),
  restaurant_lng DECIMAL(11, 8),
  google_maps_api_key TEXT,
  max_delivery_radius DECIMAL(8, 2) NOT NULL DEFAULT 10,
  distance_unit VARCHAR(20) NOT NULL DEFAULT 'miles',
  is_google_maps_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  fallback_delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create delivery_zones table
CREATE TABLE IF NOT EXISTS delivery_zones (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  max_radius DECIMAL(8, 2) NOT NULL,
  delivery_fee DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default delivery settings for your restaurant
INSERT INTO delivery_settings (
  restaurant_address,
  max_delivery_radius,
  distance_unit,
  is_google_maps_enabled,
  fallback_delivery_fee
) VALUES (
  '5 Regent Park Blvd, Asheville, NC 28806',
  10.0,
  'miles',
  false,
  5.00
);

-- Insert the 3-tier delivery zones
INSERT INTO delivery_zones (name, max_radius, delivery_fee, is_active, sort_order) VALUES
('Close Range', 3.0, 2.99, true, 1),
('Medium Range', 6.0, 4.99, true, 2),
('Far Range', 10.0, 7.99, true, 3);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON delivery_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_sort_order ON delivery_zones(sort_order);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_radius ON delivery_zones(max_radius);

-- Check the results
SELECT 'Delivery Settings' as table_name, count(*) as records FROM delivery_settings
UNION ALL
SELECT 'Delivery Zones' as table_name, count(*) as records FROM delivery_zones;

-- Show the created zones
SELECT
  name,
  max_radius || ' miles' as radius,
  '$' || delivery_fee as fee,
  CASE WHEN is_active THEN 'Active' ELSE 'Inactive' END as status
FROM delivery_zones
ORDER BY sort_order;