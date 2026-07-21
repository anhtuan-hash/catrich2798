# Brian English Studio V12.11.0 — Test Report

## Release

**Universal Command Center**

V12.11.0 replaces the legacy React command palette with a native UI Core command center. It searches the permission-filtered application registry, system pages, eight workspaces, and global actions.

## Implemented contracts

- Native `UICommandCenter` owned by UI Core.
- Five scopes: All, Apps, Pages, Workspaces, Actions.
- Query prefixes: `>` actions, `@` workspaces, `/` pages, `#` apps.
- Permission, role, app-visibility, and hidden-app filtering.
- Workspace resume destinations from account-scoped session memory.
- Activity Center actions for notifications, work, sync, history, and AI.
- AI, current-page analysis, theme, language, font size, launcher, and settings actions.
- Per-account recent searches and pinned commands.
- Same-tab and cross-tab state propagation.
- Keyboard controls: Command/Ctrl+K, Command/Ctrl+Shift+K, `/`, arrows, Enter, Escape.
- Responsive two-pane desktop layout and single-pane mobile layout.
- Brian Unified, Material 3, and Apple adapter coverage.
- Legacy `src/components/GlobalCommandPalette.jsx` removed.

## Automated results

| Check | Result |
|---|---:|
| V12.11 structural verifier | 24/24 PASS |
| Command Center runtime tests | 15/15 PASS |
| Production build | PASS |
| Vite modules transformed | 314 |
| Smoke tests | 179/179 PASS |
| Department runtime — Admin | PASS |
| Department runtime — TTCM | PASS |
| Department runtime — Teacher | PASS |
| Performance budget | PASS |
| E2E contract checks | 5/5 PASS |
| Development server | PASS |
| Local HTTP response | 200 OK |

## Build note

The test environment does not contain the user's personal binary font. Vite therefore reports unresolved runtime font URLs. The project keeps the stable URLs `/public/bes-fonts/brian-personal-font.ttf` and `/public/fonts/personal-font.ttf`; preserve the existing font file when copying this source into the production repository.

## Search boundary

V12.11 searches registered applications, routes, workspaces, and system actions. It does **not** yet perform full-text indexing inside uploaded documents, Google Drive files, Supabase records, or lesson content.
