# Image Upload Functionality Setup

## Overview
The image upload functionality has been implemented for menu item photo uploads with the following features:

- **Endpoint**: `/api/image-upload-test`
- **Method**: POST (multipart/form-data)
- **Authentication**: Admin/Staff required
- **Storage**: Supabase Storage (menu-images bucket)
- **Supported formats**: JPG, PNG, WebP, GIF
- **Max file size**: 10MB

## Setup Steps

### 1. Storage Bucket Setup
Before using the image upload functionality, you need to create the Supabase storage bucket:

```bash
# Call the setup endpoint (requires admin authentication)
curl -X POST http://localhost:8888/api/setup-storage \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

OR use the frontend with admin login and visit: `http://localhost:8888/api/setup-storage`

### 2. Environment Variables Required
Ensure these environment variables are set in `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Netlify Functions Configuration
The endpoint is configured in `netlify.toml` with:
- 512MB memory allocation
- 30 second timeout
- Proper redirect rule

## Usage

### Frontend Integration
The upload functionality is integrated into the `ImageUpload` component (`client/src/components/ui/image-upload.tsx`).

To use:
1. Login as admin/staff user
2. Navigate to menu item management
3. Use the image upload component
4. Select an image file (JPG, PNG, WebP, GIF)
5. File will be uploaded to Supabase Storage
6. Public URL will be returned and stored

### API Response Format
```json
{
  "success": true,
  "imageUrl": "https://your-project.supabase.co/storage/v1/object/public/menu-images/menu-item-123456-abc.jpg",
  "filename": "menu-item-123456-abc.jpg",
  "message": "Image uploaded successfully"
}
```

### Error Handling
- Authentication required (401)
- Admin privileges required (403)
- Invalid file type (400)
- File too large (400)
- Storage errors (500)

## Testing

### Manual Testing via Frontend
1. Start development server: `npm run dev`
2. Login as admin user
3. Navigate to menu management
4. Try uploading an image

### Manual Testing via curl
```bash
# Test upload (requires multipart form data)
curl -X POST http://localhost:8888/api/image-upload-test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "image=@/path/to/test-image.jpg"
```

## Security Features
- Admin/Staff authentication required
- File type validation (images only)
- File size limits (10MB max)
- Unique filename generation
- Secure file storage in Supabase

## File Storage Structure
Images are stored in Supabase Storage with the following naming convention:
```
menu-images/
  ├── menu-item-{timestamp}-{random}.jpg
  ├── menu-item-{timestamp}-{random}.png
  └── ...
```

## Troubleshooting

### Common Issues
1. **404 Error**: Ensure Netlify dev server is running and redirect rules are configured
2. **Authentication Error**: Verify admin login and token validity
3. **Storage Error**: Check Supabase configuration and bucket existence
4. **Upload Fails**: Check file size and format requirements

### Debug Logs
The endpoint provides detailed console logging for debugging:
- Authentication status
- File parsing details
- Upload progress
- Error details (in development mode)