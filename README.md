# Brian English Studio V10.95.0

Digital teaching, resource, workflow, assessment and learning-intelligence platform for English teachers.

## New in V10.95

- Installable Progressive Web App.
- Offline shell and safe service-worker updates.
- Platform Readiness center at `#/platform-readiness`.
- Security-header diagnostics.
- Site-wide accessibility preferences.
- Web Vitals and production performance budgets.

## Install

```bash
npm ci
npm run verify:v10.95
npm run dev
```

## Production build

```bash
npm run build
npm run audit:budget
```

No V10.95 Supabase migration is required. Existing V10.94 database objects remain unchanged.

Personal font files are intentionally not included in the distributable archive. Keep the existing files in `public/fonts/` when applying the update-only package.
