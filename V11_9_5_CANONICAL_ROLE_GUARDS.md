# Brian English Studio v11.9.5 — Canonical Role Guards

This release consolidates legacy leader/admin authorization onto one identity-neutral database guard.

## Canonical rule

A user is treated as an application leader only when an authoritative database role marks the user as a leader-level role. The resolver checks:

- active `system_roles`; then
- approved `profiles` role data.

It does not grant access by matching a specific email address or profile UUID.

## Compatibility

The historical helper names used by RLS policies remain in place, but now delegate to `private.bes_is_app_leader(uuid)`:

- Question Bank / assessment leader guard
- Learning leader guard
- Automation leader guards
- Backup / collaboration leader guard
- Knowledge leader guard
- Resource Library leader guard
- THPT Practice manager guard
- Work Hub leader guard
- AI Governance admin/leader guard

The private canonical helper is not directly executable by anonymous or authenticated clients. Legacy public wrappers remain executable for authenticated users because existing RLS policies call them.

## Validation matrix

Production database validation before release:

- Admin role → all compatibility guards allow
- Department Head role → all compatibility guards allow
- Ordinary approved teacher → all compatibility guards deny
- hardcoded Admin email in active public/private function definitions → 0
- hardcoded former Supplemental manager email → 0
- hardcoded former Supplemental manager UUID → 0
