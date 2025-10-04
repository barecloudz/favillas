-- Create store_hours table for restaurant operating hours
CREATE TABLE IF NOT EXISTS store_hours (
  id SERIAL PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(day_of_week)
);

-- Add comment
COMMENT ON TABLE store_hours IS 'Restaurant operating hours by day of week (0=Sunday, 6=Saturday)';
COMMENT ON COLUMN store_hours.day_of_week IS '0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';
COMMENT ON COLUMN store_hours.is_closed IS 'Set to true if restaurant is closed all day';

-- Insert default hours (Monday-Sunday)
INSERT INTO store_hours (day_of_week, open_time, close_time, is_closed) VALUES
  (0, '11:00:00', '21:00:00', false), -- Sunday
  (1, '11:00:00', '21:00:00', false), -- Monday
  (2, '11:00:00', '21:00:00', false), -- Tuesday
  (3, '11:00:00', '21:00:00', false), -- Wednesday
  (4, '11:00:00', '21:00:00', false), -- Thursday
  (5, '11:00:00', '22:00:00', false), -- Friday
  (6, '11:00:00', '22:00:00', false)  -- Saturday
ON CONFLICT (day_of_week) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_store_hours_day ON store_hours(day_of_week);
