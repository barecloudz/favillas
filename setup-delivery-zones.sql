-- Setup Delivery Zones and Settings
-- This script creates default delivery zones with three different pricing tiers

-- First, ensure the delivery_zones table exists
CREATE TABLE IF NOT EXISTS delivery_zones (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    max_radius DECIMAL(8,2) NOT NULL,
    delivery_fee DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure the delivery_settings table exists
CREATE TABLE IF NOT EXISTS delivery_settings (
    id SERIAL PRIMARY KEY,
    restaurant_address TEXT NOT NULL,
    restaurant_lat DECIMAL(10,8),
    restaurant_lng DECIMAL(11,8),
    google_maps_api_key TEXT,
    max_delivery_radius DECIMAL(8,2) NOT NULL DEFAULT 10,
    distance_unit TEXT DEFAULT 'miles',
    is_google_maps_enabled BOOLEAN DEFAULT false NOT NULL,
    fallback_delivery_fee DECIMAL(10,2) DEFAULT 5.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clear existing zones (for fresh setup)
DELETE FROM delivery_zones;

-- Insert three default delivery zones with different pricing tiers
INSERT INTO delivery_zones (name, max_radius, delivery_fee, is_active, sort_order) VALUES
    ('Close Range', 3.0, 2.99, true, 1),
    ('Medium Range', 6.0, 4.99, true, 2),
    ('Far Range', 10.0, 7.99, true, 3);

-- Insert default delivery settings (update this with your actual restaurant address)
INSERT INTO delivery_settings (restaurant_address, max_delivery_radius, is_google_maps_enabled, fallback_delivery_fee)
VALUES ('5 Regent Park Blvd, Asheville, NC 28806', 10.0, false, 5.00)
ON CONFLICT (id) DO UPDATE SET
    restaurant_address = EXCLUDED.restaurant_address,
    max_delivery_radius = EXCLUDED.max_delivery_radius,
    fallback_delivery_fee = EXCLUDED.fallback_delivery_fee;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON delivery_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_sort_order ON delivery_zones(sort_order);

-- Display the results
SELECT 'Delivery Zones Created:' as message;
SELECT id, name, max_radius || ' miles' as radius, '$' || delivery_fee as fee,
       CASE WHEN is_active THEN 'Active' ELSE 'Inactive' END as status
FROM delivery_zones
ORDER BY sort_order;

SELECT 'Delivery Settings:' as message;
SELECT restaurant_address, max_delivery_radius || ' miles' as max_radius,
       CASE WHEN is_google_maps_enabled THEN 'Enabled' ELSE 'Disabled' END as google_maps,
       '$' || fallback_delivery_fee as fallback_fee
FROM delivery_settings;