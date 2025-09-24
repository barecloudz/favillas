-- Check and create choice tables for add-ons system

-- Check existing tables
SELECT 'EXISTING TABLES:' as info;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check if choice_groups table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'choice_groups') THEN
        RAISE NOTICE 'Creating choice_groups table...';

        CREATE TABLE choice_groups (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            min_selections INTEGER DEFAULT 0,
            max_selections INTEGER DEFAULT 1,
            is_required BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW()
        );

        RAISE NOTICE 'choice_groups table created successfully';
    ELSE
        RAISE NOTICE 'choice_groups table already exists';
    END IF;
END $$;

-- Check if choice_items table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'choice_items') THEN
        RAISE NOTICE 'Creating choice_items table...';

        CREATE TABLE choice_items (
            id SERIAL PRIMARY KEY,
            choice_group_id INTEGER NOT NULL REFERENCES choice_groups(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            price DECIMAL(10,2) DEFAULT 0.00,
            is_default BOOLEAN DEFAULT false,
            is_available BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW()
        );

        RAISE NOTICE 'choice_items table created successfully';
    ELSE
        RAISE NOTICE 'choice_items table already exists';
    END IF;
END $$;

-- Check if category_choice_groups table exists (for linking categories to choice groups)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'category_choice_groups') THEN
        RAISE NOTICE 'Creating category_choice_groups table...';

        CREATE TABLE category_choice_groups (
            id SERIAL PRIMARY KEY,
            category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
            choice_group_id INTEGER NOT NULL REFERENCES choice_groups(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(category_id, choice_group_id)
        );

        RAISE NOTICE 'category_choice_groups table created successfully';
    ELSE
        RAISE NOTICE 'category_choice_groups table already exists';
    END IF;
END $$;

-- Insert sample data to test the system
INSERT INTO choice_groups (name, description, min_selections, max_selections, is_required) VALUES
    ('Size', 'Choose your pizza size', 1, 1, true),
    ('Toppings', 'Add extra toppings', 0, 10, false),
    ('Drinks', 'Choose a drink', 0, 1, false)
ON CONFLICT (name) DO NOTHING;

-- Get the choice group IDs for sample data
DO $$
DECLARE
    size_group_id INTEGER;
    toppings_group_id INTEGER;
    drinks_group_id INTEGER;
BEGIN
    SELECT id INTO size_group_id FROM choice_groups WHERE name = 'Size';
    SELECT id INTO toppings_group_id FROM choice_groups WHERE name = 'Toppings';
    SELECT id INTO drinks_group_id FROM choice_groups WHERE name = 'Drinks';

    -- Insert sample choice items
    INSERT INTO choice_items (choice_group_id, name, price, is_default, is_available) VALUES
        (size_group_id, 'Small 10"', 0.00, true, true),
        (size_group_id, 'Medium 14"', 4.00, false, true),
        (size_group_id, 'Large 16"', 6.00, false, true),
        (toppings_group_id, 'Extra Cheese', 2.00, false, true),
        (toppings_group_id, 'Pepperoni', 2.50, false, true),
        (toppings_group_id, 'Mushrooms', 2.00, false, true),
        (toppings_group_id, 'Sausage', 2.50, false, true),
        (drinks_group_id, 'Coca Cola', 2.99, false, true),
        (drinks_group_id, 'Pepsi', 2.99, false, true),
        (drinks_group_id, 'Sprite', 2.99, false, true)
    ON CONFLICT DO NOTHING;
END $$;

-- Show final results
SELECT 'CHOICE GROUPS COUNT:' as info, COUNT(*) as count FROM choice_groups;
SELECT 'CHOICE ITEMS COUNT:' as info, COUNT(*) as count FROM choice_items;

SELECT 'CHOICE GROUPS:' as info;
SELECT id, name, description, min_selections, max_selections, is_required FROM choice_groups ORDER BY name;

SELECT 'CHOICE ITEMS BY GROUP:' as info;
SELECT
    cg.name as group_name,
    ci.name as item_name,
    ci.price,
    ci.is_default,
    ci.is_available
FROM choice_groups cg
JOIN choice_items ci ON cg.id = ci.choice_group_id
ORDER BY cg.name, ci.name;

SELECT 'SUCCESS: Choice tables created and populated!' as result;