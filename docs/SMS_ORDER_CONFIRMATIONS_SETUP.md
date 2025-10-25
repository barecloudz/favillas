# SMS Order Confirmations Setup Guide

## Overview
Send automatic SMS confirmations when customers place orders using Twilio.

## What's Been Created

### 1. **SMS Confirmation API** (`/api/sms/send-order-confirmation`)
- Sends order confirmation SMS via Twilio
- Checks user opt-out preferences
- Logs all SMS activity to database
- Gracefully handles failures (doesn't block order)
- Auto-formats phone numbers to E.164 format
- Keeps messages under 160 characters

### 2. **Database Tables** (`scripts/create-sms-tables.sql`)
- `sms_logs` - Track all SMS sent
- `sms_preferences` - User opt-in/opt-out settings
- `sms_campaigns` - Marketing campaigns (future)

### 3. **Updated SMS Types** (`api/sms/twilio-client.ts`)
- Added `ORDER_CONFIRMATION`, `ORDER_PREPARING`, `ORDER_DELIVERED` types

## Setup Instructions

### Step 1: Get Twilio Credentials

1. Sign up at https://www.twilio.com/
2. From the Twilio Console, get:
   - Account SID
   - Auth Token
   - Buy a phone number (or use trial number)

### Step 2: Add Environment Variables

Add these to your `.env` file and Netlify environment:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# SMS Settings
SMS_ENABLED=true
```

**In Netlify:**
1. Go to Site Settings > Environment Variables
2. Add each variable above
3. Redeploy your site

### Step 3: Create Database Tables

Run the SQL script to create the necessary tables:

```bash
# Connect to your database
psql $DATABASE_URL -f scripts/create-sms-tables.sql
```

Or manually run the SQL from `scripts/create-sms-tables.sql` in your database tool.

### Step 4: Install Twilio Package (Already Done)

The `twilio` package is already in your `package.json`:
```json
"twilio": "^4.x.x"
```

### Step 5: Integrate into Order Creation

In `api/orders.ts`, find the section where email confirmations are sent (around line 1817).

**Add SMS confirmation right after email:**

```typescript
// Around line 1817 in api/orders.ts
// Send order confirmation email
const customerEmail = orderData.email || authPayload?.email;
const customerName = orderData.customerName || ...;
const customerPhone = orderData.phone || ''; // Phone already available

if (customerEmail) {
  try {
    // ... existing email code ...

    // ✅ ADD THIS: Send SMS confirmation
    if (customerPhone) {
      try {
        const smsOrderData = {
          orderId: newOrder.id.toString(),
          customerPhone: customerPhone,
          customerName: customerName,
          orderTotal: finalOrderData.total,
          orderType: orderData.orderType || 'pickup',
          estimatedTime: orderData.orderType === 'delivery' ? '45-60 min' : '20-30 min',
          userId: finalUserId,
          supabaseUserId: finalSupabaseUserId
        };

        const smsResponse = await fetch('/api/sms/send-order-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(smsOrderData)
        });

        if (smsResponse.ok) {
          console.log('✅ Orders API: Order confirmation SMS sent successfully');
        } else {
          console.error('❌ Orders API: Failed to send order confirmation SMS:', await smsResponse.text());
        }
      } catch (smsError) {
        console.error('❌ Orders API: Order confirmation SMS error:', smsError);
        // Don't fail the order if SMS fails
      }
    }
  } catch (emailError) {
    // ... existing email error handling ...
  }
}
```

### Step 6: Test SMS Confirmations

1. **Test Order Flow:**
   - Place a test order with your phone number
   - Check you receive: Email + SMS confirmation
   - Verify SMS appears in `sms_logs` table

2. **Test Opt-Out:**
   ```sql
   -- Opt-out a phone number
   INSERT INTO sms_preferences (phone_number, order_updates_enabled)
   VALUES ('+15551234567', false);

   -- Test order - should NOT receive SMS
   ```

3. **Check Logs:**
   ```sql
   -- View recent SMS
   SELECT * FROM sms_logs ORDER BY sent_at DESC LIMIT 10;

   -- Check SMS preferences
   SELECT * FROM sms_preferences;
   ```

## SMS Message Format

**Standard message (149 chars):**
```
Favilla's Pizza: Order #123 confirmed! Ready in 20-30 min. Total: $24.99 (pickup). Track your order at favillaspizzeria.com/orders
```

**Compact message (if needed, <160 chars):**
```
Favilla's: Order #123 confirmed! $24.99 (pickup). Track at favillaspizzeria.com
```

## Features

### ✅ What Works
- Automatic SMS on order placement
- User opt-out respect (checks `sms_preferences`)
- Phone number validation and formatting
- SMS logging for compliance
- Graceful error handling (doesn't block orders)
- Works with both Google OAuth and guest users

### 🔜 Future Enhancements
- SMS when order is ready for pickup
- SMS when driver is out for delivery
- SMS marketing campaigns (birthday, promotions)
- Admin dashboard for SMS analytics
- Two-way SMS (reply STOP to opt-out)

## Compliance (TCPA)

### Order Updates (Transactional)
- **Default:** Enabled for all customers with phone numbers
- **Opt-out:** Customers can disable in their profile
- **Legal:** Transactional messages allowed without explicit consent

### Marketing Messages (Promotional)
- **Default:** Disabled (must explicitly opt-in)
- **Opt-in:** Checkbox during registration or in profile
- **Legal:** Explicit consent required for promotional SMS

## Cost Estimate

### Twilio Pricing (US)
- **SMS:** $0.0079 per message
- **Phone Number:** $1.15/month

### Monthly Cost Example
- 100 orders/day × 30 days = 3,000 SMS
- 3,000 × $0.0079 = **$23.70/month**
- Plus $1.15 for phone number
- **Total: ~$25/month**

Very affordable for customer satisfaction! 📱

## Troubleshooting

### SMS Not Sending

1. **Check environment variables:**
   ```bash
   # In Netlify logs, look for:
   📱 SMS is disabled in environment variables
   # or
   ❌ Twilio configuration missing
   ```

2. **Verify Twilio credentials:**
   - Log into Twilio Console
   - Check Account SID and Auth Token are correct
   - Verify phone number is verified/purchased

3. **Check database logs:**
   ```sql
   SELECT * FROM sms_logs WHERE status = 'failed' ORDER BY sent_at DESC;
   ```

4. **Phone number format:**
   - Must be E.164 format: `+1234567890`
   - US numbers: 10 digits with +1 prefix
   - Auto-formatted by the API

### User Not Receiving SMS

1. **Check opt-out status:**
   ```sql
   SELECT * FROM sms_preferences WHERE phone_number = '+15551234567';
   ```

2. **Verify phone number:**
   - Make sure it's valid
   - Check it's not a landline (SMS won't work)

3. **Check Twilio logs:**
   - Go to Twilio Console > Messaging > Logs
   - Find the message by SID
   - Check delivery status

## Next Steps

After SMS order confirmations are working:

1. **Add SMS preferences to user profile page**
2. **Create "Order Ready" SMS notifications**
3. **Build SMS marketing campaigns admin interface**
4. **Add SMS analytics dashboard**
5. **Implement reply handling (STOP, HELP, etc.)**

## Testing Checklist

Before going live:

- [ ] Twilio credentials configured in Netlify
- [ ] Database tables created
- [ ] SMS code integrated into orders.ts
- [ ] Test order with your phone number
- [ ] Verify SMS received within 30 seconds
- [ ] Check sms_logs table populated
- [ ] Test with opt-out user (no SMS sent)
- [ ] Verify email still works if SMS fails
- [ ] Check message formatting looks good
- [ ] Test with guest checkout (no user ID)
- [ ] Test with authenticated user

---

## Support

**Twilio Support:** https://support.twilio.com
**Twilio Docs:** https://www.twilio.com/docs/sms

Your SMS order confirmation system is ready to go! 🚀📱
