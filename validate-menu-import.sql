-- Validation script to check what the menu import will do
-- Run this BEFORE running the actual import script to see what will be added

-- Check existing categories
SELECT 'EXISTING CATEGORIES:' as info;
SELECT name, "order", is_active FROM categories ORDER BY "order";

-- Check existing menu items (sample)
SELECT 'EXISTING MENU ITEMS (sample):' as info;
SELECT name, category, base_price, is_available FROM menu_items LIMIT 20;

-- Count existing items by category
SELECT 'EXISTING ITEMS BY CATEGORY:' as info;
SELECT category, COUNT(*) as item_count
FROM menu_items
GROUP BY category
ORDER BY item_count DESC;

-- Create temp table to simulate the import
CREATE TEMP TABLE temp_validation_menu (
    name TEXT,
    description TEXT,
    base_price DECIMAL(10,2),
    category TEXT,
    is_available BOOLEAN
);

-- Insert the same data as the import script (abbreviated for validation)
INSERT INTO temp_validation_menu VALUES
-- Sample items from each category to validate
('Mozzarella Sticks Appetizer', '6 Mozzarella Sticks Served with homemade marinara.', 8.99, 'Appetizers', true),
('10" Traditional Pizza', '', 10.99, 'Traditional Pizza', true),
('Grandma Pie', 'Fresh Mozzarella Plump Tomato & Fresh Basil', 22.99, 'Grandmas Style Pizzas', true),
('10" House Special Pizza', 'Beef, pepperoni, sausage, bacon, mushrooms, onions & green peppers', 16.49, '10" Specialty Gourmet Pizzas', true),
('Garden Side Salad', 'Romaine, onions, olives & tomato', 4.45, 'Salads', true),
('Cheese Calzone', 'Ricotta, Romano & mozzarella blend baked in a garlic parmesan crust', 11.49, 'Calzones', true),
('Bottled Water', '', 1.59, 'Drinks', true),
('New York Style Cheesecake', '', 6.99, 'Desserts', true),
('10" Dough Ball', '', 3.00, 'Dough Balls', true);

-- Check which items would be NEW (don't exist yet)
SELECT 'ITEMS THAT WOULD BE ADDED:' as info;
SELECT t.name, t.category, t.base_price
FROM temp_validation_menu t
WHERE NOT EXISTS (
    SELECT 1 FROM menu_items m
    WHERE m.name = t.name
);

-- Check which items already exist (would be skipped)
SELECT 'ITEMS THAT ALREADY EXIST (would be skipped):' as info;
SELECT t.name, t.category, t.base_price
FROM temp_validation_menu t
WHERE EXISTS (
    SELECT 1 FROM menu_items m
    WHERE m.name = t.name
);

-- Check which categories would need to be created
SELECT 'NEW CATEGORIES THAT WOULD BE CREATED:' as info;
SELECT DISTINCT t.category
FROM temp_validation_menu t
WHERE NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.name = t.category
);

-- Clean up
DROP TABLE temp_validation_menu;

SELECT 'VALIDATION COMPLETE - Review results above before running the full import!' as final_message;