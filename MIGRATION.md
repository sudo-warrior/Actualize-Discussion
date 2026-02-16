# Migration Guide: Replit → Supabase + Your Database

## What Changed

✅ **Authentication**: Replit Auth → Supabase Auth (Magic Link)
✅ **Session Management**: Server-side sessions → JWT tokens
✅ **Database**: Ready for Neon PostgreSQL or MongoDB

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your project URL and anon key from Settings → API
3. Enable Email Auth in Authentication → Providers

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Database - Choose ONE:
# Option A: Neon PostgreSQL (recommended - minimal changes)
DATABASE_URL=postgresql://user:pass@host.neon.tech/db

# Option B: MongoDB (requires additional changes)
# MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/db
```

### 3. Database Setup

#### Option A: Neon PostgreSQL (Recommended)

1. Create a Neon project at [neon.tech](https://neon.tech)
2. Copy the connection string to `DATABASE_URL`
3. Run migrations:
   ```bash
   npm run db:push
   ```

#### Option B: MongoDB

If you prefer MongoDB, additional changes needed:
- Replace Drizzle ORM with Mongoose
- Update `server/db.ts` and `server/storage.ts`
- Modify schema definitions

### 4. Update Supabase Auth Settings

In your Supabase dashboard:
1. Go to Authentication → URL Configuration
2. Set Site URL: `http://localhost:5000` (dev) or your production URL
3. Add Redirect URLs: `http://localhost:5000/**`

### 5. Run the Application

```bash
npm install
npm run dev
```

## Key Changes Made

### Server-Side
- ✅ Removed `server/replit_integrations/auth/`
- ✅ Created `server/auth.ts` with Supabase middleware
- ✅ Created `server/supabase.ts` for Supabase client
- ✅ Updated `server/routes.ts` to use new auth
- ✅ Removed session management dependencies

### Client-Side
- ✅ Created `client/src/lib/supabase.ts`
- ✅ Updated `client/src/hooks/use-auth.ts` to use Supabase
- ✅ Updated `client/src/lib/queryClient.ts` to send JWT tokens
- ✅ Created `client/src/pages/Login.tsx` for magic link auth
- ✅ Updated `client/src/App.tsx` with new routing

### Database
- ✅ Removed dependency on Replit's session table
- ✅ Ready to use any PostgreSQL (Neon) or MongoDB

## Authentication Flow

### Old (Replit)
1. User clicks "Sign In" → redirects to `/api/login`
2. Replit OAuth flow
3. Session stored in PostgreSQL
4. Cookie-based authentication

### New (Supabase)
1. User clicks "Sign In" → goes to `/login` page
2. User enters email → receives magic link
3. Clicks link → JWT token stored in browser
4. Token sent in `Authorization` header

## Testing

1. Start the dev server: `npm run dev`
2. Visit `http://localhost:5000`
3. Click "Sign In" → enter your email
4. Check email for magic link
5. Click link to authenticate

## Troubleshooting

### "Missing Supabase environment variables"
- Ensure `.env` has `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Ensure `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### "Unauthorized" errors
- Check that Supabase auth is properly configured
- Verify JWT token is being sent in requests
- Check browser console for auth errors

### Database connection issues
- Verify `DATABASE_URL` is correct
- Ensure database is accessible from your network
- Run `npm run db:push` to create tables

## Next Steps

1. **Production Deployment**: Update Supabase redirect URLs with production domain
2. **Email Templates**: Customize Supabase email templates in dashboard
3. **User Profiles**: Optionally sync Supabase users to your database
4. **Social Auth**: Add Google/GitHub OAuth in Supabase if needed

## Rollback

If you need to revert:
```bash
git checkout HEAD -- server/routes.ts server/index.ts client/src/
npm install
```
