# Supabase Security Fixes

This document addresses the 48 security/performance issues identified in your Supabase dashboard.

## ✅ Fixes Provided via SQL Migrations

### 1. **Row Level Security (RLS) - 48 Tables**
**File**: `migrations/enable_rls_all_tables.sql`

**What it does:**
- Enables RLS on all 48 tables
- Sets up comprehensive security policies
- Public can read menu items, categories, hours, FAQs
- Users can only access their own orders, points, rewards
- Admin operations require service_role key
- All session/log data restricted to service_role

**How to apply:**
Run this SQL in Supabase SQL Editor or via migration tool.

**⚠️ IMPORTANT**:
- Your API uses the service_role key (bypasses RLS) ✅
- Frontend should use anon/authenticated keys
- Test thoroughly after applying to ensure APIs still work

---

### 2. **Function Security - `get_choice_item_price`**
**File**: `migrations/fix_function_security.sql`

**What it does:**
- Fixes the mutable search_path security issue
- Sets explicit `search_path = public, pg_temp`
- Prevents SQL injection via search_path manipulation

**How to apply:**
Run this SQL in Supabase SQL Editor.

---

## 🔧 Manual Fixes Required in Supabase Dashboard

### 3. **Email OTP Expiry > 1 Hour**

**Location**: Supabase Dashboard → Authentication → Email Auth

**Fix:**
1. Go to Authentication settings
2. Find "Email OTP Expiry" setting
3. Change from current value to **3600 seconds (1 hour)** or less
4. Recommended: **900 seconds (15 minutes)** for better security

**Why**: Shorter expiry reduces the window for OTP interception/reuse.

---

### 4. **HaveIBeenPwned Password Check Not Enabled**

**Location**: Supabase Dashboard → Authentication → Password

**Fix:**
1. Go to Authentication → Password settings
2. Enable "HaveIBeenPwned Integration"
3. This checks passwords against known breached databases

**Why**: Prevents users from using compromised passwords.

---

### 5. **Database Version Needs Update**

**Location**: Supabase Dashboard → Database → Settings

**Fix:**
1. Go to Database settings
2. Look for "Postgres Version" or "Database Upgrade" section
3. Upgrade from `supabase-postgres-17.4.1.069` to latest version
4. Follow Supabase's upgrade wizard

**Why**: Security patches and bug fixes.

**⚠️ WARNING**:
- Schedule this during low-traffic time
- Database will be briefly unavailable during upgrade
- Backup database first
- Test in staging if possible

---

## 📋 Implementation Checklist

- [ ] Run `migrations/enable_rls_all_tables.sql` in Supabase SQL Editor
- [ ] Run `migrations/fix_function_security.sql` in Supabase SQL Editor
- [ ] Test all API endpoints to ensure they still work with RLS enabled
- [ ] Test user login/registration flow
- [ ] Test order placement and viewing
- [ ] Set Email OTP expiry to 15 minutes in Auth settings
- [ ] Enable HaveIBeenPwned integration in Auth settings
- [ ] Schedule database upgrade during maintenance window

---

## 🧪 Testing After RLS Migration

### Test these key flows:

1. **Public Access** (no auth):
   - View menu items ✅
   - View categories ✅
   - View store hours ✅
   - View FAQs ✅

2. **Customer Access** (authenticated):
   - Place order ✅
   - View own orders ✅
   - View own points/rewards ✅
   - Cannot see other users' orders ❌

3. **Admin Access** (service_role via API):
   - Kitchen page shows all orders ✅
   - Can update order status ✅
   - Can manage menu items ✅
   - Can view system settings ✅

### Quick Test Query:
```sql
-- Should return menu items (public access)
SELECT * FROM menu_items WHERE is_available = true LIMIT 5;

-- Should fail or return nothing (no auth)
SELECT * FROM orders LIMIT 5;

-- Should work (service_role)
SELECT * FROM orders LIMIT 5;
```

---

## 🚨 Rollback Plan

If something breaks after enabling RLS:

```sql
-- Disable RLS on specific table (emergency)
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- Or disable all (not recommended)
-- Run for each table individually
```

Better approach: Keep the old service_role key working, test with new anon key first.

---

## 📊 Security Improvement Summary

| Issue | Severity | Status |
|-------|----------|--------|
| 48 tables without RLS | 🔴 Critical | ✅ SQL provided |
| Function search_path | 🟡 Medium | ✅ SQL provided |
| OTP expiry too long | 🟡 Medium | 📝 Manual fix |
| No password breach check | 🟡 Medium | 📝 Manual fix |
| Database needs patches | 🟠 High | 📝 Manual upgrade |

---

## Questions or Issues?

If you encounter issues after applying these fixes:
1. Check that your API is using the `service_role` key (it should be)
2. Verify the RLS policies match your business logic
3. Test incrementally - enable RLS on one table at a time if needed
