-- Check foreign key relationships for menu item ID 7

-- 1. Check if menu item 7 exists
SELECT 'MENU ITEM 7 EXISTS CHECK:' as info;
SELECT id, name, category, price FROM menu_items WHERE id = 7;

-- 2. Check order_items table for references to menu item 7
SELECT 'ORDER ITEMS REFERENCING MENU ITEM 7:' as info;
SELECT COUNT(*) as count FROM order_items WHERE menu_item_id = 7;
SELECT id, order_id, menu_item_id, quantity, price FROM order_items WHERE menu_item_id = 7 LIMIT 5;

-- 3. Check menu_item_choice_groups table for references to menu item 7
SELECT 'MENU ITEM CHOICE GROUPS REFERENCING MENU ITEM 7:' as info;
SELECT COUNT(*) as count FROM menu_item_choice_groups WHERE menu_item_id = 7;
SELECT id, menu_item_id, choice_group_id FROM menu_item_choice_groups WHERE menu_item_id = 7 LIMIT 5;

-- 4. Check for any other foreign key relationships
SELECT 'ALL FOREIGN KEY CONSTRAINTS REFERENCING MENU_ITEMS:' as info;
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS referenced_table_name,
    ccu.column_name AS referenced_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
WHERE
    tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'menu_items'
    AND ccu.column_name = 'id';

-- 5. Summary
SELECT 'SUMMARY FOR MENU ITEM 7:' as info;
SELECT
    (SELECT COUNT(*) FROM order_items WHERE menu_item_id = 7) as order_items_count,
    (SELECT COUNT(*) FROM menu_item_choice_groups WHERE menu_item_id = 7) as choice_groups_count;