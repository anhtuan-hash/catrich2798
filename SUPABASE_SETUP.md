# Supabase setup — Brian English Studio V10.99.0

## Required order

Open Supabase → SQL Editor and run each file in a separate query.

### 1. Preflight

```text
supabase/brian_v10_99_preflight.sql
```

This is read-only. Confirm the project contains the expected profile, audit and backup objects. Optional objects may be absent on older installations.

### 2. Migration

```text
supabase/brian_v10_99_production_hardening.sql
```

The migration is transactional and safe to rerun. It does not delete teaching content. It creates the canonical role system, API security/quota records and reliable snapshot/restore functions.

### 3. Verification

```text
supabase/brian_v10_99_verify.sql
```

Expected registry entries:

```text
application            10.99.0
runtime_core           1.6.0
production_hardening   10.99.0
```

The verification also confirms the V10.99 RPCs and reports the current user's canonical role.

## After migration

1. Sign out of Admin and teacher accounts.
2. Sign in again to refresh JWT/session context.
3. Open `#/production-hardening` as Admin/TTCM.
4. Verify the canonical role list and recent API security events.
5. Test one AI request and one permitted upload.
6. Create a snapshot, run restore dry-run, and only then test an actual restore on non-critical sample data.

## Environment variables

Keep existing Supabase public URL/key variables used by the frontend. Serverless APIs that use administrative operations require the existing server-side service-role configuration; never expose a service-role key to frontend variables or browser storage.
