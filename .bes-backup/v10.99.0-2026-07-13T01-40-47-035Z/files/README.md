# Brian English Studio V10.98.0

Digital teaching, resource, workflow, assessment, learning-intelligence, automation, collaboration and data-governance platform for English teachers.

## New in V10.98

- Collaboration Hub at `#/collaboration-hub`.
- Project spaces, member roles and threaded discussions.
- Supabase Realtime Presence.
- Content version history and non-destructive restore.
- Data Governance at `#/data-governance`.
- Audit events, permission overrides and selective snapshots.
- 30-day cloud trash and Resource Library soft deletion.
- Runtime Core 1.5.0.

## Install

```bash
npm ci
npm run verify:v10.98
npm run dev
```

## Supabase

Run in order:

1. `supabase/brian_v10_98_preflight.sql`
2. `supabase/brian_v10_98_collaboration_governance.sql`
3. `supabase/brian_v10_98_verify.sql`

Personal font files are intentionally not included in distributable archives. Keep the existing files in `public/fonts/` when using the update-only package.
