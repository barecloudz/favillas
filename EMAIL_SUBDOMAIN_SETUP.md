# Email Subdomain Setup: updates.favillaspizzeria.com

## Why Use a Subdomain for Email?

Using `updates.favillaspizzeria.com` instead of `favillaspizzeria.com` for sending emails is a **best practice** to:

✅ Protect your main domain's reputation
✅ Prevent marketing emails from affecting transactional email deliverability
✅ Isolate spam complaints to the subdomain
✅ Allow independent monitoring of email campaigns

**How it works:**
- Emails sent FROM: `noreply@updates.favillaspizzeria.com`
- Customers reply TO: `info@favillaspizzeria.com` (main domain)
- Your website stays on: `favillaspizzeria.com` (main domain)

---

## Setup Steps (15 minutes)

### Step 1: Create Subdomain DNS Record (2 minutes)

Since you're using **Netlify DNS**, add the subdomain:

**Option A: Via Netlify DNS Dashboard**
1. Go to Netlify → Domains → DNS settings for `favillaspizzeria.com`
2. Add a CNAME record:
   - **Name**: `updates`
   - **Value**: `favillaspizzeria.com`
   - **TTL**: 3600 (or leave default)

**Option B: Via Namecheap (if you want to manage there)**
1. Log in to Namecheap
2. Go to Domain List → Manage `favillaspizzeria.com`
3. Advanced DNS → Add New Record
4. Add a CNAME:
   - **Host**: `updates`
   - **Value**: `favillaspizzeria.com`
   - **TTL**: Automatic

**Note**: Since this is only for email (not hosting), you can skip this step and go straight to Resend verification. Resend will tell you what DNS records to add.

---

### Step 2: Verify Domain in Resend (10 minutes)

1. **Sign up for Resend** (if you haven't):
   - Go to https://resend.com
   - Create a free account (3,000 emails/month free)

2. **Add Your Domain**:
   - In Resend Dashboard → Click **"Domains"**
   - Click **"Add Domain"**
   - Enter: `updates.favillaspizzeria.com`
   - Click **"Add"**

3. **Add DNS Records**:

   Resend will show you 3 TXT records to add. Go to your DNS provider (Netlify or Namecheap) and add them:

   **SPF Record** (Sender Policy Framework):
   ```
   Type: TXT
   Name: updates.favillaspizzeria.com (or just "updates")
   Value: v=spf1 include:_spf.resend.com ~all
   ```

   **DKIM Record** (Domain Keys Identified Mail):
   ```
   Type: TXT
   Name: resend._domainkey.updates.favillaspizzeria.com
   Value: [Resend will provide this - it's a long string]
   ```

   **DMARC Record** (Domain-based Message Authentication):
   ```
   Type: TXT
   Name: _dmarc.updates.favillaspizzeria.com
   Value: v=DMARC1; p=none; rua=mailto:postmaster@favillaspizzeria.com
   ```

4. **Wait for Verification**:
   - DNS propagation takes 5-30 minutes
   - Resend will show a green checkmark when verified
   - You'll get an email confirmation

---

### Step 3: Get Resend API Key (2 minutes)

1. In Resend Dashboard → Click **"API Keys"**
2. Click **"Create API Key"**
3. Give it a name: "Pizza Spin Production"
4. Copy the key (starts with `re_...`)

---

### Step 4: Add API Key to Netlify (1 minute)

1. Go to Netlify Dashboard → Your site → Site Configuration → Environment Variables
2. Click **"Add a variable"**
3. Add:
   ```
   Key: RESEND_API_KEY
   Value: re_your_actual_api_key_here
   ```
4. Click **"Save"**

Netlify will automatically redeploy to pick up the new variable.

---

## What's Already Configured in Code ✅

- ✅ Email FROM address: `noreply@updates.favillaspizzeria.com`
- ✅ Email Reply-To: `info@favillaspizzeria.com`
- ✅ Resend client initialized
- ✅ Order confirmation email templates
- ✅ Marketing campaign templates
- ✅ Email tracking and logging

---

## Testing Your Email Setup

After setup is complete, test sending an email:

### Test Order Confirmation Email:

**Option 1: Place a test order**
1. Go to your website
2. Add items to cart
3. Complete checkout
4. Check your email inbox

**Option 2: Use Admin Dashboard**
1. Go to Admin Dashboard → Email Marketing
2. Click "Create Campaign"
3. Select "Test Mode"
4. Enter your email
5. Click "Send Campaign"
6. Check your inbox

---

## Troubleshooting

**Emails not sending?**
- Check Netlify function logs for errors
- Verify RESEND_API_KEY is set in Netlify
- Confirm domain is verified in Resend (green checkmark)

**Emails going to spam?**
- Wait 24-48 hours for DNS records to fully propagate
- Check all 3 DNS records (SPF, DKIM, DMARC) are correct
- Ask recipients to mark as "Not Spam"
- Build sending reputation slowly (don't send thousands at once)

**DNS records not verifying?**
- Wait longer (can take up to 24 hours)
- Double-check record values match exactly what Resend shows
- Make sure you're adding records to the correct domain/subdomain

---

## Email Deliverability Best Practices

1. **Warm up your domain**: Start by sending small batches
2. **Only email opted-in customers**: Respect the marketing_opt_in flag
3. **Include unsubscribe links**: Already built into templates
4. **Monitor bounce rates**: Check Resend dashboard
5. **Use clear "From" names**: "Favillas Pizzeria" instead of "noreply"

---

## Code Files Updated

- ✅ `api/email/resend-client.ts` - Email addresses configured
- ✅ `api/_shared/cors.ts` - Main domain added to allowed origins
- ✅ `migrations/0012_email_marketing_tables.sql` - Database tables ready

---

## Summary: What Happens

**Order Placed:**
1. Customer completes checkout
2. System calls `/api/email/send-order-confirmation`
3. Email sent from: `noreply@updates.favillaspizzeria.com`
4. Customer receives professional order confirmation
5. Customer can reply to: `info@favillaspizzeria.com`

**Marketing Campaign:**
1. Admin creates campaign in dashboard
2. System calls `/api/admin/email-marketing`
3. Emails sent from: `noreply@updates.favillaspizzeria.com`
4. Customers receive marketing email
5. Tracking records opens/clicks
6. Customers can unsubscribe or reply

---

## Next Steps

1. ✅ Deploy the code changes (already committed)
2. Add domain to Resend
3. Add DNS records
4. Wait for verification
5. Add API key to Netlify
6. Test sending an email
7. Monitor deliverability in Resend dashboard
