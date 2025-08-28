# Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a project name and set a database password
3. Wait for your project to be created

## 2. Get Your Database Connection String

1. In your Supabase dashboard, go to **Settings** → **Database**
2. Find the **Connection string** section
3. Copy the **URI** connection string
4. Replace `[YOUR-PASSWORD]` with your database password

## 3. Create Environment File

Create a `.env` file in the root directory with the following content:

```env
# Database Configuration (Supabase)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Session Secret (for authentication)
SESSION_SECRET="your-super-secret-session-key-change-this-in-production"

# Stripe Configuration (optional)
# STRIPE_SECRET_KEY="your_stripe_secret_key_here"

# Environment
NODE_ENV="development"
```

## 4. Set Up Database Schema

Run the following command to create the database tables:

```bash
npm run db:push
```

## 5. Start the Application

```bash
# Start the backend server
npm run dev:server

# In another terminal, start the frontend
npm run dev:client
```

## 6. Access the Application

- **Frontend**: http://localhost:5001 (or whatever port Vite assigns)
- **Admin Login**: 
  - Username: `admin`
  - Password: `password`

## 7. Production Deployment

When deploying to production:

1. Update `NODE_ENV="production"`
2. Use a strong `SESSION_SECRET`
3. Configure your hosting platform to use the same environment variables
4. Set up proper CORS and security headers

## Troubleshooting

- **Connection Error**: Make sure your Supabase database is active and the connection string is correct
- **Schema Error**: Run `npm run db:push` to create the database tables
- **Authentication Error**: Check that the `SESSION_SECRET` is set

