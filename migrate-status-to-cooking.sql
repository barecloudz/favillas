-- Migration to change 'processing' status to 'cooking' in orders table
-- This updates the database to use more kitchen-appropriate terminology

-- Update existing orders with 'processing' status to 'cooking'
UPDATE orders
SET status = 'cooking'
WHERE status = 'processing';

-- If there are any constraints or checks on the status field, we may need to update them
-- Check current constraints (for reference)
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'orders'::regclass
    AND contype = 'c'  -- Check constraints
    AND pg_get_constraintdef(oid) LIKE '%status%';

-- Note: If there are check constraints limiting status values,
-- you may need to drop and recreate them to include 'cooking' instead of 'processing'

-- Example of updating a check constraint (adjust based on your actual constraint):
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
-- ALTER TABLE orders ADD CONSTRAINT orders_status_check
--     CHECK (status IN ('pending', 'cooking', 'completed', 'cancelled'));

-- Verify the update
SELECT status, COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY status;