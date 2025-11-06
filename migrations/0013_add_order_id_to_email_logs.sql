-- Migration: Add order_id column to email_logs table
-- This allows email_logs to track both marketing campaign emails and order confirmation emails

-- Add order_id column to email_logs table
ALTER TABLE email_logs
ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE;

-- Make campaign_id nullable since order confirmation emails won't have a campaign
ALTER TABLE email_logs
ALTER COLUMN campaign_id DROP NOT NULL;

-- Create index for order_id lookups
CREATE INDEX IF NOT EXISTS idx_email_logs_order_id ON email_logs(order_id);

-- Add comment explaining the dual purpose
COMMENT ON COLUMN email_logs.order_id IS 'Foreign key to orders table for order confirmation emails';
COMMENT ON COLUMN email_logs.campaign_id IS 'Foreign key to email_campaigns table for marketing emails';
