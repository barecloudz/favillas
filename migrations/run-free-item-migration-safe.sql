-- Safe migration that won't fail if already run
-- Add new columns to rewards table for free item functionality
ALTER TABLE rewards
ADD COLUMN IF NOT EXISTS free_item_menu_id INTEGER,
ADD COLUMN IF NOT EXISTS free_item_category TEXT,
ADD COLUMN IF NOT EXISTS free_item_all_from_category BOOLEAN DEFAULT false;

-- Add foreign key constraint (skip if already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_rewards_menu_item'
    ) THEN
        ALTER TABLE rewards
        ADD CONSTRAINT fk_rewards_menu_item
        FOREIGN KEY (free_item_menu_id) REFERENCES menu_items(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add indexes (skip if already exist)
CREATE INDEX IF NOT EXISTS idx_rewards_free_item_menu_id ON rewards(free_item_menu_id);
CREATE INDEX IF NOT EXISTS idx_rewards_free_item_category ON rewards(free_item_category);

-- Verify migration
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'rewards'
    AND column_name IN ('free_item_menu_id', 'free_item_category', 'free_item_all_from_category')
ORDER BY column_name;
