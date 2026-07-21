# V10.99.0 — Production Hardening & Core Cleanup

## Release objective

V10.99 stabilizes the production core before V11. It prioritizes security, maintainability, consistent permissions, reliable data operations and real browser testing over adding another large standalone application.

## A. Security hardening

### AI Gateway

`/api/ai` now requires a valid Supabase access token. The gateway verifies account approval and canonical role, applies per-minute and daily quotas, validates request size and supported modes, records usage/security events and assigns a request ID. Provider secrets remain server-side.

### Upload hardening

Google Drive uploads are limited to 20 MB, constrained to approved extensions and MIME types, checked against file signatures, rate-limited and audited.

### Spreadsheet hardening

The direct `xlsx` dependency has been removed. Excel imports use `read-excel-file` with explicit limits for file size, sheet count, rows, columns and cell text length.

## B. Legacy layer removal

The following external runtime patches are no longer loaded by `index.html`:

- Command Center V10.87 patch.
- AI chat layout patch.
- AI launcher slot patch.
- Platform Control patch.

Command search, AI, music, sync and operational health are coordinated inside React. The Unified Utility Rail prevents overlapping floating controls and opens only the requested utility.

## C. Design system cleanup

The former monolithic `src/index.css` is split into ordered legacy layers and a V10.99 stylesheet. This preserves the approved visual language while making future route-by-route cleanup possible without adding another global override sheet.

## D. Identity and permissions core

Runtime authorization uses four canonical roles:

- `admin`
- `department_head`
- `teacher`
- `student`

Legacy names are normalized only for migration compatibility. `system_roles` becomes the primary source of authorization. The Production Hardening page allows leaders to manage active system roles and view recent API security events.

## E. Reliable data operations

V10.99 adds server-side snapshot and restore operations:

- Server-side collection.
- Snapshot closure and checksum.
- Record counts.
- Dry-run restore.
- Transactional restore.
- Restore audit metadata.

The client first uses the V10.99 RPCs and retains a compatibility fallback during staged installation.

## F. Testing and release governance

The release includes:

- Static V10.99 checks.
- Production build.
- Performance budget.
- 179 smoke tests.
- Admin, TTCM and teacher runtime checks.
- E2E contract checks.
- Playwright projects for Chromium desktop, WebKit and mobile viewport.
- Release guard.

## Performance budget at release

- Largest application JS chunk: 480.3 KB / 900 KB.
- Total CSS: 1230.0 KB / 1300 KB.
- Total JavaScript: 5675.4 KB / 9216 KB.
- Total `dist`: 6905.4 KB / 30720 KB.

The CSS budget remains close to its limit. V11 should continue route-level CSS extraction rather than adding global overrides.

## Known test-environment limitation

The source, configuration and browser tests are included. In the packaging environment, local Chromium navigation was blocked by administrator policy (`ERR_BLOCKED_BY_ADMINISTRATOR`), and downloading another browser was unavailable. Therefore the real Playwright suite must be run on the user's Mac or against the deployed Vercel URL. Static E2E contracts, build and all non-browser checks passed.

## Supabase objects

V10.99 creates or upgrades:

- `system_roles`
- `api_security_events`
- `api_rate_limits`
- backup snapshot integrity fields
- canonical role helpers
- AI quota RPC
- server snapshot RPC
- transactional restore RPC
- schema registry entries for application/runtime/production hardening

The migration is safe to rerun and does not delete teaching data.
