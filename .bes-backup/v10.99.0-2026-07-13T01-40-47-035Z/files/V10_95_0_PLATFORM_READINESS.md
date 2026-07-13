# Brian English Studio V10.95.0 — Platform Readiness

## Scope

V10.95 completes the platform layer after Learning Intelligence:

- Installable Progressive Web App.
- Offline application shell and update lifecycle.
- Security-header and browser-runtime audit.
- Accessibility preferences applied across the entire site.
- Skip navigation and screen-reader announcements.
- Local Web Vitals monitoring.
- Production bundle performance budgets.

## Route

`#/platform-readiness`

The route is available through Apps, More navigation and Command Center. Access remains role-aware through the existing permission engine.

## PWA architecture

- `public/manifest.webmanifest`
- `public/sw.js`
- `public/offline.html`
- `public/pwa/*`
- `src/utils/pwa.js`
- `src/components/PwaUpdateBanner.jsx`

The service worker caches only same-origin static application assets. It explicitly ignores `/api/` requests and does not cache Supabase authentication or external API traffic.

## Accessibility layer

Preferences are stored in `bes-accessibility-v1095` and applied as document data attributes:

- High contrast.
- Reduced motion.
- Large touch targets.
- Readable system font.
- Underlined links.
- Enhanced keyboard focus.
- Screen-reader announcements.

The personal font remains the default and is replaced only when the user explicitly enables the readable-font option.

## Security readiness

V10.95 adds production response headers through `vercel.json`:

- HSTS.
- X-Content-Type-Options.
- Referrer-Policy.
- Permissions-Policy.
- X-Permitted-Cross-Domain-Policies.
- Content-Security-Policy-Report-Only.

CSP is report-only in this release to avoid breaking existing AI providers, embeds and connected resources before their real production traffic has been reviewed.

The Security Audit never exports API key or access-token values.

## Performance budgets

`npm run audit:budget` verifies:

- Largest non-PDF application JS chunk ≤ 900 KB.
- Total CSS ≤ 1.3 MB.
- Total JS ≤ 9 MB.
- Total dist assets ≤ 30 MB.

The CSS limit protects against regression from the current legacy baseline; future versions should reduce this baseline rather than increase it.

## Database

V10.95 requires no Supabase migration.
