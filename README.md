# Brian English Studio V10.99.0

Production-hardened digital teaching platform for English teachers, department heads and learners.

## V10.99 focus

- Authenticated, quota-controlled AI Gateway.
- Canonical roles: `admin`, `department_head`, `teacher`, `student`.
- React-native utility rail, Command Center and operational diagnostics.
- Removal of external DOM-patching hotfix layers.
- Safer spreadsheet parsing and Google Drive uploads.
- Server-side snapshots with checksum, dry-run and transactional restore.
- Unified application/runtime version registry.
- Playwright browser test suite and release contracts.
- Consolidated current scripts; historical release scripts and notes are archived.

## Install locally

```bash
npm ci
npm run verify:v10.99
npm run dev
```

## Supabase

Run in order:

1. `supabase/brian_v10_99_preflight.sql`
2. `supabase/brian_v10_99_production_hardening.sql`
3. `supabase/brian_v10_99_verify.sql`

## Main administration route

```text
#/production-hardening
```

Personal font files are intentionally excluded from release archives. The update-only installer preserves the existing `public/fonts/` directory.
