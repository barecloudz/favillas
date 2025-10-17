# Supabase Custom Email Template Setup

## 📧 Setting Up Your Custom Signup Confirmation Email

You have a custom email template at `email-templates/signup-confirmation.html` that needs to be uploaded to Supabase.

---

## 🔧 Steps to Add Custom Template:

### Step 1: Open Supabase Email Templates

1. Go to your **Supabase Dashboard**
2. Click **Authentication** in the left sidebar
3. Click **Email Templates** tab
4. Find **"Confirm signup"** in the list
5. Click **"Edit"** or the template name

---

### Step 2: Replace Template Content

Copy the HTML from `email-templates/signup-confirmation.html` and paste it into the template editor.

**Make sure the template includes these Supabase variables:**
- `{{ .ConfirmationURL }}` - The confirmation link
- `{{ .Token }}` - The OTP code
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email address

---

### Step 3: Update Template Variables

Your template uses these patterns - make sure they match Supabase's format:

**Current in file:**
```html
<a href="{{ .SiteURL }}/auth/confirm?token={{ .TokenHash }}&type=signup">
```

**Should be:**
```html
<a href="{{ .ConfirmationURL }}">
```

**Current in file:**
```html
<div class="otp-code">{{ .Token }}</div>
```

**This is correct!** ✅

---

### Step 4: Test Template

After saving:
1. Sign up with a new email address
2. Check your inbox for the styled email
3. Should see the custom Favillas branding

---

## ⚠️ Important: Template Variables Reference

Supabase provides these variables for the "Confirm signup" template:

| Variable | Description |
|----------|-------------|
| `{{ .ConfirmationURL }}` | Full confirmation link with token |
| `{{ .Token }}` | 6-digit OTP code |
| `{{ .TokenHash }}` | Hashed token (for custom links) |
| `{{ .SiteURL }}` | Your site URL from settings |
| `{{ .Email }}` | User's email address |

---

## 📝 Quick Copy/Paste Template

Here's your template updated for Supabase:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Favilla's NY Pizza</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #d73a31 0%, #c73128 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 40px 30px;
            text-align: center;
        }
        .welcome-message {
            font-size: 20px;
            color: #333;
            margin-bottom: 20px;
        }
        .description {
            font-size: 16px;
            color: #666;
            margin-bottom: 30px;
            line-height: 1.6;
        }
        .confirm-button {
            display: inline-block;
            background: linear-gradient(135deg, #d73a31 0%, #c73128 100%);
            color: white;
            text-decoration: none;
            padding: 15px 35px;
            border-radius: 50px;
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0;
            transition: transform 0.2s ease;
            box-shadow: 0 4px 15px rgba(215, 58, 49, 0.3);
        }
        .confirm-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(215, 58, 49, 0.4);
        }
        .otp-section {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            border-left: 4px solid #d73a31;
        }
        .otp-code {
            font-size: 24px;
            font-weight: bold;
            color: #d73a31;
            letter-spacing: 3px;
            margin: 10px 0;
        }
        .benefits {
            text-align: left;
            margin: 30px 0;
            background-color: #fff8f7;
            padding: 25px;
            border-radius: 8px;
        }
        .benefits h3 {
            color: #d73a31;
            margin-top: 0;
            font-size: 18px;
        }
        .benefits ul {
            margin: 15px 0;
            padding-left: 20px;
        }
        .benefits li {
            margin: 8px 0;
            color: #555;
        }
        .footer {
            background-color: #f8f8f8;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #eee;
        }
        .footer p {
            margin: 5px 0;
            color: #888;
            font-size: 14px;
        }
        .expire-notice {
            font-size: 14px;
            color: #999;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍕 Favilla's NY Pizza</h1>
            <p>Authentic New York Style Pizza</p>
        </div>

        <div class="content">
            <div class="welcome-message">
                Welcome! 🎉
            </div>

            <div class="description">
                Thanks for joining the Favilla's family! We're excited to serve you the most authentic New York style pizza.
                Please confirm your email address to activate your account and start earning reward points.
            </div>

            <a href="{{ .ConfirmationURL }}" class="confirm-button">
                ✅ Confirm My Email Address
            </a>

            <div class="otp-section">
                <p><strong>Or use this verification code:</strong></p>
                <div class="otp-code">{{ .Token }}</div>
                <p style="font-size: 14px; color: #666;">Enter this code in the app to verify your account</p>
            </div>

            <div class="benefits">
                <h3>🎁 What you get as a member:</h3>
                <ul>
                    <li>🍕 Earn 1 point for every $1 spent</li>
                    <li>🎂 Special birthday rewards and discounts</li>
                    <li>⚡ Faster checkout with saved preferences</li>
                    <li>📧 Exclusive offers and early access to new items</li>
                    <li>🍰 Free rewards when you reach point milestones</li>
                </ul>
            </div>

            <div class="expire-notice">
                This confirmation link will expire in 24 hours for security reasons.
            </div>
        </div>

        <div class="footer">
            <p>Favilla's NY Pizza</p>
            <p>📍 Your Restaurant Address</p>
            <p>📞 Your Phone Number</p>
            <p>{{ .SiteURL }}</p>
        </div>
    </div>
</body>
</html>
```

---

## ✅ After Setting Up:

1. **Save** the template in Supabase
2. **Sign up** with a new email
3. **Check inbox** - should see styled email
4. **Click confirmation link** or **enter OTP code**

---

## 🎯 This Will Fix:

- ✅ Custom branded signup emails
- ✅ Professional appearance
- ✅ OTP code display
- ✅ Clear call-to-action button
- ✅ Benefits list for new users

---

## 📌 Remember:

The template is in **Supabase** dashboard, not in your code deployment. Even if you update the HTML file in your repo, Supabase won't see the changes unless you copy/paste them into the dashboard.
