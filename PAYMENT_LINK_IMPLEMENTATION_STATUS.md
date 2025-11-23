# Payment Link System - Implementation Status

## ✅ What We've Accomplished

### 1. Business Hours Validation ✅
- **Created**: `api/check-store-status.ts`
  - Checks if store is currently open
  - Validates if within 30 minutes of closing (cutoff time)
  - Returns appropriate messages for customers
  - Uses EST timezone (America/New_York)

- **Updated**: `netlify/functions/vapi-submit-order.js`
  - Added automatic hours check before accepting orders
  - Rejects orders when store is closed or past cutoff
  - Returns friendly message to customer via VAPI

- **Updated**: `UPDATED_SYSTEM_MESSAGE.txt`
  - Added store hours section
  - Informed agent about 30-minute cutoff rule

### 2. Payment Link System (Already Built in Previous Session) ✅
- **Created**: `api/generate-payment-link.ts` - Generates secure 64-character tokens
- **Created**: `api/sms/send-payment-link.ts` - Sends SMS via Twilio
- **Created**: `api/get-order-by-token.ts` - Fetches order by token, validates expiration
- **Created**: `client/src/pages/pay-page.tsx` - Payment page UI
- **Updated**: `client/src/App.tsx` - Added `/pay/:token` route

### 3. Payment Preference Flow (Already Built in Previous Session) ✅
- **Updated**: `netlify/functions/vapi-submit-order.js`
  - Handles `payment_preference` parameter
  - Pickup: customer chooses "payment_link" or "pay_at_store"
  - Delivery: always uses "payment_link"
  - Sends payment link SMS for payment_link orders

- **Updated**: `UPDATED_SYSTEM_MESSAGE.txt`
  - Added payment preference conversation flow
  - Pickup: agent asks customer preference
  - Delivery: agent informs payment link required

- **Created**: `submit-order-tool-preview.json`
  - Updated tool schema with payment_preference field (enum)

### 4. Kitchen Display Filtering (Already Built in Previous Session) ✅
- **Updated**: `api/kitchen-orders.ts`
  - Filters out `pending_payment_link` orders (hidden until paid)
  - Shows `unpaid` orders immediately (pay-at-store with NOT PAID badge)

### 5. Database Schema (Already Built in Previous Session) ✅
- **Updated**: `shared/schema.ts`
  - Added `paymentToken` field
  - Added `paymentTokenExpires` field
  - Added `orderSource` field (web, phone, pos)

### 6. Automatic Cleanup (Already Built in Previous Session) ✅
- **Created**: `api/cleanup-unpaid-orders.ts`
  - Scheduled function runs hourly
  - Deletes `pending_payment_link` orders older than 24 hours

- **Updated**: `netlify.toml`
  - Configured `@hourly` schedule for cleanup function

---

## 🔧 What You Need To Do

### 1. Run Database Migration ⚠️
**File**: `migrations/add-payment-tokens.sql`

**What it does**:
```sql
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_token TEXT,
ADD COLUMN IF NOT EXISTS payment_token_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'web';

CREATE INDEX IF NOT EXISTS idx_orders_payment_token ON orders(payment_token);
CREATE INDEX IF NOT EXISTS idx_orders_order_source ON orders(order_source);
```

**Is it safe?** ✅ YES - Here's why:
- Uses `IF NOT EXISTS` - won't break if columns already exist
- Adds new columns with defaults - won't affect existing data
- `order_source` defaults to 'web' - all existing orders will be marked as web orders
- Creates indexes only if they don't exist
- Does NOT modify or delete any existing data
- Does NOT change any existing columns

**How to run**:
```bash
# Option 1: Using psql directly
psql $DATABASE_URL -f migrations/add-payment-tokens.sql

# Option 2: Using node with postgres library (if you have a script)
node scripts/run-migration.js migrations/add-payment-tokens.sql
```

### 2. Update VAPI Assistant Configuration
You need to update your VAPI assistant with:

**A. New System Message**
- File: `UPDATED_SYSTEM_MESSAGE.txt` (in phoneagent-favilla folder)
- Upload this to VAPI dashboard as the assistant's system message
- Includes store hours and payment preference flow

**B. Updated Tool Schema**
- File: `submit-order-tool-preview.json` (in phoneagent-favilla folder)
- Update the `submit_order` tool in VAPI dashboard
- Added `payment_preference` field (required enum: "payment_link" or "pay_at_store")

**C. Tool URL (if not already set)**
- Point to: `https://preview--pizzaspin.netlify.app/.netlify/functions/vapi-submit-order`
- Or production URL when ready

### 3. Deploy to Netlify
All code changes are ready, you just need to:
```bash
git add .
git commit -m "Add payment link system and business hours validation"
git push
```

Netlify will automatically:
- Deploy all API endpoints
- Set up the scheduled cleanup function
- Make the payment page available at `/pay/:token`

---

## 🔄 How It Works (Full Flow)

### Pickup Order - Pay at Store
1. Customer calls → VAPI agent takes order
2. Agent checks store hours (rejects if closed/past cutoff)
3. Agent asks: "Text you a payment link, or pay when you pick up?"
4. Customer chooses "pay at store"
5. Webhook submits order with `paymentStatus: 'unpaid'`, `orderSource: 'phone'`
6. Order appears in kitchen immediately with "NOT PAID" badge
7. Customer pays cash/card when picking up

### Pickup Order - Payment Link
1. Customer calls → VAPI agent takes order
2. Agent checks store hours (rejects if closed/past cutoff)
3. Agent asks: "Text you a payment link, or pay when you pick up?"
4. Customer chooses "payment link"
5. Webhook submits order with `paymentStatus: 'pending_payment_link'`
6. Order is HIDDEN from kitchen (not visible yet)
7. System generates secure token → texts payment link
8. Customer clicks link → redirects to `/pay/:token` → checkout page
9. Customer completes payment via Stripe
10. Order status changes to `paid` → NOW appears in kitchen
11. Kitchen starts preparing order

### Delivery Order - Payment Link (Required)
1. Customer calls → VAPI agent takes order
2. Agent checks store hours (rejects if closed/past cutoff)
3. Agent says: "Delivery must be paid in advance. I'll text you a payment link."
4. Webhook submits order with `paymentStatus: 'pending_payment_link'`
5. Same flow as pickup payment link (hidden until paid)

### Cleanup
- Every hour, scheduled function runs
- Deletes orders with `pending_payment_link` status older than 24 hours
- Prevents database clutter from abandoned orders

---

## 🧪 Testing Checklist

After deploying, test these scenarios:

### Business Hours
- [ ] Call during open hours → order should go through
- [ ] Call 29 minutes before close → order should go through
- [ ] Call 31 minutes before close → should be rejected with hours message
- [ ] Call when closed → should be rejected with hours message

### Payment Preferences
- [ ] Pickup + pay at store → appears in kitchen with NOT PAID badge
- [ ] Pickup + payment link → hidden until paid, then appears
- [ ] Delivery → always requires payment link

### Payment Link
- [ ] SMS received with correct link
- [ ] Link opens payment page
- [ ] After payment, order appears in kitchen
- [ ] Expired link (24+ hours) shows error message
- [ ] Already-paid link shows "already paid" message

### Cleanup
- [ ] Create test order with payment link, don't pay
- [ ] Wait 24+ hours
- [ ] Verify order is automatically deleted

---

## 📋 Summary of Changed Files

### New Files Created (This Session)
- `api/check-store-status.ts` - Business hours validation

### Modified Files (This Session)
- `netlify/functions/vapi-submit-order.js` - Added hours check
- `UPDATED_SYSTEM_MESSAGE.txt` - Added store hours section

### Files Already Created (Previous Session)
- `api/generate-payment-link.ts`
- `api/sms/send-payment-link.ts`
- `api/get-order-by-token.ts`
- `api/cleanup-unpaid-orders.ts`
- `client/src/pages/pay-page.tsx`
- `migrations/add-payment-tokens.sql`

### Files Already Modified (Previous Session)
- `netlify/functions/vapi-submit-order.js` - Payment preference logic
- `api/kitchen-orders.ts` - Filter pending_payment_link orders
- `client/src/App.tsx` - Added /pay/:token route
- `shared/schema.ts` - Added payment fields
- `netlify.toml` - Scheduled function config
- `UPDATED_SYSTEM_MESSAGE.txt` - Payment preference flow
- `submit-order-tool-preview.json` - Added payment_preference field

---

## ⚠️ Important Notes

1. **Web App Not Affected**: All changes are isolated to phone orders. Web orders continue to work exactly as before.

2. **Migration Safety**: The migration uses `IF NOT EXISTS` and won't break anything. It only adds new fields.

3. **Backward Compatibility**: All new fields have defaults, so existing code continues to work.

4. **Preview Branch**: All code is on the preview branch. Test thoroughly before merging to production.

5. **Environment Variables Required**:
   - `TWILIO_ACCOUNT_SID` - For SMS
   - `TWILIO_AUTH_TOKEN` - For SMS
   - `TWILIO_PHONE_NUMBER` - For SMS
   - `DATABASE_URL` - For all database operations

6. **VAPI Configuration**: Don't forget to update both the system message AND tool schema in VAPI dashboard.

---

## 🎯 Next Steps (In Order)

1. ✅ Run migration: `migrations/add-payment-tokens.sql`
2. ✅ Deploy to Netlify (git push)
3. ✅ Update VAPI assistant system message
4. ✅ Update VAPI submit_order tool schema
5. ✅ Test all scenarios (see testing checklist above)
6. ✅ Monitor logs for any issues
7. ✅ When satisfied, merge preview → production
