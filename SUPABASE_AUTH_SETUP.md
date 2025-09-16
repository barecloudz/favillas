# Supabase Auth Setup Guide

## Step 1: Install Supabase Client

Run this command in your terminal:
```bash
npm install @supabase/supabase-js
```

## Step 2: Configure Supabase Auth

### 2.1 Enable Google Provider in Supabase Dashboard

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **Providers**
4. Find **Google** and click **Enable**
5. Add your Google OAuth credentials:
   - **Client ID**: `195346900975-jtncf56nht40kp3ik9oncc4fkm6b46hd.apps.googleusercontent.com`
   - **Client Secret**: (get this from Google Cloud Console)

### 2.2 Configure Redirect URLs

In Supabase Dashboard → **Authentication** → **URL Configuration**:

**Site URL:**
```
https://favillasnypizza.netlify.app
```

**Redirect URLs:**
```
https://favillasnypizza.netlify.app/auth/callback
http://localhost:3000/auth/callback
```

## Step 3: Environment Variables

Add these to your Netlify environment variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 4: Update Google Cloud Console

Update your Google OAuth client redirect URIs to:

**Authorized redirect URIs:**
```
https://your-project-ref.supabase.co/auth/v1/callback
https://favillasnypizza.netlify.app/auth/callback
```

## Benefits of Supabase Auth

✅ **No CSP issues** - Supabase handles all the iframe complexity  
✅ **No custom OAuth code** - Supabase manages the entire flow  
✅ **Built-in user management** - User profiles, sessions, etc.  
✅ **Automatic token refresh** - No manual JWT handling  
✅ **Better security** - Supabase handles all security best practices  
✅ **Less code** - Much simpler implementation  

## Next Steps

1. Install Supabase client
2. Configure Supabase Auth with Google provider
3. Replace custom Google Sign-In with Supabase
4. Update authentication flow
5. Test the new implementation
