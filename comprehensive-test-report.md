# Orders API 500 Error - Comprehensive Test Report

**Test Date:** September 16, 2025
**Endpoint:** `POST https://favillasnypizza.netlify.app/api/orders`
**Issue:** 500 Internal Server Error for Google authenticated users placing scheduled orders

## Executive Summary

✅ **Root Cause Identified:** Multiple database and authentication issues causing 500 errors for Google authenticated users.
✅ **Base System Health:** Guest orders work correctly (201 Created)
❌ **Google Authentication:** Multiple critical issues identified
❌ **Points System:** Database schema mismatch confirmed

## Detailed Test Results

### 1. Basic Connectivity and Guest Orders ✅
- **OPTIONS request:** ✅ 200 OK - CORS configured correctly
- **GET without auth:** ✅ 401 Unauthorized - Authentication working as expected
- **Guest ASAP orders:** ✅ 201 Created - Base functionality working
- **Guest scheduled orders:** ✅ 201 Created - Scheduling logic working
- **Invalid data validation:** ✅ 400 Bad Request - Input validation working

### 2. Authentication Issues ❌

#### Issue 1: JWT Token Validation
- **Status:** Mock tokens fail validation (expected)
- **Impact:** Falls back to guest orders or uses request body userId
- **Fix Required:** Test with real Google OAuth tokens

#### Issue 2: Foreign Key Constraint Violation
```sql
Error: insert or update on table "orders" violates foreign key constraint "orders_user_id_users_id_fk"
```
- **Cause:** When authentication fails, system tries to use `orderData.userId` from request body
- **Problem:** User ID doesn't exist in database
- **Code Location:** orders.ts line 191: `userId = authPayload ? authPayload.userId : orderData.userId || null;`

### 3. Critical Database Schema Issues ❌

#### Issue 3: user_points Table Schema Mismatch
**Location:** orders.ts lines 356-359
```sql
-- Code tries to insert:
INSERT INTO user_points (user_id, points_earned, points_redeemed, transaction_type, reference_id, description, created_at)

-- Actual table structure:
user_points: id, user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at
```

**Missing Columns:**
- `points_earned` ❌
- `points_redeemed` ❌
- `transaction_type` ❌
- `reference_id` ❌
- `description` ❌

**Correct Approach:** Use `points_transactions` table for transaction logging.

### 4. Google User Auto-Creation Logic Review ✅/❌

**Analysis of orders.ts lines 195-234:**
- ✅ Logic exists to check if authenticated user exists
- ✅ Creates user record if missing
- ✅ Handles race conditions with `ON CONFLICT DO NOTHING`
- ❌ **BUG:** Still uses incorrect user_points INSERT after user creation
- ❌ **BUG:** Falls back to guest on any user creation error

### 5. Points Awarding System Issues ❌

**Code Analysis (lines 350-366):**
```typescript
// Current broken code:
await sql`
  INSERT INTO user_points (user_id, points_earned, points_redeemed, transaction_type, reference_id, description, created_at)
  VALUES (${userId}, ${pointsToAward}, 0, 'earned', ${newOrder.id}, ${'Order #' + newOrder.id + ' - $' + newOrder.total}, NOW())
`;
```

**Should be:**
```typescript
// Fix 1: Use points_transactions table
await sql`
  INSERT INTO points_transactions (user_id, order_id, type, points, description, order_amount, created_at)
  VALUES (${userId}, ${newOrder.id}, 'earned', ${pointsToAward}, ${'Order #' + newOrder.id}, ${newOrder.total}, NOW())
`;

// Fix 2: Update user_points totals
await sql`
  INSERT INTO user_points (user_id, points, total_earned, last_earned_at, created_at, updated_at)
  VALUES (${userId}, ${pointsToAward}, ${pointsToAward}, NOW(), NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    points = user_points.points + ${pointsToAward},
    total_earned = user_points.total_earned + ${pointsToAward},
    last_earned_at = NOW(),
    updated_at = NOW()
`;
```

## Specific Error Scenarios

### Scenario 1: Valid Google User Places Order
1. User authenticates with Google OAuth ✅
2. JWT token sent with order request ✅
3. Token validation succeeds ✅
4. User exists check/creation ✅
5. Order creation succeeds ✅
6. **Points awarding FAILS** ❌ - Database schema mismatch
7. **Result:** 500 Internal Server Error

### Scenario 2: Google User Auto-Creation
1. New Google user places first order ✅
2. User doesn't exist in database ✅
3. Auto-creation logic runs ✅
4. User record created successfully ✅
5. Order creation succeeds ✅
6. **Points awarding FAILS** ❌ - Same schema issue
7. **Result:** 500 Internal Server Error

### Scenario 3: Authentication Failure Fallback
1. Invalid/expired JWT token ❌
2. Falls back to `orderData.userId` from request ❌
3. Foreign key constraint violation ❌
4. **Result:** 500 Internal Server Error

## Critical Fix Priorities

### 🔥 Priority 1: Fix user_points Database Schema Mismatch
```typescript
// In orders.ts, replace lines 356-359:
await sql`
  INSERT INTO points_transactions (user_id, order_id, type, points, description, order_amount, created_at)
  VALUES (${userId}, ${newOrder.id}, 'earned', ${pointsToAward}, ${'Order #' + newOrder.id}, ${newOrder.total}, NOW())
`;

// Also update user_points totals:
await sql`
  INSERT INTO user_points (user_id, points, total_earned, last_earned_at, created_at, updated_at)
  VALUES (${userId}, ${pointsToAward}, ${pointsToAward}, NOW(), NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    points = user_points.points + ${pointsToAward},
    total_earned = user_points.total_earned + ${pointsToAward},
    last_earned_at = NOW(),
    updated_at = NOW()
`;
```

### 🔥 Priority 2: Fix Authentication Fallback Logic
```typescript
// In orders.ts, fix line 191:
let userId = authPayload ? authPayload.userId : null; // Remove orderData.userId fallback
```

### 🔥 Priority 3: Improve Error Handling
```typescript
// Add better error handling around points awarding:
if (userId) {
  try {
    const pointsToAward = Math.floor(parseFloat(newOrder.total));
    console.log('🎁 Orders API: Awarding points to user:', userId, 'Points:', pointsToAward);

    // Use transaction for atomicity
    await sql.begin(async sql => {
      // Insert transaction record
      await sql`INSERT INTO points_transactions ...`;

      // Update user points totals
      await sql`INSERT INTO user_points ... ON CONFLICT ...`;
    });

    console.log('✅ Orders API: Points awarded successfully');
  } catch (pointsError) {
    console.error('❌ Orders API: Error awarding points:', pointsError);
    // Log but don't fail the order
  }
}
```

## Testing Recommendations

### Immediate Testing
1. **Fix the schema issue** and test with mock authenticated requests
2. **Verify points transactions** are logged correctly
3. **Test user auto-creation** flow end-to-end
4. **Test error handling** with various failure scenarios

### Google OAuth Integration Testing
1. Set up local development with real Google OAuth credentials
2. Test complete Google sign-in → order → points flow
3. Verify JWT token validation with real tokens
4. Test token expiration and refresh scenarios

### Database Testing
1. Verify all required tables exist and match schema
2. Test foreign key constraints with actual user data
3. Verify points transactions table is working correctly
4. Test concurrent user creation scenarios

## Monitoring Recommendations

### Server-Side Logging
- Add detailed logging for authentication flow
- Log all database constraint violations
- Monitor points awarding success/failure rates
- Track Google user auto-creation events

### Error Alerting
- Alert on 500 errors from orders endpoint
- Monitor database constraint violation patterns
- Track authentication failure rates
- Alert on points system failures

## Conclusion

The 500 Internal Server Error for Google authenticated users is caused by a **database schema mismatch in the points awarding system**. The orders API attempts to insert into the `user_points` table using columns that don't exist, causing the order creation to fail.

**Impact:** All Google authenticated users attempting to place orders will experience 500 errors.

**Resolution:** Update the points awarding code to use the correct database schema with the `points_transactions` table for logging and proper `user_points` table structure for totals.

**Timeline:** This is a critical production issue that should be fixed immediately to restore service for authenticated users.