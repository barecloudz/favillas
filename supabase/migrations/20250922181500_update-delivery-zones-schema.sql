-- Update delivery zones schema to match the application schema
-- This migration ensures the table columns match what the app expects

-- First, check if the table exists and update its structure
DO $$
BEGIN
    -- Check if delivery_zones table has the old column structure and update it
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'delivery_zones'
               AND column_name = 'zone_name') THEN

        -- Rename columns to match the new schema
        ALTER TABLE delivery_zones RENAME COLUMN zone_name TO name;
        ALTER TABLE delivery_zones RENAME COLUMN min_distance_miles TO min_radius;
        ALTER TABLE delivery_zones RENAME COLUMN max_distance_miles TO max_radius;

        -- Drop min_radius since we only need max_radius
        ALTER TABLE delivery_zones DROP COLUMN IF EXISTS min_radius;

        -- Add missing columns if they don't exist
        ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0 NOT NULL;
        ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

        -- Ensure correct data types
        ALTER TABLE delivery_zones ALTER COLUMN max_radius TYPE DECIMAL(8,2);
        ALTER TABLE delivery_zones ALTER COLUMN delivery_fee TYPE DECIMAL(10,2);

    END IF;
END $$;

-- Insert three default delivery zones with different pricing tiers
-- Only insert if no zones exist to avoid duplicates
INSERT INTO delivery_zones (name, max_radius, delivery_fee, is_active, sort_order)
SELECT 'Close Range', 3.0, 2.99, true, 1
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones WHERE name = 'Close Range');

INSERT INTO delivery_zones (name, max_radius, delivery_fee, is_active, sort_order)
SELECT 'Medium Range', 6.0, 4.99, true, 2
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones WHERE name = 'Medium Range');

INSERT INTO delivery_zones (name, max_radius, delivery_fee, is_active, sort_order)
SELECT 'Far Range', 10.0, 7.99, true, 3
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones WHERE name = 'Far Range');

-- Insert default delivery settings (update this with your actual restaurant address)
-- Only insert if no settings exist
INSERT INTO delivery_settings (restaurant_address, max_delivery_radius, is_google_maps_enabled, fallback_delivery_fee)
SELECT '5 Regent Park Blvd, Asheville, NC 28806', 10.0, false, 5.00
WHERE NOT EXISTS (SELECT 1 FROM delivery_settings);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON delivery_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_sort_order ON delivery_zones(sort_order);