-- Add new columns to rewards table for free item functionality
ALTER TABLE rewards
ADD COLUMN IF NOT EXISTS free_item_menu_id INTEGER,
ADD COLUMN IF NOT EXISTS free_item_category TEXT,
ADD COLUMN IF NOT EXISTS free_item_all_from_category BOOLEAN DEFAULT false;

-- Add foreign key constraint to menu_items table
ALTER TABLE rewards
ADD CONSTRAINT fk_rewards_menu_item
FOREIGN KEY (free_item_menu_id) REFERENCES menu_items(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_rewards_free_item_menu_id ON rewards(free_item_menu_id);
CREATE INDEX IF NOT EXISTS idx_rewards_free_item_category ON rewards(free_item_category);
