-- Migration: Add customer_name column to orders table
-- Purpose: Store customer name from Stripe billing details for guest orders
-- Date: 2025-10-21

-- Add customer_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = 'customer_name'
    ) THEN
        ALTER TABLE orders ADD COLUMN customer_name VARCHAR(255);

        -- Add comment to explain the column
        COMMENT ON COLUMN orders.customer_name IS 'Customer name from Stripe billing details (for guest orders) or user profile';
    END IF;
END $$;
