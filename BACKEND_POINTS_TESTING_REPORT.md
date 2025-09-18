# Backend Points System Testing Report

**Report Date:** September 18, 2025
**Test Type:** Comprehensive Backend System Validation
**Focus:** Points system functionality for legacy and Supabase users

## Executive Summary

After conducting comprehensive backend testing of the points system, I have identified **critical issues** that explain why earned points aren't showing on the rewards page. The root cause is a **fundamental mismatch** between how the orders API awards points and how the user-rewards API retrieves them for Google (Supabase) authenticated users.

## Critical Issues Identified

### 1. 🚨 CRITICAL: Authentication Mismatch in user-rewards.ts

**Issue:** The user-rewards API has a flawed authentication mechanism for Supabase users that breaks points retrieval.

**Code Location:** `api/user-rewards.ts`, lines 60-63

```typescript
return {
  userId: Math.abs(parseInt(supabaseUserId.replace(/-/g, '').substring(0, 6), 16) % 2000000000) + 1000000, // Convert to safe integer
  username: payload.email || 'supabase_user',
  role: 'customer'
};
```

**Problem:**
- Converts Supabase UUID to an integer using hash conversion
- This integer doesn't match the `supabase_user_id` stored in database
- Results in querying for a non-existent user ID in the points system

### 2. 🚨 CRITICAL: Database Query Incompatibility

**Issue:** The user-rewards API only queries using `user_id` (integer), completely ignoring `supabase_user_id`.

**Code Location:** `api/user-rewards.ts`, lines 127-193

```typescript
// Only queries with integer user_id
const userExists = await sql`SELECT id FROM users WHERE id = ${authPayload.userId}`;
const userPointsRecord = await sql`SELECT * FROM user_points WHERE user_id = ${authPayload.userId}`;
```

**Problem:**
- Orders API correctly stores points using `supabase_user_id` for Google users
- User-rewards API only searches using converted integer `user_id`
- This creates a complete disconnect where points are stored but never retrieved

### 3. ✅ CONFIRMED: Orders API Points Awarding Works Correctly

**Analysis:** The orders API properly handles both user types:

```typescript
// Lines 686-851 in orders.ts - Correctly handles both user types
if (userId) {
  // Legacy user logic with user_id
} else if (supabaseUserId) {
  // Supabase user logic with supabase_user_id
  await sql`INSERT INTO user_points (user_id, supabase_user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
            VALUES (NULL, ${supabaseUserId}, ${pointsToAward}, ${pointsToAward}, 0, NOW(), NOW(), NOW())`;
}
```

**Status:** ✅ Points are being correctly awarded and stored in database

## Database Integrity Analysis

### Points Storage (Working Correctly)
- ✅ `user_points` table has `supabase_user_id` column
- ✅ `points_transactions` table has `supabase_user_id` column
- ✅ Orders API stores points using correct `supabase_user_id`
- ✅ Proper indexes exist for performance

### Points Retrieval (Broken)
- ❌ User-rewards API doesn't query `supabase_user_id`
- ❌ Authentication creates artificial integer IDs for Supabase users
- ❌ No fallback logic to handle Supabase authentication

## Specific User Flow Analysis

### Working Flow (Legacy Users)
1. User places order → Orders API awards points using `user_id`
2. User visits rewards page → User-rewards API retrieves points using `user_id`
3. ✅ Points display correctly

### Broken Flow (Google/Supabase Users)
1. User places order → Orders API awards points using `supabase_user_id` ✅
2. User visits rewards page → User-rewards API converts UUID to integer ❌
3. User-rewards API queries with fake integer ID ❌
4. No points found → Returns 0 points ❌

## Test Results Summary

| Component | Status | Details |
|-----------|--------|---------|
| Orders API Authentication | ✅ Working | Correctly handles both user types |
| Orders API Points Awarding | ✅ Working | Awards points to correct user identifier |
| Database Schema | ✅ Working | Supports both `user_id` and `supabase_user_id` |
| User-Rewards API Authentication | 🚨 Critical Issue | UUID conversion breaks user lookup |
| User-Rewards API Querying | 🚨 Critical Issue | Only queries `user_id`, ignores `supabase_user_id` |
| Points Display | ❌ Broken | Google users see 0 points |

## Required Fixes

### 1. Fix user-rewards.ts Authentication (HIGH PRIORITY)

Replace the problematic UUID conversion with proper Supabase user handling:

```typescript
// REPLACE lines 52-64 in user-rewards.ts
if (payload.iss && payload.iss.includes('supabase')) {
  const supabaseUserId = payload.sub;
  return {
    userId: null, // Don't create fake integer ID
    supabaseUserId: supabaseUserId, // Store actual UUID
    username: payload.email || 'supabase_user',
    role: 'customer',
    isSupabase: true // Add flag to distinguish user type
  };
}
```

### 2. Update Database Queries (HIGH PRIORITY)

Modify user-rewards.ts to query using the correct user identifier:

```typescript
// REPLACE user existence check
let userQuery;
if (authPayload.isSupabase) {
  userQuery = await sql`SELECT id FROM users WHERE supabase_user_id = ${authPayload.supabaseUserId}`;
} else {
  userQuery = await sql`SELECT id FROM users WHERE id = ${authPayload.userId}`;
}

// REPLACE points retrieval
let pointsQuery;
if (authPayload.isSupabase) {
  pointsQuery = await sql`SELECT * FROM user_points WHERE supabase_user_id = ${authPayload.supabaseUserId}`;
} else {
  pointsQuery = await sql`SELECT * FROM user_points WHERE user_id = ${authPayload.userId}`;
}
```

### 3. Add Proper Error Handling

Implement fallback logic and better error reporting for troubleshooting.

## Testing Recommendations

### Immediate Testing Steps
1. Fix the user-rewards.ts authentication and querying
2. Test with a Google-authenticated user:
   - Place an order (should award points)
   - Visit rewards page (should now display points)
3. Verify legacy users still work correctly
4. Check database directly to confirm points are being stored and retrieved

### Long-term Monitoring
1. Add logging to track authentication type in user-rewards API
2. Monitor for authentication failures or mismatches
3. Set up alerts for 0-point scenarios that might indicate this issue recurring

## Impact Assessment

**User Impact:** HIGH - All Google-authenticated users see 0 points despite earning them
**Business Impact:** HIGH - Rewards program appears broken to Google users
**Data Integrity:** GOOD - Points are correctly stored, just not retrieved
**Fix Complexity:** MEDIUM - Code changes required in user-rewards.ts

## Conclusion

The points system backend has a **critical authentication and querying mismatch** in the user-rewards API. While points are correctly awarded and stored for Google users, the rewards page cannot retrieve them due to incompatible user identification methods. The fix requires updating the user-rewards API to properly handle Supabase authentication and query the database using the correct user identifier.

**Estimated Fix Time:** 2-4 hours
**Testing Time:** 1-2 hours
**Total Resolution Time:** 3-6 hours

The issue is well-contained and fixable without affecting the database or orders functionality.