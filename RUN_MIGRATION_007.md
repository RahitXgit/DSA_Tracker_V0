# Running the Database Migration

## Step 1: Access Supabase Dashboard

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **SQL Editor** (in the left sidebar)

## Step 2: Run the Migration

1. Open the file: `supabase/migrations/007_daily_plans_table.sql`
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. Wait for "Success. No rows returned" message

## Step 3: Verify the Migration

Run this query in the SQL Editor:

```sql
-- Check if table exists with RLS enabled
SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables 
WHERE tablename = 'daily_plans';

-- List all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd AS operation
FROM pg_policies 
WHERE tablename = 'daily_plans'
ORDER BY policyname;
```

### Expected Results:

**Table Check:**
- `daily_plans` | true

**Policies Check:**
- 4 policies: `Users can view their own plans` (SELECT)
- `Users can insert their own plans` (INSERT)
- `Users can update their own plans` (UPDATE)
- `Users can delete their own plans` (DELETE)

## Step 4: Test Locally

After running the migration in Supabase:

1. The dev server should already be running (`npm run dev`)
2. Open http://localhost:3000/dashboard
3. Try adding a new question
4. Expected: ✅ Success! No RLS error

## Important Notes

> [!WARNING]
> **If you see "relation already exists" error**:
> - The table already exists in your database
> - The migration will still add missing indexes and RLS policies
> - This is safe and expected

> [!IMPORTANT]
> **Environment Variables Required in Vercel**:
> - Make sure `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel environment variables
> - This is required for the API routes to work in production

## Troubleshooting

**Error: "permission denied for table daily_plans"**
- Check that RLS policies were created
- Verify user is authenticated

**Error: "SUPABASE_SERVICE_ROLE_KEY is not defined"**
- Add the service role key to `.env.local` for local testing
- Add it to Vercel environment variables for production
