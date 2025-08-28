-- Add branding settings to system_settings table
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, display_name, description, is_sensitive) VALUES 
('COMPANY_NAME', 'FAVILLA''S NY PIZZA', 'text', 'branding', 'Company Name', 'The name of your business displayed in headers and receipts', false),
('COMPANY_TAGLINE', 'Authentic New York Style Pizza', 'text', 'branding', 'Company Tagline', 'A short tagline or slogan for your business', false),
('COMPANY_ADDRESS', '123 Main St, Asheville, NC', 'text', 'branding', 'Company Address', 'Your business address for receipts and contact info', false),
('COMPANY_PHONE', '(828) 555-0123', 'text', 'branding', 'Company Phone', 'Your business phone number', false),
('COMPANY_EMAIL', 'info@favillaspizza.com', 'text', 'branding', 'Company Email', 'Your business email address', false),
('COMPANY_WEBSITE', 'https://favillaspizza.com', 'text', 'branding', 'Company Website', 'Your business website URL', false),
('LOGO_URL', '/images/logopng.png', 'text', 'branding', 'Logo URL', 'Path to your company logo image (relative to public folder)', false),
('FAVICON_URL', '/favicon.ico', 'text', 'branding', 'Favicon URL', 'Path to your website favicon', false)
ON CONFLICT (setting_key) DO NOTHING;