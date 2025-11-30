-- Create animations_settings table for configurable frontend animations
CREATE TABLE IF NOT EXISTS animations_settings (
  id SERIAL PRIMARY KEY,
  animation_key TEXT UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}'::jsonb,
  pages TEXT[] DEFAULT ARRAY[]::TEXT[],
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default animations
INSERT INTO animations_settings (animation_key, is_enabled, settings, pages, start_date, end_date)
VALUES
  (
    'snow_fall',
    false,
    '{"density": 50, "speed": "medium", "color": "#ffffff"}'::jsonb,
    ARRAY['home', 'menu'],
    '2024-12-01',
    '2024-12-31'
  ),
  (
    'flying_santa',
    false,
    '{"speed": 30, "direction": "left-to-right"}'::jsonb,
    ARRAY['menu'],
    '2024-12-01',
    '2024-12-25'
  ),
  (
    'christmas_theme',
    false,
    '{"showLights": true, "showTree": false}'::jsonb,
    ARRAY['all'],
    '2024-12-01',
    '2024-12-31'
  )
ON CONFLICT (animation_key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_animations_enabled ON animations_settings(is_enabled);

COMMENT ON TABLE animations_settings IS 'Stores configuration for frontend animations (snow, santa, etc.)';
