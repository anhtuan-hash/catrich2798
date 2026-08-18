# Brian Metro Next — Permission-aware UI QA

Branch: `ui-v2-shadow`

## Scope

This layer is for Shadow UI behavior only. It is not an authorization system and must never be treated as a replacement for the existing Brian auth/permission services.

Preview roles:

- `teacher` — regular teacher UI state
- `leader` — TTCM/department-head UI state
- `admin` — full private-preview system state

## Current preview rules

Common teaching/manage/work routes are available to all three preview roles. `admin` and `ui-lab` are restricted to the `admin` preview role. Registered Tool Shell routes remain available to all preview roles until their production permission contracts are connected.

## Required UI behavior

1. Locked sidebar targets must not navigate when clicked.
2. Restricted targets must be absent from Command Palette results.
3. Manually entering a restricted hash must render Access Denied instead of the protected preview page.
4. Switching role must not mutate V1 auth, user records or backend permissions.
5. Preview role persists only in localStorage key `brian-v2-preview-role`.
6. Profile menu must state clearly that role switching is Shadow-only.
7. Admin/UI Lab actions must disappear from the profile flyout for non-admin preview roles.
8. Mobile primary navigation must remain usable in every role.
9. Tool runtime permissions remain enforced by the existing V1 tool itself while bridged.
10. Before release, this simulator must be replaced by a read-only adapter over the real permission service; no preview role selector may ship to ordinary users.

## Release integration rule

The final V2 shell may use permission information only to decide presentation and navigation. Every sensitive write/read action must continue to be checked by the existing backend/service authorization path.
