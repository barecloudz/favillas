-- Christmas Advent Calendar System
-- Run this migration to enable the advent calendar feature

-- Table to store daily advent calendar rewards
CREATE TABLE IF NOT EXISTS advent_calendar (
  id SERIAL PRIMARY KEY,
  day INTEGER NOT NULL CHECK (day >= 1 AND day <= 25), -- Day of December (1-25)
  reward_id INTEGER REFERENCES rewards(id) ON DELETE SET NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(day, year) -- One reward per day per year
);

-- Table to track user claims
CREATE TABLE IF NOT EXISTS advent_claims (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  supabase_user_id UUID,
  advent_day INTEGER NOT NULL,
  reward_id INTEGER REFERENCES rewards(id) ON DELETE CASCADE,
  voucher_id INTEGER REFERENCES user_vouchers(id) ON DELETE SET NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  claimed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, advent_day, year),
  UNIQUE(supabase_user_id, advent_day, year),
  CHECK (user_id IS NOT NULL OR supabase_user_id IS NOT NULL)
);

-- Add advent calendar toggle to animations_settings if it doesn't exist
INSERT INTO animations_settings (animation_key, is_enabled, settings, pages)
VALUES ('advent_calendar', false, '{"year": 2024}'::jsonb, ARRAY['all']::TEXT[])
ON CONFLICT (animation_key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_advent_claims_user ON advent_claims(user_id, year);
CREATE INDEX IF NOT EXISTS idx_advent_claims_supabase_user ON advent_claims(supabase_user_id, year);
CREATE INDEX IF NOT EXISTS idx_advent_calendar_day ON advent_calendar(day, year);

-- Sample comment
COMMENT ON TABLE advent_calendar IS 'Stores daily rewards for Christmas advent calendar (Dec 1-25)';
COMMENT ON TABLE advent_claims IS 'Tracks which users have claimed which advent calendar rewards';
