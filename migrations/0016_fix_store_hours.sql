-- Fix store_hours table to match schema and correct hours
-- Drop and recreate to ensure schema matches code

DROP TABLE IF EXISTS store_hours CASCADE;

CREATE TABLE store_hours (
  id SERIAL PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_name TEXT NOT NULL,
  is_open BOOLEAN DEFAULT true NOT NULL,
  open_time TEXT,
  close_time TEXT,
  is_break_time BOOLEAN DEFAULT false NOT NULL,
  break_start_time TEXT,
  break_end_time TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(day_of_week)
);

-- Add comments
COMMENT ON TABLE store_hours IS 'Restaurant operating hours by day of week (0=Sunday, 6=Saturday)';
COMMENT ON COLUMN store_hours.day_of_week IS '0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';
COMMENT ON COLUMN store_hours.day_name IS 'Day name in English';
COMMENT ON COLUMN store_hours.is_open IS 'Whether the restaurant is open on this day';
COMMENT ON COLUMN store_hours.open_time IS 'Opening time in HH:MM format (24-hour)';
COMMENT ON COLUMN store_hours.close_time IS 'Closing time in HH:MM format (24-hour)';
COMMENT ON COLUMN store_hours.is_break_time IS 'Whether there is a break period during the day';
COMMENT ON COLUMN store_hours.break_start_time IS 'Break start time in HH:MM format (24-hour)';
COMMENT ON COLUMN store_hours.break_end_time IS 'Break end time in HH:MM format (24-hour)';

-- Insert correct hours matching the home page
INSERT INTO store_hours (day_of_week, day_name, is_open, open_time, close_time, is_break_time) VALUES
  (0, 'Sunday', true, '12:00', '20:00', false),      -- Sunday: 12:00 PM - 8:00 PM
  (1, 'Monday', true, '11:00', '20:00', false),      -- Monday: 11:00 AM - 8:00 PM
  (2, 'Tuesday', true, '11:00', '20:00', false),     -- Tuesday: 11:00 AM - 8:00 PM
  (3, 'Wednesday', true, '11:00', '20:00', false),   -- Wednesday: 11:00 AM - 8:00 PM
  (4, 'Thursday', true, '11:00', '20:00', false),    -- Thursday: 11:00 AM - 8:00 PM
  (5, 'Friday', true, '11:00', '21:00', false),      -- Friday: 11:00 AM - 9:00 PM
  (6, 'Saturday', true, '11:00', '21:00', false)     -- Saturday: 11:00 AM - 9:00 PM
ON CONFLICT (day_of_week) DO UPDATE SET
  day_name = EXCLUDED.day_name,
  is_open = EXCLUDED.is_open,
  open_time = EXCLUDED.open_time,
  close_time = EXCLUDED.close_time,
  is_break_time = EXCLUDED.is_break_time,
  updated_at = NOW();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_store_hours_day ON store_hours(day_of_week);
