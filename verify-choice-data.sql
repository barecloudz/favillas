-- Verify choice data was inserted correctly

-- Check if tables exist
SELECT 'TABLES EXIST CHECK:' as info;
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('choice_groups', 'choice_items', 'category_choice_groups')
ORDER BY table_name;

-- Check choice_groups data
SELECT 'CHOICE_GROUPS DATA:' as info;
SELECT COUNT(*) as total_groups FROM choice_groups;
SELECT id, name, description, min_selections, max_selections, is_required FROM choice_groups ORDER BY id;

-- Check choice_items data
SELECT 'CHOICE_ITEMS DATA:' as info;
SELECT COUNT(*) as total_items FROM choice_items;
SELECT ci.id, cg.name as group_name, ci.name as item_name, ci.price, ci.is_default
FROM choice_items ci
JOIN choice_groups cg ON ci.choice_group_id = cg.id
ORDER BY cg.name, ci.name;

-- Check if any API errors might be happening
SELECT 'POTENTIAL ISSUES TO CHECK:' as info;
SELECT 'Make sure the APIs are working by testing:' as check1;
SELECT '1. GET /api/choice-groups' as test1;
SELECT '2. GET /api/choice-items' as test2;
SELECT '3. Check browser console for errors' as test3;