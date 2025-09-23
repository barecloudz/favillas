# Supabase CLI Setup Instructions

## Method 1: Direct Download (Recommended for Windows)

1. **Download the latest release:**
   - Go to: https://github.com/supabase/cli/releases
   - Download `supabase_windows_amd64.zip`
   - Extract to a folder like `C:\supabase\`
   - Add `C:\supabase\` to your PATH environment variable

2. **Verify installation:**
   ```bash
   supabase --version
   ```

## Method 2: Using npx (Project-specific)

If you don't want to install globally, you can use npx:

```bash
npx supabase@latest --version
```

## Setup for Your Project

Once installed, set up Supabase CLI for your project:

1. **Login to Supabase:**
   ```bash
   supabase login
   ```

2. **Link your project:**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   (Get your project ref from your Supabase dashboard URL)

3. **Set up environment:**
   Create a `.env.local` file with:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   ```

## Key Commands I Can Use:

### Database Operations:
```bash
# Run SQL files
supabase db push

# Generate types
supabase gen types typescript --local > types/supabase.ts

# Run migrations
supabase migration up

# Reset database
supabase db reset

# Run SQL directly
supabase db query "SELECT * FROM delivery_zones"
```

### Migration Management:
```bash
# Create new migration
supabase migration new add_delivery_zones

# Apply migrations
supabase migration up

# Check migration status
supabase migration list
```

## Benefits for Future Development:

1. **Direct SQL execution** - I can run SQL commands directly
2. **Migration management** - Track database changes properly
3. **Type generation** - Auto-generate TypeScript types
4. **Database reset** - Easy rollback for testing
5. **Environment sync** - Keep local and production in sync

## Alternative: Use the Web Interface

If CLI setup is complex, you can also:
1. Give me your Supabase project details
2. I can provide SQL scripts to run in the web interface
3. We can manage everything through the dashboard

Let me know which approach you prefer!