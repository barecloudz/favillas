-- Migration: Add promo_code_id to orders table
-- Purpose: Track which promo code was used for each order
-- Date: 2025-10-21

-- Add promo_code_id column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = 'promo_code_id'
    ) THEN
        ALTER TABLE orders ADD COLUMN promo_code_id INTEGER REFERENCES promo_codes(id);

        -- Add comment to explain the column
        COMMENT ON COLUMN orders.promo_code_id IS 'Reference to promo_codes table for admin-created discount codes (different from user reward vouchers)';
    END IF;
END $$;

-- Add promo_code_discount column to track discount amount
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = 'promo_code_discount'
    ) THEN
        ALTER TABLE orders ADD COLUMN promo_code_discount DECIMAL(10, 2) DEFAULT 0;

        COMMENT ON COLUMN orders.promo_code_discount IS 'Discount amount applied from promo code';
    END IF;
END $$;
