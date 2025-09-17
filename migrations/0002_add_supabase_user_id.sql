-- Migration to add supabase_user_id fields for proper Google OAuth user tracking
-- This fixes the critical issue where Google users see each other's orders

-- Add supabase_user_id to users table to store the full Supabase UUID
ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_user_id TEXT;

-- Add unique index on supabase_user_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_supabase_user_id ON users(supabase_user_id) WHERE supabase_user_id IS NOT NULL;

-- Add supabase_user_id to orders table to link orders to Supabase users
ALTER TABLE orders ADD COLUMN IF NOT EXISTS supabase_user_id TEXT;

-- Add index on orders.supabase_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_supabase_user_id ON orders(supabase_user_id) WHERE supabase_user_id IS NOT NULL;

-- Add comment explaining the purpose
COMMENT ON COLUMN users.supabase_user_id IS 'Full Supabase UUID for Google OAuth users to prevent ID collisions';
COMMENT ON COLUMN orders.supabase_user_id IS 'Links orders to Supabase users via UUID to fix Google auth order display';