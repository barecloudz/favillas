-- Add custom notification sound URL field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_notification_sound_url TEXT;
