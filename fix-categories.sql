-- Fix categories - create missing categories for the menu items
-- This will create all the categories that the menu items are referencing

-- First, let's see what categories exist
SELECT 'CURRENT CATEGORIES:' as info;
SELECT id, name, "order", is_active FROM categories ORDER BY "order";

-- Check what categories are referenced by menu items but don't exist as categories
SELECT 'MISSING CATEGORIES:' as info;
SELECT DISTINCT m.category
FROM menu_items m
LEFT JOIN categories c ON m.category = c.name
WHERE c.name IS NULL
ORDER BY m.category;

-- Create the missing categories
-- Get the next available order number
DO $$
DECLARE
    next_order_num integer;
BEGIN
    -- Get the next available order number
    SELECT COALESCE(MAX("order"), 0) + 1 INTO next_order_num FROM categories;

    -- Insert missing categories (only if they don't exist)
    INSERT INTO categories (name, "order", is_active, created_at, updated_at)
    SELECT DISTINCT
        m.category,
        next_order_num + ROW_NUMBER() OVER (ORDER BY m.category) - 1,
        true,
        NOW(),
        NOW()
    FROM menu_items m
    LEFT JOIN categories c ON m.category = c.name
    WHERE c.name IS NULL;

    -- Report what was created
    RAISE NOTICE 'Categories created successfully!';
END $$;

-- Show final result
SELECT 'FINAL CATEGORIES:' as info;
SELECT id, name, "order", is_active FROM categories ORDER BY "order";

SELECT 'MENU ITEMS BY CATEGORY:' as info;
SELECT c.name as category, COUNT(m.id) as item_count
FROM categories c
LEFT JOIN menu_items m ON c.name = m.category
GROUP BY c.name, c.id
ORDER BY c."order";

SELECT 'SUCCESS: All categories have been created!' as result;