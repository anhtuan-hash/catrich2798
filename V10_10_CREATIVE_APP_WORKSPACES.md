# V10.10 — Creative App Workspaces

This release redesigns the application screens opened from the app drawer so they match the Flat Creative Teaching OS homepage/app-directory style.

## Implemented

- Added a shared active app design profile on the root shell via CSS variables:
  - `--active-app-accent`
  - `--active-app-soft`
  - `--active-app-ink`
- Added `data-tool` on the root shell so each app workspace can receive its own visual identity.
- Reworked all app workspace routes with the same creative language:
  - warm paper-like backgrounds
  - thick rounded outlines
  - flat website-window cards
  - large editorial headings
  - compact pinned navigation
  - cleaner panel/card hierarchy
- Hid the old status strip, bottom progress indicator and floating music overlay on app workspaces to prevent visual obstruction.
- Kept app identities distinct:
  - Lesson Architect: terracotta/orange
  - Exam Studio: navy
  - WordGraph Studio: green
  - Reading Studio: mustard/yellow
  - Speaking Studio: cyan
  - TextCare Fixer: document red
  - Learner Sprint: sprint orange
  - Games: purple
  - Department Workspace: indigo
  - Library: green
  - Admin: red
- Improved responsive behavior for desktop, tablet and mobile.

## Verification

- `npm run build` completed successfully.
- `npm test` passed 22/22 smoke checks.

## Font note

The distributable package intentionally excludes local font binary files. Put your personal font back into `public/fonts` if you want the exact custom typography locally.
