# Admin Panel — Setup Guide

## Creating the first admin user

Supabase Auth is the source of truth for credentials; `admin_users` is the
authorization table. A login is accepted **only if** the user exists in
`admin_users`.

### 1. Create the user in Supabase Auth

In **Supabase Dashboard → Authentication → Users → Add user**:
- Email: `agency.bestsolutions@gmail.com` (or client email)
- Password: set a strong one
- Auto-confirm: **on** (no email verification needed)

Copy the resulting `user.id` (UUID).

### 2. Promote to admin

Run via Supabase SQL editor (or MCP):

```sql
insert into admin_users (user_id, role, display_name)
values ('<USER-UUID-HERE>', 'admin', 'BestSolutions');
```

Roles:
- `admin` — full access (CRUD everything, manage users)
- `editor` — content only (no settings, no user management)

### 3. Sign in

Go to `/admin/login`, enter email + password. You'll land on `/admin`.

## Adding more users later

Same flow. Once the admin panel has its "Users" page (Phase 5.13+),
this can be done from the UI instead of SQL.

## Forgot password

For now, reset via Supabase Dashboard → Users → ⋯ → Send password recovery.
Self-serve flow will land later.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "อีเมลหรือรหัสผ่านไม่ถูกต้อง" | Wrong creds, or user not in `auth.users` |
| "บัญชีนี้ไม่มีสิทธิ์เข้าถึงระบบจัดการ" | User exists in Auth but not in `admin_users` — run the SQL above |
| Redirect loop on `/admin/login` | Cookies blocked by browser / incognito strict mode |
| 500 on dashboard | Check Supabase project URL/anon key in `.env.local` |
