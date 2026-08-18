# Brian Metro Next — Real Permission Read Bridge

Branch: `ui-v2-shadow`

## Goal

Shadow UI must not invent a second authorization model. When an authenticated Brian user is available, Metro Next reads the existing V1 permission service and uses it to decide which V2 routes and bridged tools may be presented.

## Existing V1 authority reused

The V2 adapter lives at:

`src/ui/v2/realPermissions.js`

It delegates to the existing V1 helpers:

- `hasRouteAccess(user, route)`
- `hasToolAccess(user, toolSlug)`
- `summarizePermissions(user, language)`
- existing role normalization helpers

The profile permission payload, Supabase/RLS rules and the V1 tool/runtime checks remain authoritative. The V2 adapter is not a replacement backend security layer.

## Route mapping

Metro Next routes are mapped onto existing V1 route permission identifiers. Examples:

- `resources` → `resource-library`
- `homeroom`, `classes`, `students`, `reports` → `homeroom`
- `work-hub` → `work-hub`
- `knowledge-hub` → `knowledge-hub`
- `assessment` → `assessment-core`
- `collaboration` → `collaboration-hub`
- `admin` → `admin`

Tool routes such as `tool/<slug>` use `hasToolAccess()` directly.

## Real-user behavior

When `BrianV2DataProvider` resolves an authenticated user:

1. Sidebar navigation uses the real V1 permission adapter.
2. Command Palette filters out inaccessible routes and tools.
3. Direct restricted hashes render an Access Denied state.
4. Mobile navigation uses the same guard.
5. Profile UI reports `LIVE PERMISSIONS`.
6. The Shadow role simulator is disabled and cannot elevate or reduce the authenticated user's role.

UI Lab remains admin-only when the real permission adapter is active.

## Simulator fallback

When no authenticated user can be resolved, Shadow UI keeps the existing Teacher / TTCM / Admin simulator strictly for visual QA.

The simulator:

- is stored only in `brian-v2-preview-role`;
- does not write user profiles;
- does not alter Supabase roles or permissions;
- does not authorize V1 tools;
- must not ship as ordinary-user authorization logic.

## Security boundary

The V2 presentation guard exists to keep the new navigation and private preview consistent with current permissions. It must never be treated as the final enforcement layer for data mutations. V1 service checks, database RLS and tool-level authorization remain mandatory.

## Release requirements

Before Metro Next can become the default UI:

- route mappings must be regression-tested against representative Teacher, TTCM and Admin accounts;
- direct URL access must match sidebar/Command Palette behavior;
- write actions must continue to pass the existing backend permission checks;
- no feature flag may allow a user to bypass V1 security policy.
