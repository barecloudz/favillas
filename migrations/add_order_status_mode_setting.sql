-- Add ORDER_STATUS_MODE setting to system_settings table
INSERT INTO system_settings (
    setting_key,
    setting_value,
    setting_type,
    category,
    display_name,
    description,
    is_sensitive,
    options
) VALUES (
    'ORDER_STATUS_MODE',
    'manual',
    'select',
    'kitchen',
    'Order Status Mode',
    'Controls kitchen workflow: Manual requires staff to progress orders through each status. Automatic simplifies the interface for new workers.',
    false,
    '["manual", "automatic"]'
)
ON CONFLICT (setting_key) DO NOTHING;
