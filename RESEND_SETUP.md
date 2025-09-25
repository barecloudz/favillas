# Resend Email Integration Setup

## Netlify Environment Variables

Add the following environment variables to your Netlify deployment:

### Required Variables:
```
RESEND_API_KEY=your_resend_api_key_here
SITE_URL=https://pizzaspinrewards.com
```

### How to Add Environment Variables in Netlify:

1. **Via Netlify Dashboard:**
   - Go to your site dashboard on Netlify
   - Click "Site configuration" > "Environment variables"
   - Click "Add a variable"
   - Add each variable with the name and value shown above

2. **Via Netlify CLI:**
   ```bash
   netlify env:set RESEND_API_KEY "your_resend_api_key_here"
   netlify env:set SITE_URL "https://pizzaspinrewards.com"
   ```

## Email Features Implemented

### 1. Order Confirmation Emails
- **Endpoint:** `/api/email/send-order-confirmation`
- **Triggers:** Automatically when orders are placed
- **Template:** Professional order summary with items, totals, delivery info

### 2. Marketing Campaigns
- **Endpoint:** `/api/email/send-campaign`
- **Access:** Admin Dashboard > Marketing > Email Campaigns
- **Features:**
  - Send to all marketing subscribers
  - Custom subject and content
  - Optional call-to-action buttons
  - Professional branded template

### 3. Email Confirmations (Future)
- **Supabase SMTP Integration:** Use Resend for auth emails
- **Removes:** 2 emails/hour limit from Supabase

## Domain Setup (Important!)

### Current Configuration:
- **From Address:** `Pizza Spin Rewards <noreply@pizzaspinrewards.com>`
- **Reply To:** `support@pizzaspinrewards.com`

### Required Actions:
1. **Verify your domain in Resend:**
   - Add your domain to Resend dashboard
   - Add required DNS records (DKIM, SPF, DMARC)

2. **Update email addresses if needed:**
   - Edit `api/email/resend-client.ts`
   - Change from/reply-to addresses to match your verified domain

## Testing

### Test Order Confirmation:
```javascript
fetch('/api/email/send-order-confirmation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerEmail: "test@example.com",
    customerName: "Test Customer",
    orderData: {
      orderNumber: "12345",
      items: [{ name: "Pepperoni Pizza", quantity: 1, price: 15.99 }],
      subtotal: 15.99,
      tax: 1.60,
      total: 17.59,
      deliveryAddress: "123 Main St",
      estimatedTime: "30-40 minutes",
      paymentMethod: "Credit Card"
    }
  })
})
```

### Test Marketing Campaign:
- Access Admin Dashboard
- Go to Marketing > Email Campaigns
- Create and send a test campaign

## Email Templates

- **Order Confirmations:** Professional layout with order details
- **Marketing Campaigns:** Branded template with CTAs and unsubscribe
- **Responsive Design:** Works on mobile and desktop
- **Professional Styling:** Pizza restaurant branding

## Benefits vs Supabase Default

✅ **Unlimited emails** (no 2/hour limit)
✅ **Better deliverability** with domain verification
✅ **Professional templates** instead of plain text
✅ **Email tracking** and analytics
✅ **Marketing campaigns** with proper unsubscribe
✅ **Scales with business growth**

## Next Steps

1. Add environment variables to Netlify
2. Verify domain in Resend dashboard
3. Test email functionality
4. Integrate order confirmation sending
5. Set up Supabase SMTP (optional - removes auth email limits)