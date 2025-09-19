# Claude Code Memory File - Pizza Spin Rewards

## Available CLI Tools
- **Supabase CLI** - Available for database management and authentication
- **GitHub CLI** - Available for repository and pull request management
- **Netlify CLI** - Available for deployment and function management

## Project Overview
Pizza rewards application with Google OAuth authentication using Supabase for user management.

## Recent Fixes
- Fixed Google user profile updates not saving (frontend wasn't sending firstName, lastName, email to API)
- Updated OAuth callback URLs to include localhost:8888

## Development Commands
- `npm run dev` - Starts client on port 5173
- Development server runs on http://localhost:5173

## Authentication
- Uses Supabase for Google OAuth authentication
- Has both legacy JWT and Supabase user support
- Google users identified by supabase_user_id field