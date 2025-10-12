-- Add notification sound settings to system_settings table

-- Insert notification sound settings (if they don't exist)
INSERT INTO system_settings (category, key, value, description, sort_order)
VALUES
  ('notifications', 'sound_enabled', 'true', 'Enable notification sounds for new orders', 1),
  ('notifications', 'sound_type', 'chime', 'Default notification sound type (chime, bell, ding, beep, custom)', 2),
  ('notifications', 'sound_volume', '0.5', 'Notification sound volume (0.0 to 1.0)', 3),
  ('notifications', 'custom_sound_url', '', 'URL of custom notification sound file', 4),
  ('notifications', 'custom_sound_name', '', 'Name of custom notification sound file', 5)
ON CONFLICT (category, key) DO NOTHING;
