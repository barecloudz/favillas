-- Create system_settings table for managing environment variables from admin dashboard
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type TEXT DEFAULT 'text', -- text, password, number, boolean, select
    category TEXT DEFAULT 'general', -- payment, delivery, printer, api, general
    display_name TEXT NOT NULL,
    description TEXT,
    is_sensitive BOOLEAN DEFAULT false, -- for API keys, passwords etc
    options JSONB, -- for select type settings
    validation_pattern TEXT, -- regex pattern for validation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- Insert default system settings that can be managed through admin dashboard
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, display_name, description, is_sensitive, validation_pattern) VALUES 
('STRIPE_SECRET_KEY', '', 'password', 'payment', 'Stripe Secret Key', 'Your Stripe secret key for processing payments (starts with sk_)', true, '^sk_(test_|live_)[a-zA-Z0-9]+$'),
('VITE_STRIPE_PUBLIC_KEY', '', 'password', 'payment', 'Stripe Public Key', 'Your Stripe publishable key (starts with pk_)', true, '^pk_(test_|live_)[a-zA-Z0-9]+$'),
('SHIPDAY_API_KEY', '', 'password', 'delivery', 'ShipDay API Key', 'API key for ShipDay delivery integration', true, NULL),
('SHIPDAY_WEBHOOK_TOKEN', '', 'password', 'delivery', 'ShipDay Webhook Token', 'Security token for ShipDay webhook verification', true, NULL),
('SHIPDAY_WEBHOOK_URL', '', 'text', 'delivery', 'ShipDay Webhook URL', 'URL for receiving ShipDay webhook notifications', false, '^https?://.*$'),
('SHIPDAY_RESTAURANT_ID', '', 'text', 'delivery', 'ShipDay Restaurant ID', 'Your restaurant ID in ShipDay system', false, NULL),
('PRINTER_IP', 'localhost:8080', 'text', 'printer', 'Printer IP Address', 'IP address and port for thermal printer (e.g., 192.168.1.100 or localhost:8080)', false, '^(localhost:\\d+|\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(:\\d+)?)$'),
('MONITOR_MODE', 'false', 'select', 'general', 'Kitchen Monitor Mode', 'Require manual order acceptance in kitchen', false, NULL),
('SESSION_SECRET', '', 'password', 'general', 'Session Secret', 'Secret key for session encryption (change in production)', true, '.{32,}'),
('NODE_ENV', 'development', 'select', 'general', 'Environment', 'Application environment mode', false, NULL)
ON CONFLICT (setting_key) DO NOTHING;

-- Update options for select type settings
UPDATE system_settings SET options = '["true", "false"]' WHERE setting_key = 'MONITOR_MODE';
UPDATE system_settings SET options = '["development", "production", "staging"]' WHERE setting_key = 'NODE_ENV';