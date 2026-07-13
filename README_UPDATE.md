# Brian English Studio V10.99.0 — Production Hardening & Core Cleanup

This update is designed for a repository running V10.98.x.

## What changes

- Secures `/api/ai` with Supabase authentication, role checks, quotas and audit events.
- Limits and validates Google Drive uploads.
- Replaces the direct `xlsx` dependency with a constrained spreadsheet reader.
- Removes external Command Center, AI chat, launcher and Platform Control DOM patches from `index.html`.
- Adds a React-native Unified Utility Rail.
- Canonicalizes system roles and removes email-based authorization from the runtime resolver.
- Adds server-side snapshot and transactional restore RPCs.
- Synchronizes application, runtime, service worker and release versions from one source.
- Adds Playwright test projects and production release checks.
- Archives obsolete scripts and release notes outside the active production root.

## Install

From the Git repository that currently deploys to Vercel:

```bash
node /path/to/install-v10.99.0.mjs "$PWD"
npm ci
npm run verify:v10.99
```

Then run the three V10.99 SQL files in Supabase SQL Editor.

After verification:

```bash
git add -A
git commit -m "Upgrade Brian English Studio to V10.99.0"
git push origin main
```

## Browser E2E

Run against local preview:

```bash
npm run build
npm run preview
npm run test:e2e:chromium
```

For serverless API tests, point the suite to the deployed Vercel URL:

```bash
BES_E2E_BASE_URL="https://your-domain.example" npm run test:e2e
```

## Rollback source

```bash
node /path/to/rollback-v10.99.0.mjs "$PWD"
```

Rollback restores source files from the installer backup. It does not delete V10.99 database tables or audit data.
