# Brian English Studio V10.97.0

Digital teaching, resource, workflow, assessment, learning-intelligence and operational automation platform for English teachers.

## New in V10.96

- Automation Center at `#/automation-center`.
- Manual, event and in-app schedule triggers.
- Human approval gates for sensitive actions.
- Execution audit log and event simulator.
- Operational snapshots and Runtime Core diagnostics.
- Native event hooks from Resource Library, Work Hub and Learning Intelligence.
- Supabase tables with RLS plus local fallback.

## Install

```bash
npm ci
npm run verify:v10.96
npm run dev
```

## Supabase

Run:

1. `supabase/brian_v10_96_preflight.sql`
2. `supabase/brian_v10_96_automation_center.sql`
3. `supabase/brian_v10_96_verify.sql`

Schedules run while the website/PWA is open; V10.96 does not claim a 24/7 server scheduler.

Personal font files are intentionally not included in the distributable archive. Keep the existing files in `public/fonts/` when applying the update-only package.
