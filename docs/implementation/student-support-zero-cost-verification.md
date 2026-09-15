# Student Support Center — Zero-cost verification mode

Supabase development branch creation was explicitly declined because it costs $0.01344/hour.

Until production database deployment is explicitly approved:

- Keep PR #844 in Draft.
- Do not apply Student Support DDL to production.
- Validate JavaScript with unit tests and Vercel/GitHub CI.
- Keep SQL migrations committed for review, but treat database execution as unverified.
- Production database access is read-only for inspection/preflight only.
- Before production deployment, re-check exact production schema/functions, review RLS and SECURITY DEFINER grants, then apply migrations only with explicit approval.
