# Brian English Studio V12.2.0 — Native Shell & Settings Migration

## Scope

This release migrates the global shell, primary navigation, workspace tab host, and Settings surface geometry to UI Core ownership.

## Architectural changes

- `UnifiedShellChrome` is now the single owner of the status/navigation/workspace chrome stack.
- Legacy `.bes-top-chrome` mounting was removed from `main.jsx`.
- Global navigation exposes semantic anatomy markers instead of relying only on historical class names.
- Settings uses a native `data-ui="settings-page"` contract with a 12-column responsive grid.
- Brian, Material 3, and Apple adapters now change the same shell and settings components rather than styling separate implementations.

## Compatibility

Feature logic, routes, permissions, Supabase, AI providers, workspace persistence, Home, Department, Homeroom, and individual app internals are unchanged. Historical CSS remains isolated for application internals while shell geometry is controlled by UI Core.

## Next migration

V12.3 should migrate Workbench application anatomy: app header, metrics, workflow navigation, workspace, inspector, and publish actions.
