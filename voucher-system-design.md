# Proper Rewards Voucher System Design

## Current Problem
- User redeems points but gets nothing usable
- No vouchers/coupons created
- No way to apply discounts at checkout
- Points lost with no benefit

## Solution: Complete Voucher Flow

### 1. Database Schema (Need to Add)
```sql
CREATE TABLE user_vouchers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  supabase_user_id TEXT, -- For Google users
  reward_id INTEGER REFERENCES rewards(id),
  voucher_code TEXT UNIQUE, -- "SAVE5-ABC123"
  discount_amount DECIMAL(10,2),
  discount_type TEXT, -- "fixed" or "percentage"
  points_used INTEGER,
  status TEXT DEFAULT 'active', -- 'active', 'used', 'expired'
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days',
  applied_to_order_id INTEGER REFERENCES orders(id),
  created_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP
);
```

### 2. Redemption Flow (Fixed)
1. **User clicks "Redeem 50pts"**
2. **Check user has enough points**
3. **Deduct points from user balance**
4. **Create voucher record**:
   ```json
   {
     "voucher_code": "SAVE5-ABC123",
     "discount_amount": 5.00,
     "discount_type": "fixed",
     "status": "active",
     "expires_at": "30 days from now"
   }
   ```
5. **Show user: "You got a $5.00 off voucher!"**

### 3. Checkout Integration (Missing)
1. **Show available vouchers**: "You have 1 voucher: $5.00 off"
2. **User selects voucher**
3. **Apply discount to order total**
4. **Mark voucher as 'used' when order completes**

### 4. API Endpoints Needed
- `POST /api/rewards/{id}/redeem` ✅ (exists but broken)
- `GET /api/user/vouchers` ❌ (missing)
- `POST /api/vouchers/{code}/apply` ❌ (missing)
- `GET /api/user/redemptions` ✅ (exists but empty)

### 5. Frontend Integration (Missing)
- Voucher display in checkout
- Available vouchers in user profile
- Voucher application logic

## Immediate Action Plan
1. Fix authentication in redeem-points API
2. Add voucher creation to redemption process
3. Create voucher management endpoints
4. Add checkout voucher integration