-- Add printer server URL setting for Raspberry Pi printer server
INSERT INTO system_settings
  (setting_key, setting_value, setting_type, category, display_name, description, is_sensitive, validation_pattern)
VALUES
  ('PRINTER_SERVER_URL', 'http://192.168.1.18:3001', 'text', 'printer', 'Printer Server URL', 'URL of the Raspberry Pi printer server (e.g., http://192.168.1.18:3001)', false, '^https?://[\\w\\d\\.-]+(:\\d+)?$')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  validation_pattern = EXCLUDED.validation_pattern;
