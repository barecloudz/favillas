# Domain Migration Checklist

## Current Setup
- Currently using: `onboarding@resend.dev` (Resend test domain)
- This is temporary for testing only

## When You're Ready to Use Your Actual Domain

### 1. Verify Your Domain in Resend

1. Go to: https://resend.com/domains
2. Click "Add Domain"
3. Enter your domain (e.g., `favillaspizza.com`)
4. Add the DNS records Resend provides:
   - **SPF Record**: Add TXT record to DNS
   - **DKIM Record**: Add TXT record to DNS
   - **DMARC Record** (optional but recommended)

### 2. Wait for Verification
- DNS changes can take 24-48 hours to propagate
- Resend will show "Verified" when ready
- You can check status in Resend dashboard

### 3. Update Environment Variables

Once verified, update Netlify environment variables:

```bash
# Update the FROM email to use your domain
npx netlify env:set RESEND_FROM_EMAIL "noreply@yourdomain.com"

# Also update site URL if changing domains
npx netlify env:set SITE_URL "https://yourdomain.com"

# Update restaurant contact info
npx netlify env:set RESTAURANT_ADDRESS "Your Restaurant Address"
npx netlify env:set RESTAURANT_PHONE "(Your) Phone-Number"
```

### 4. Update Netlify Site Settings

1. Go to: https://app.netlify.com/sites/favillasnypizza/settings/domain
2. Add your custom domain
3. Configure DNS:
   - **If using Netlify DNS**: They'll handle it automatically
   - **If using external DNS**: Add A record pointing to Netlify's load balancer
4. Enable HTTPS (Netlify auto-provisions SSL)

### 5. Update Supabase Redirect URLs

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Update these URLs to use your new domain:
   - Site URL: `https://yourdomain.com`
   - Redirect URLs:
     - `https://yourdomain.com/auth/callback`
     - `https://yourdomain.com/email-confirmed`

### 6. Test Everything

After domain is live:
- [ ] Test email marketing campaigns
- [ ] Test order confirmation emails
- [ ] Test Google OAuth login
- [ ] Test email confirmation for new signups
- [ ] Verify all email links point to new domain

### 7. Update Email Templates (if needed)

Check these files for any hardcoded URLs:
- `email-templates/*.html`
- `api/admin-email-marketing.ts`
- `api/send-order-confirmation.ts`

Most templates use `process.env.SITE_URL` so they should update automatically.

## Testing Before Migration

Current test endpoint: `https://favillasnypizza.netlify.app/api/test-resend-email`

This will send a test email using whatever `RESEND_FROM_EMAIL` is configured.

## Rollback Plan

If issues occur:
1. Revert `RESEND_FROM_EMAIL` back to `onboarding@resend.dev`
2. Emails will work again (from test domain)
3. Fix domain verification issues
4. Try again

## DNS Records Reference

Example DNS records for email (replace with your actual values from Resend):

```
Type: TXT
Name: @
Value: v=spf1 include:resend.com ~all

Type: TXT
Name: resend._domainkey
Value: [DKIM key from Resend dashboard]

Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

## Current Status

✅ Resend API configured
✅ Test email working with `onboarding@resend.dev`
⏳ Waiting for custom domain verification
⏳ Database tables need to be created (see `email-marketing-setup.md`)
