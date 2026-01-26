# 406 Error Resolution Summary

## What Were The 406 Errors?

**Error Message**: `Failed to load resource: the server responded with a status of 406`

**URL Pattern**: `pnorzizesvihahfgvmdp.supabase.co/rest/v1/users?select=username&id=eq.[user-id]`

**Root Cause**: 
- The `users` table has RLS enabled but **NO policies for client-sideaccess**
- Client-side code (dashboard & history pages) was making direct Supabase queries
- Supabase REST API returned 406 (Not Acceptable) because RLS blocked the requests

---

## Why 406 Instead of 401/403?

When Supabase RLS blocks a request:
- **406 (Not Acceptable)** = The request format is fine, but RLS policies don't allow it
- **401 (Unauthorized)** = No authentication token
- **403 (Forbidden)** = Authenticated but explicitly denied

---

## How We Fixed It

### ✅ Dashboard Page (`app/dashboard/page.tsx`)
**Before**: 7 functions making direct Supabase calls  
**After**: All functions now call API endpoints

### ✅ History Page (`app/history/page.tsx`)
**Before**: 2 functions making direct Supabase calls (`fetchHistory`, `fetchProfile`)  
**After**: Both functions now call API endpoints

### ✅ API Routes Created
All API routes use `supabaseAdmin` (service role key) which:
- **Bypasses RLS completely**
- **Enforces security via NextAuth session checks**
- **Validates user ownership before operations**

---

## Why This Approach Works

**Before**:
```
Client → Supabase (anon key) → RLS Check → ❌ DENIED (406)
```

**After**:
```
Client → Next.js API (validates session) → Supabase (service role) → ✅ SUCCESS
```

---

## Security Model

| Layer | Responsibility |
|-------|---------------|
| **Client** | UI only, no direct DB access |
| **Next.js API** | Session validation, authorization logic |
| **Supabase (Service Role)** | Data access without RLS |
| **Database** | RLS still active, but bypassed by service role |

---

## Testing Checklist

After running the migration:

- [x] Dashboard loads without errors
- [x] Can add new questions
- [x] Can mark questions complete/skip
- [x] History page loads completed questions
- [x] Username displays correctly
- [x] No 406 errors in browser console

---

## Important Notes

> [!IMPORTANT]
> **All client-side pages now use API routes** - no direct Supabase access from the browser

> [!WARNING]
> **The `users` table still has RLS enabled with NO client policies** - this is intentional for security. Only server-side code (with service role key) can access it.

---

## What About Other Pages?

**Login page** (`app/login/page.tsx`):
- ✅ Uses `supabase.auth.getUser()` - this is auth API, not RLS-blocked
- ✅ Queries `user_approvals` table - has proper RLS policies from migration `003_user_approvals.sql`
- ✅ No changes needed

**Other API routes** (signup, forgot-password, etc.):
- ✅ Already use `supabaseAdmin` (service role)
- ✅ No RLS issues

---

✅ **All 406 errors are now resolved!**
