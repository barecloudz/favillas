# Local Development Setup Guide

## Quick Start

1. **Copy environment variables:**
   ```bash
   cp env.example .env
   ```

2. **Edit .env file with your database URL:**
   ```
   DATABASE_URL=your_actual_database_url_here
   NODE_ENV=development
   SESSION_SECRET=local-dev-secret-key
   ```

3. **Start the Express server:**
   ```bash
   npm run dev:api
   ```

4. **Test the API endpoints:**
   - Health check: http://localhost:5000/api/health
   - Database test: http://localhost:5000/api/db-test
   - Menu items: http://localhost:5000/api/menu-items
   - Admin login: POST http://localhost:5000/api/admin-login

## Available Scripts

- `npm run dev:api` - Start Express server with API endpoints
- `npm run dev:client` - Start Vite dev server for frontend
- `npm run dev:server` - Same as dev:api (alternative name)

## API Endpoints Available

### Core Testing Endpoints
- `GET /api/health` - Health check with database connectivity test
- `GET /api/db-test` - Comprehensive database test with sample data
- `GET /api/menu-items` - Get all menu items
- `POST /api/admin-login` - Simple admin login (admin/admin123456)

### Menu Management
- `GET /api/menu-items` - List all menu items
- `POST /api/menu-items` - Create new menu item
- `PUT /api/menu-items/:id` - Update menu item
- `DELETE /api/menu-items/:id` - Delete menu item

### Categories (already implemented)
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

## Troubleshooting

### Database Connection Issues
1. Verify your DATABASE_URL is correct
2. Test with: `curl http://localhost:5000/api/db-test`
3. Check the server logs for connection errors

### Port Conflicts
- The server runs on port 5000 by default
- If port 5000 is busy, modify `server/index.ts` line 113

### Missing Dependencies
- Run `npm install` to ensure all packages are installed
- Make sure you have Node.js 20+ installed

## Benefits Over Netlify CLI

✅ **Fast startup** - No 3-minute deployment wait
✅ **Instant testing** - Changes reflect immediately
✅ **Better debugging** - Full stack traces and logging
✅ **No CLI issues** - Bypasses Netlify CLI problems
✅ **Same API** - Compatible with your existing frontend code
