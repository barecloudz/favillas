# SMS Marketing Setup Guide

## Overview
SMS marketing integration for Favilla's NY Pizza using Twilio for promotional campaigns, order updates, and customer engagement.

## Required Environment Variables
```bash
# Twilio credentials (get from Twilio Console)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number

# SMS settings
SMS_ENABLED=true
SMS_FROM_NAME="Favilla's Pizza"
```

## Features to Implement

### 1. Order Status SMS Updates
- Order confirmed
- Preparation started
- Ready for pickup/Out for delivery
- Delivered/Completed

### 2. Promotional SMS Campaigns
- Weekly specials
- New menu items
- Birthday offers
- Loyalty program updates

### 3. Admin SMS Marketing Interface
Location: Admin Dashboard > SMS Marketing tab

**Campaign Management:**
- Create new campaigns
- Schedule messages
- Customer segmentation
- Delivery tracking
- Analytics dashboard

**Customer Management:**
- Opt-in/opt-out handling
- Phone number validation
- Message history
- Compliance tracking

### 4. Customer Preferences
- SMS opt-in during registration
- Preference management in profile
- Promotional vs transactional messages
- Frequency settings

## API Endpoints to Create

### `/api/sms/send-campaign`
Send promotional SMS to customer segments
```typescript
interface SMSCampaign {
  message: string;
  customerSegment: 'all' | 'loyal' | 'new' | 'birthday';
  scheduledTime?: string;
  campaignName: string;
}
```

### `/api/sms/send-order-update`
Send order status updates
```typescript
interface OrderSMS {
  orderId: string;
  customerPhone: string;
  status: 'confirmed' | 'preparing' | 'ready' | 'delivered';
  estimatedTime?: string;
}
```

### `/api/sms/manage-subscription`
Handle opt-in/opt-out requests
```typescript
interface SMSSubscription {
  phoneNumber: string;
  action: 'opt-in' | 'opt-out';
  userId?: string;
}
```

## Database Schema

### `sms_campaigns` table
```sql
CREATE TABLE sms_campaigns (
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
```

### `sms_logs` table
```sql
CREATE TABLE sms_logs (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(50) NOT NULL, -- 'promotional', 'order_update', 'system'
  twilio_sid VARCHAR(100),
  status VARCHAR(20) NOT NULL, -- 'sent', 'delivered', 'failed', 'undelivered'
  order_id INTEGER REFERENCES orders(id),
  campaign_id INTEGER REFERENCES sms_campaigns(id),
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  error_message TEXT
);
```

### `sms_preferences` table
```sql
CREATE TABLE sms_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  phone_number VARCHAR(20) NOT NULL,
  promotional_enabled BOOLEAN DEFAULT true,
  order_updates_enabled BOOLEAN DEFAULT true,
  opted_in_at TIMESTAMP DEFAULT NOW(),
  opted_out_at TIMESTAMP,
  last_message_at TIMESTAMP,
  total_messages_sent INTEGER DEFAULT 0
);
```

## Compliance & Best Practices

### Legal Requirements
- ✅ Explicit opt-in required
- ✅ Easy opt-out (reply STOP)
- ✅ Clear sender identification
- ✅ Message frequency disclosure
- ✅ Customer data protection

### Message Guidelines
- ✅ Keep under 160 characters when possible
- ✅ Include business name
- ✅ Provide clear value
- ✅ Respect timing (9 AM - 9 PM)
- ✅ Avoid spam keywords

### Rate Limiting
- ✅ Max 1 promotional message per day per customer
- ✅ No promotional messages to opted-out users
- ✅ Respect carrier limits and guidelines

## Implementation Priority

1. **Phase 1: Order Updates**
   - Basic order status SMS
   - Customer phone validation
   - Opt-out handling

2. **Phase 2: Promotional Campaigns**
   - Admin interface for campaigns
   - Customer segmentation
   - Scheduled sending

3. **Phase 3: Advanced Features**
   - A/B testing
   - Analytics dashboard
   - Automated triggers
   - Integration with loyalty program

## Testing Checklist

### Before Launch
- [ ] Test opt-in/opt-out flow
- [ ] Verify message delivery
- [ ] Check compliance features
- [ ] Test rate limiting
- [ ] Validate phone numbers
- [ ] Test emergency stop functionality

### Message Types to Test
- [ ] Order confirmation
- [ ] Preparation started
- [ ] Ready for pickup
- [ ] Out for delivery
- [ ] Delivered
- [ ] Weekly specials
- [ ] Birthday offers

## Notes for Future Implementation

**When you regain Twilio access:**
1. Set up Twilio account and get credentials
2. Add environment variables to Netlify
3. Create the SMS API endpoints
4. Add SMS preferences to user profile
5. Implement admin SMS marketing interface
6. Test with small customer group first
7. Launch with promotional campaign

**Integration Points:**
- User registration (opt-in checkbox)
- Profile page (SMS preferences)
- Order confirmation (automatic SMS)
- Admin dashboard (marketing campaigns)
- Checkout process (phone number collection)

This foundation will make SMS implementation smooth when Twilio access is restored!