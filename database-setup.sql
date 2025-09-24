-- Database Setup Script for Pizza Spin Rewards
-- Run this script to fix all database issues

-- 1. Create tax_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS tax_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  applies_to_delivery BOOLEAN DEFAULT false,
  applies_to_tips BOOLEAN DEFAULT false,
  applies_to_service_fees BOOLEAN DEFAULT false,
  applies_to_menu_items BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Add display_name column to system_settings if it doesn't exist
ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

-- 3. Update existing system_settings rows to have display_name (prevents null constraint violations)
UPDATE system_settings
SET display_name = setting_key
WHERE display_name IS NULL;

-- 4. Create a default tax category if none exist
INSERT INTO tax_categories (name, description, rate, is_active, applies_to_menu_items)
SELECT 'Standard Tax', 'Default tax category for menu items', 8.75, true, true
WHERE NOT EXISTS (SELECT 1 FROM tax_categories);

-- 5. Ensure QR codes table exists (from previous work)
CREATE TABLE IF NOT EXISTS qr_codes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'menu',
  url TEXT NOT NULL,
  qr_data TEXT NOT NULL,
  table_number INTEGER,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by_user_id INTEGER REFERENCES users(id)
);

-- 6. Add some example data for testing (optional)
INSERT INTO tax_categories (name, description, rate, is_active, applies_to_menu_items)
SELECT 'Food Tax', 'Tax applied to food items', 8.25, true, true
WHERE NOT EXISTS (SELECT 1 FROM tax_categories WHERE name = 'Food Tax');

INSERT INTO tax_categories (name, description, rate, is_active, applies_to_delivery)
SELECT 'Delivery Tax', 'Tax applied to delivery fees', 5.00, true, true
WHERE NOT EXISTS (SELECT 1 FROM tax_categories WHERE name = 'Delivery Tax');

-- 7. Ensure all system_settings have proper display_name values for service fees
INSERT INTO system_settings (setting_key, setting_value, display_name) VALUES
('service_fee_enabled', 'false', 'Service Fee Enabled'),
('service_fee_type', 'percentage', 'Service Fee Type'),
('service_fee_amount', '0', 'Service Fee Amount'),
('service_fee_label', 'Service Fee', 'Service Fee Label'),
('service_fee_description', 'Processing and service fee', 'Service Fee Description'),
('card_fee_enabled', 'false', 'Card Fee Enabled'),
('card_fee_type', 'percentage', 'Card Fee Type'),
('card_fee_amount', '2.9', 'Card Fee Amount'),
('card_fee_label', 'Card Processing Fee', 'Card Fee Label'),
('card_fee_description', 'Credit card processing fee', 'Card Fee Description'),
('service_fee_apply_delivery', 'true', 'Apply to Delivery'),
('service_fee_apply_pickup', 'true', 'Apply to Pickup'),
('service_fee_apply_taxable', 'false', 'Apply to Taxable Total'),
('service_fee_minimum_order', '0', 'Minimum Order Amount'),
('service_fee_maximum_amount', '0', 'Maximum Fee Amount'),
('service_fee_show_menu', 'true', 'Show on Menu Page'),
('service_fee_show_summary', 'true', 'Show in Order Summary'),
('service_fee_show_email', 'true', 'Include in Email Receipts')
ON CONFLICT (setting_key) DO UPDATE SET
  display_name = EXCLUDED.display_name;

-- Success message
SELECT 'Database setup completed successfully!' as message;