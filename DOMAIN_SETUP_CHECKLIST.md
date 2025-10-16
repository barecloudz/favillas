# Domain Setup Checklist: updates.favillaspizzeria.com

## Current Status
- ✅ Root domain `favillaspizzeria.com` already configured on Netlify
- ✅ CORS configuration updated in code
- ⏳ Subdomain `updates.favillaspizzeria.com` needs to be added

---

## Step 1: Add Subdomain in Netlify Dashboard (2 minutes)

Since Netlify CLI doesn't support adding domains, do this in the dashboard:

1. Go to: https://app.netlify.com/projects/pizzaspin
2. Click **"Domain management"** in the left sidebar
3. Click **"Add a domain alias"**
4. Enter: `updates.favillaspizzeria.com`
5. Click **"Verify"**
6. Netlify will automatically:
   - Create the DNS CNAME record (you're using Netlify DNS)
   - Provision SSL certificate (1-2 minutes)
   - Enable HTTPS

---

## Step 2: Update Google OAuth Settings (5 minutes)

Your app uses Google OAuth for login, so you need to add the new domain:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID (the one you're currently using)
3. Click **Edit**
4. Under **"Authorized redirect URIs"**, add:
   ```
   https://updates.favillaspizzeria.com/auth/callback
   ```
5. Under **"Authorized JavaScript origins"**, add:
   ```
   https://updates.favillaspizzeria.com
   ```
6. Click **"Save"**

---

## Step 3: Update Supabase Settings (3 minutes)

Your app uses Supabase for authentication:

1. Go to your Supabase project dashboard
2. Click **"Authentication"** → **"URL Configuration"**
3. Add to **"Site URL"**:
   ```
   https://updates.favillaspizzeria.com
   ```
4. Add to **"Redirect URLs"**:
   ```
   https://updates.favillaspizzeria.com/**
   https://updates.favillaspizzeria.com/auth/callback
   ```
5. Click **"Save"**

---

## Step 4: Update Resend Email Domain (Optional - for email marketing)

When you set up Resend, you'll want to verify the domain:

1. In Resend dashboard: https://resend.com/domains
2. Add domain: `favillaspizzeria.com` (root domain, not subdomain)
3. Add the DNS records Resend provides (SPF, DKIM, DMARC)
4. Wait for verification

**Note**: The email addresses in your code are already set to:
- From: `noreply@favillasnypizza.com`
- Reply-To: `info@favillasnypizza.com`

You may want to update these in `api/email/resend-client.ts` to match `favillaspizzeria.com`

---

## Step 5: Deploy the Code Changes

The CORS configuration has been updated. Deploy to production:

```bash
git push origin preview
```

Or merge preview → main if ready for production.

---

## Step 6: Test Everything (10 minutes)

Once the domain is added and SSL is provisioned:

1. **Visit the site**: https://updates.favillaspizzeria.com
   - Should load with SSL lock icon 🔒

2. **Test Google Login**:
   - Click "Sign In with Google"
   - Should redirect properly
   - Should log you in successfully

3. **Test Order Flow**:
   - Add items to cart
   - Go to checkout
   - Submit an order
   - Check if order confirmation appears

4. **Test Admin Dashboard**:
   - Log in as admin
   - Verify all features work
   - Check if APIs respond correctly

---

## Environment Variables Already Set

These should already be configured in Netlify:
- ✅ `DATABASE_URL`
- ✅ `GOOGLE_CLIENT_ID`
- ✅ `GOOGLE_CLIENT_SECRET`
- ✅ `STRIPE_SECRET_KEY`
- ✅ `VITE_STRIPE_PUBLIC_KEY`
- ✅ `SHIPDAY_API_KEY`

**Still Needed**:
- ⏳ `RESEND_API_KEY` (for email functionality)

---

## Code Files Updated

- ✅ `api/_shared/cors.ts` - Added `updates.favillaspizzeria.com` to allowed origins
- ✅ `api/email/resend-client.ts` - Email addresses set to `favillasnypizza.com`

---

## Quick Reference

**Current Domains**:
- Production: `https://favillaspizzeria.com` (root)
- Production: `https://updates.favillaspizzeria.com` (subdomain - being added)
- Preview: `https://preview--pizzaspin.netlify.app`
- Netlify default: `https://pizzaspin.netlify.app`

**Admin Panel**: `https://updates.favillaspizzeria.com/admin`

**DNS Provider**: Netlify DNS (nameservers already pointed from Namecheap)

---

## Troubleshooting

**If SSL doesn't provision**:
- Wait 5 minutes, Netlify can be slow
- Check domain is correctly pointed in DNS
- Try removing and re-adding the domain

**If Google OAuth fails**:
- Check you added the EXACT redirect URI
- Clear browser cookies and try again
- Check Google Cloud Console for error messages

**If CORS errors occur**:
- Make sure code is deployed (`git push`)
- Check browser console for the exact origin being rejected
- Verify the origin is in the CORS list

---

## Next Steps After Domain Works

1. Update marketing materials with new domain
2. Set up Resend for email notifications
3. Test email order confirmations
4. Test email marketing campaigns
5. Update social media links
6. Update Google My Business listing
