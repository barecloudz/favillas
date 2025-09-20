-- Migration to create delivery settings and zone management
-- This enables dynamic delivery fee calculation based on distance

-- Store location settings
CREATE TABLE IF NOT EXISTS store_settings (
  id SERIAL PRIMARY KEY,
  store_name VARCHAR(255) NOT NULL DEFAULT 'Favillas NY Pizza',
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Delivery zones with distance-based pricing
CREATE TABLE IF NOT EXISTS delivery_zones (
  id SERIAL PRIMARY KEY,
  zone_name VARCHAR(100) NOT NULL,
  min_distance_miles DECIMAL(4, 2) NOT NULL DEFAULT 0.0,
  max_distance_miles DECIMAL(4, 2) NOT NULL,
  delivery_fee DECIMAL(6, 2) NOT NULL,
  estimated_time_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Delivery blackout areas (optional - for areas we don't deliver to)
CREATE TABLE IF NOT EXISTS delivery_blackouts (
  id SERIAL PRIMARY KEY,
  area_name VARCHAR(255) NOT NULL,
  zip_codes TEXT[], -- Array of zip codes
  reason VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert actual store location
INSERT INTO store_settings (store_name, address, latitude, longitude, phone) VALUES
('Favillas NY Pizza', '5 Regent Park Blvd #107, Asheville, NC 28806', 35.59039, -82.58198, '(828) 225-2885')
ON CONFLICT DO NOTHING;

-- Insert default delivery zones
INSERT INTO delivery_zones (zone_name, min_distance_miles, max_distance_miles, delivery_fee, estimated_time_minutes) VALUES
('Close Zone', 0.0, 5.0, 6.99, 30),
('Medium Zone', 5.0, 8.0, 9.49, 40),
('Far Zone', 8.0, 10.0, 11.99, 50)
ON CONFLICT DO NOTHING;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_delivery_zones_distance ON delivery_zones(min_distance_miles, max_distance_miles);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON delivery_zones(is_active);

-- Add comments
COMMENT ON TABLE store_settings IS 'Store location and contact information for delivery calculations';
COMMENT ON TABLE delivery_zones IS 'Distance-based delivery zones with pricing tiers';
COMMENT ON TABLE delivery_blackouts IS 'Areas where delivery is not available';
COMMENT ON COLUMN delivery_zones.min_distance_miles IS 'Minimum distance for this zone (inclusive)';
COMMENT ON COLUMN delivery_zones.max_distance_miles IS 'Maximum distance for this zone (exclusive)';
COMMENT ON COLUMN delivery_zones.delivery_fee IS 'Delivery fee for this distance zone';