# Google Sign-In Troubleshooting Guide

## Current Status
✅ Google button is rendering successfully  
✅ CSP issues mostly resolved  
❌ Google authentication failing with 403 Forbidden  

## Issues to Check

### 1. Google Cloud Console Configuration

**Check your OAuth 2.0 Client ID settings:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth client: `195346900975-jtncf56nht40kp3ik9oncc4fkm6b46hd`

**Verify these settings:**

**Authorized JavaScript origins:**
```
https://favillasnypizza.netlify.app
http://localhost:3000
http://localhost:5173
http://localhost:8888
```

**Authorized redirect URIs:**
```
https://favillasnypizza.netlify.app/api/auth/google/callback
http://localhost:3000/api/auth/google/callback
http://localhost:5173/api/auth/google/callback
http://localhost:8888/api/auth/google/callback
```

### 2. OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Make sure it's configured with:
   - **User Type**: External (if you want anyone to sign in)
   - **App name**: Favilla's NY Pizza
   - **User support email**: Your email
   - **Developer contact**: Your email
   - **Scopes**: `profile`, `email`, `openid`

### 3. Domain Verification

If you're in production mode:
1. Go to **OAuth consent screen**
2. Add your domain: `favillasnypizza.netlify.app`
3. Verify domain ownership if required

### 4. Test URLs

**Test these URLs to verify configuration:**

1. **Google OAuth Test**: 
   ```
   https://accounts.google.com/o/oauth2/auth?client_id=195346900975-jtncf56nht40kp3ik9oncc4fkm6b46hd.apps.googleusercontent.com&redirect_uri=https://favillasnypizza.netlify.app/api/auth/google/callback&scope=profile email&response_type=code
   ```

2. **Your callback endpoint**:
   ```
   https://favillasnypizza.netlify.app/api/auth/google/callback
   ```

### 5. Common Issues

**403 Forbidden usually means:**
- Domain not in authorized origins
- Redirect URI doesn't match exactly
- OAuth consent screen not configured
- App not published (if using external user type)

**Token Failed usually means:**
- Client ID/Secret mismatch
- Invalid redirect URI
- Scope issues

## Next Steps

1. **Verify Google Cloud Console settings** match exactly
2. **Test the OAuth flow** manually using the test URL above
3. **Check OAuth consent screen** configuration
4. **Ensure domain is verified** if required

## Debug Commands

Run these in browser console to debug:

```javascript
// Check if Google is loaded
console.log('gapi:', typeof gapi);
console.log('gapi.auth2:', typeof gapi?.auth2);

// Check meta tag
const meta = document.querySelector('meta[name="google-signin-client_id"]');
console.log('Client ID:', meta?.getAttribute('content'));

// Check buttons
const buttons = document.querySelectorAll('.g-signin2');
console.log('Google buttons:', buttons.length);
```
