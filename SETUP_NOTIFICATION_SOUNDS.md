# Custom Notification Sounds Setup

## Manual Steps Required in Supabase Dashboard

### 1. Create Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Set the following:
   - **Name**: `notification-sounds`
   - **Public bucket**: ✅ Yes (checked)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: `audio/*`
5. Click **Create bucket**

### 2. Run Database Migration

Run this SQL in the SQL Editor (Storage → SQL Editor):

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS custom_notification_sound_url TEXT;
```

Alternatively, you can run the migration function by deploying this code and then calling:
```bash
curl -X POST https://your-preview-site.netlify.app/.netlify/functions/run-migration
```

## How It Works

1. **Upload**: When an admin uploads a custom notification sound, it's uploaded to Supabase Storage in the `notification-sounds` bucket
2. **Storage**: The public URL is saved to the user's profile in the `custom_notification_sound_url` field
3. **Sync**: The sound URL is synced across all devices - when you log in on iPad, it fetches your saved sound from the database
4. **Delete**: When you remove a custom sound, it's deleted from both Storage and the database

## Features

- ✅ Upload custom audio files (MP3, WAV, OGG, etc.)
- ✅ Max file size: 5MB
- ✅ Synced across all devices
- ✅ Stored in Supabase Storage (not localStorage)
- ✅ Each user has their own custom sound
- ✅ Easy to remove/reset to default sounds
