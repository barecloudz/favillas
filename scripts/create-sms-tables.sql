-- SMS Logging and Preferences Tables
-- Run this SQL to set up SMS functionality

-- 1. SMS Campaigns table (for marketing campaigns)
CREATE TABLE IF NOT EXISTS sms_campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  customer_segment VARCHAR(50) NOT NULL,
  scheduled_time TIMESTAMP,
  sent_time TIMESTAMP,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'draft'
);

-- 2. SMS Logs table (track all SMS sent)
CREATE TABLE IF NOT EXISTS sms_logs (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(50) NOT NULL, -- 'order_confirmation', 'order_ready', 'promotional', etc.
  twilio_sid VARCHAR(100),
  status VARCHAR(20) NOT NULL, -- 'sent', 'delivered', 'failed', 'undelivered'
  order_id INTEGER REFERENCES orders(id),
  campaign_id INTEGER REFERENCES sms_campaigns(id),
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. SMS Preferences table (user opt-in/opt-out)
CREATE TABLE IF NOT EXISTS sms_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  supabase_user_id UUID,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  promotional_enabled BOOLEAN DEFAULT false, -- Must opt-in for marketing
  order_updates_enabled BOOLEAN DEFAULT true, -- Transactional messages enabled by default
  opted_in_at TIMESTAMP DEFAULT NOW(),
  opted_out_at TIMESTAMP,
  last_message_at TIMESTAMP,
  total_messages_sent INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON sms_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_logs_order_id ON sms_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_message_type ON sms_logs(message_type);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON sms_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_preferences_phone ON sms_preferences(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_preferences_user_id ON sms_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_status ON sms_campaigns(status);

-- Comments for documentation
COMMENT ON TABLE sms_logs IS 'Logs all SMS messages sent through Twilio';
COMMENT ON TABLE sms_preferences IS 'User preferences for SMS notifications (TCPA compliance)';
COMMENT ON TABLE sms_campaigns IS 'Marketing campaigns sent via SMS';

COMMENT ON COLUMN sms_preferences.promotional_enabled IS 'User must explicitly opt-in for marketing messages (TCPA requirement)';
COMMENT ON COLUMN sms_preferences.order_updates_enabled IS 'Transactional order updates, user can opt-out';
