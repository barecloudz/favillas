-- Debug why specialty gourmet pizzas aren't appearing despite matching category names

-- 1. Show the exact category name in categories table
SELECT 'SPECIALTY CATEGORY IN CATEGORIES TABLE:' as status;
SELECT id, name, is_active, "order"
FROM categories 
WHERE name ILIKE '%specialty%' 
   OR name ILIKE '%gourmet%';

-- 2. Show the exact category name in menu_items table  
SELECT 'SPECIALTY CATEGORY IN MENU_ITEMS TABLE:' as status;
SELECT DISTINCT category, COUNT(*) as item_count
FROM menu_items 
WHERE category ILIKE '%specialty%' 
   OR category ILIKE '%gourmet%'
GROUP BY category;

-- 3. Show if there's an exact match between tables
SELECT 'MATCHING CHECK:' as status;
SELECT 
  c.name as category_table_name,
  m.category as menu_items_category,
  COUNT(m.id) as item_count,
  CASE 
    WHEN c.name = m.category THEN 'EXACT_MATCH'
    ELSE 'NO_MATCH'
  END as match_status
FROM categories c
FULL OUTER JOIN menu_items m ON c.name = m.category
WHERE (c.name ILIKE '%specialty%' OR c.name ILIKE '%gourmet%')
   OR (m.category ILIKE '%specialty%' OR m.category ILIKE '%gourmet%')
GROUP BY c.name, m.category
ORDER BY match_status;

-- 4. Show specific items with specialty/gourmet categories
SELECT 'SPECIFIC SPECIALTY/GOURMET ITEMS:' as status;
SELECT id, name, category, base_price, is_available
FROM menu_items 
WHERE category ILIKE '%specialty%' 
   OR category ILIKE '%gourmet%'
ORDER BY category, name
LIMIT 10;

-- 5. Check if items might be inactive
SELECT 'INACTIVE SPECIALTY ITEMS:' as status;
SELECT id, name, category, is_available
FROM menu_items 
WHERE (category ILIKE '%specialty%' OR category ILIKE '%gourmet%')
  AND is_available = false;

-- 6. Show all categories and their item counts
SELECT 'ALL CATEGORIES WITH ITEM COUNTS:' as status;
SELECT 
  COALESCE(c.name, m.category) as category_name,
  c.is_active as category_active,
  COUNT(m.id) as item_count
FROM categories c
FULL OUTER JOIN menu_items m ON c.name = m.category
GROUP BY c.name, c.is_active, m.category
ORDER BY item_count DESC;
