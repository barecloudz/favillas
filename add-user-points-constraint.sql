-- Add unique constraint on user_id to allow UPSERT operations
-- This is needed for the ON CONFLICT clause to work

-- First check if constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_points_user_id_key'
    ) THEN
        ALTER TABLE user_points
        ADD CONSTRAINT user_points_user_id_key UNIQUE (user_id);
        RAISE NOTICE 'Added unique constraint on user_id';
    ELSE
        RAISE NOTICE 'Constraint already exists on user_id';
    END IF;
END $$;

-- Also ensure supabase_user_id has unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_points_supabase_user_id_key'
    ) THEN
        ALTER TABLE user_points
        ADD CONSTRAINT user_points_supabase_user_id_key UNIQUE (supabase_user_id);
        RAISE NOTICE 'Added unique constraint on supabase_user_id';
    ELSE
        RAISE NOTICE 'Constraint already exists on supabase_user_id';
    END IF;
END $$;
