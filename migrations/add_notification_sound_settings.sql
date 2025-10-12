-- Add notification sound settings to system_settings table

-- Insert notification sound settings (if they don't exist)
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, display_name, description, is_sensitive)
VALUES
  ('NOTIFICATION_SOUND_ENABLED', 'true', 'boolean', 'notifications', 'Enable Notification Sounds', 'Enable notification sounds for new orders', false),
  ('NOTIFICATION_SOUND_TYPE', 'chime', 'select', 'notifications', 'Sound Type', 'Default notification sound type (chime, bell, ding, beep, custom)', false),
  ('NOTIFICATION_SOUND_VOLUME', '0.5', 'number', 'notifications', 'Sound Volume', 'Notification sound volume (0.0 to 1.0)', false),
  ('NOTIFICATION_CUSTOM_SOUND_URL', '', 'text', 'notifications', 'Custom Sound URL', 'URL of custom notification sound file', false),
  ('NOTIFICATION_CUSTOM_SOUND_NAME', '', 'text', 'notifications', 'Custom Sound Name', 'Name of custom notification sound file', false)
ON CONFLICT (setting_key) DO NOTHING;
