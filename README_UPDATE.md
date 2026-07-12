# Update to Brian English Studio V10.95.0

Base version: V10.94.x

## What is included

- Installable PWA and offline shell.
- Platform Readiness center.
- Security diagnostics and production response headers.
- Site-wide accessibility preferences.
- Skip-to-content navigation and screen-reader announcements.
- Local Web Vitals.
- Build-time performance budgets.

## Database

No Supabase SQL migration is required.

## Install from the update-only package

Run the installer from inside the Git repository:

```bash
INSTALLER=$(find ~/Downloads -type f -name "install-v10.95.0.mjs" | head -n 1)
node "$INSTALLER" "$PWD"
```

Then verify:

```bash
npm ci
npm run verify:v10.95
```

Commit and deploy only after all checks pass.

## First production test

After Vercel reports Ready:

1. Close old site tabs.
2. Open the site in a new tab.
3. Hard refresh once.
4. Open `#/platform-readiness`.
5. Confirm service-worker registration and security headers.
6. Test keyboard navigation and reduced motion.

The first service-worker-controlled load may require one reload after registration.
