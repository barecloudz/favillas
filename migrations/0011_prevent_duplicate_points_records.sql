-- Migration to permanently prevent duplicate user_points records
-- This fixes the root cause of points being stuck at 5999

-- 1. Clean up any existing duplicate records (keep oldest record per user)
DO $$
DECLARE
  duplicate_record RECORD;
  records_to_keep INT[];
  records_to_delete INT[];
BEGIN
  RAISE NOTICE 'Starting duplicate cleanup...';

  -- Find all users with duplicate records (by user_id)
  FOR duplicate_record IN
    SELECT user_id, COUNT(*) as count
    FROM user_points
    WHERE user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) > 1
  LOOP
    RAISE NOTICE 'Found % duplicate records for user_id %', duplicate_record.count, duplicate_record.user_id;

    -- Get the oldest record ID to keep
    SELECT ARRAY_AGG(id) INTO records_to_keep
    FROM (
      SELECT id FROM user_points
      WHERE user_id = duplicate_record.user_id
      ORDER BY created_at ASC, id ASC
      LIMIT 1
    ) oldest;

    -- Get all other record IDs to delete
    SELECT ARRAY_AGG(id) INTO records_to_delete
    FROM user_points
    WHERE user_id = duplicate_record.user_id
      AND id != ALL(records_to_keep);

    -- Delete duplicates
    IF array_length(records_to_delete, 1) > 0 THEN
      DELETE FROM user_points WHERE id = ANY(records_to_delete);
      RAISE NOTICE 'Deleted % duplicate records for user_id %', array_length(records_to_delete, 1), duplicate_record.user_id;
    END IF;
  END LOOP;

  -- Find all users with duplicate records (by supabase_user_id)
  FOR duplicate_record IN
    SELECT supabase_user_id, COUNT(*) as count
    FROM user_points
    WHERE supabase_user_id IS NOT NULL
    GROUP BY supabase_user_id
    HAVING COUNT(*) > 1
  LOOP
    RAISE NOTICE 'Found % duplicate records for supabase_user_id %', duplicate_record.count, duplicate_record.supabase_user_id;

    -- Get the oldest record ID to keep
    SELECT ARRAY_AGG(id) INTO records_to_keep
    FROM (
      SELECT id FROM user_points
      WHERE supabase_user_id = duplicate_record.supabase_user_id
      ORDER BY created_at ASC, id ASC
      LIMIT 1
    ) oldest;

    -- Get all other record IDs to delete
    SELECT ARRAY_AGG(id) INTO records_to_delete
    FROM user_points
    WHERE supabase_user_id = duplicate_record.supabase_user_id
      AND id != ALL(records_to_keep);

    -- Delete duplicates
    IF array_length(records_to_delete, 1) > 0 THEN
      DELETE FROM user_points WHERE id = ANY(records_to_delete);
      RAISE NOTICE 'Deleted % duplicate records for supabase_user_id %', array_length(records_to_delete, 1), duplicate_record.supabase_user_id;
    END IF;
  END LOOP;

  RAISE NOTICE 'Duplicate cleanup completed';
END $$;

-- 2. Drop existing unique indexes if they exist
DROP INDEX IF EXISTS idx_user_points_user_id;
DROP INDEX IF EXISTS idx_user_points_supabase_user_id;

-- 3. Create UNIQUE constraints to prevent future duplicates
-- For legacy users (user_id)
CREATE UNIQUE INDEX idx_user_points_user_id
ON user_points(user_id)
WHERE user_id IS NOT NULL;

-- For Supabase users (supabase_user_id)
CREATE UNIQUE INDEX idx_user_points_supabase_user_id
ON user_points(supabase_user_id)
WHERE supabase_user_id IS NOT NULL;

-- 4. Add helpful check constraint to ensure one identifier is present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_user_points_user_reference'
  ) THEN
    ALTER TABLE user_points ADD CONSTRAINT chk_user_points_user_reference
    CHECK (
      (user_id IS NOT NULL AND supabase_user_id IS NULL) OR
      (user_id IS NULL AND supabase_user_id IS NOT NULL)
    );
  END IF;
END $$;

-- 5. Add comments for documentation
COMMENT ON INDEX idx_user_points_user_id IS 'Prevents duplicate points records for legacy users';
COMMENT ON INDEX idx_user_points_supabase_user_id IS 'Prevents duplicate points records for Supabase/Google users';

-- Success message
SELECT 'Migration 0011 completed successfully!' as message,
       'All duplicate records cleaned up and unique constraints enforced' as details;
