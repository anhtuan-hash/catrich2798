# Teacher accounts Edge Function

This function securely creates username-based teacher accounts, resets temporary passwords, stores contact email, and clears the first-login password flag.

## One-time setup

1. Run `supabase/username_teacher_accounts.sql` in **Supabase Dashboard → SQL Editor**.
2. Deploy the function:

```bash
supabase functions deploy teacher-accounts
```

The hosted Supabase runtime automatically provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Do not expose the service-role key in Vercel or frontend variables.

## Security

- Every request must include a valid signed-in user's JWT.
- Bulk creation and password resets require `public.profiles.role = 'admin'` and `approved = true`.
- Teachers can only update their own contact email and first-login state.
- A maximum of 50 accounts can be created per request.
