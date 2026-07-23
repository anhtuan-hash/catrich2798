# Brian Premium UI Blueprint

## Direction

Brian English Studio is rebuilt as one calm, premium workspace rather than a collection of unrelated visual layers. The design language follows the approved concept: warm neutral surfaces, deep green brand accents, clear editorial typography, restrained depth and spacious layouts.

## Non-negotiable architecture

- Keep one native Brian React application.
- Preserve routes, authentication, permissions, Supabase, app visibility and launcher preferences.
- Do not use iframe or duplicate login surfaces.
- Do not restore legacy stacked navigation bars.
- New pages use shared tokens instead of hard-coded page palettes.
- Dedicated applications may keep workflow-specific layouts, but their surfaces, controls, spacing and typography inherit from the same UI Core.

## UI Core

### Tokens

Source: `src/styles/brian-premium-tokens.css`

- Background: `--bp-bg`
- Surface: `--bp-surface`
- Soft surface: `--bp-surface-soft`
- Primary green: `--bp-primary`
- Secondary green: `--bp-primary-2`
- Text: `--bp-ink`, `--bp-ink-2`, `--bp-muted`
- Radius scale: 8 / 12 / 16 / 22 / 30 / round
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64
- Shadow scale: xs / sm / md / lg

### Global shell

Source: `src/components/GlobalFlatNavigation.jsx` and `.css`

- Floating rounded header within a 1440px container.
- Brand zone on the left.
- Primary navigation centered.
- Search, notifications, app launcher and account controls on the right.
- Launcher opens as a centered grouped popover.
- Notification and account panels align to the right edge of the shell.
- Tablet condenses labels; mobile uses a bottom sheet.

### Homepage

Source: `src/pages/Home.jsx` and `HomePremium.css`

- Editorial hero with two-line headline and a restrained visual scene.
- Primary and secondary calls to action.
- Curated five-card application row.
- Workspace overview metrics.
- Existing role-aware Work Dashboard remains available below the new homepage surface.

## Migration sequence

1. **Foundation** — tokens, shell, homepage and notification contract.
2. **Directory** — rebuild the Apps page using the same card anatomy and spacing.
3. **Shared surfaces** — forms, tables, empty states, toolbars and dialogs.
4. **Management workspaces** — Dashboard, Work Hub, Homeroom and Professional Hub.
5. **Teaching applications** — Lesson Architect, Reading Studio, Exam Studio and retained utilities.
6. **Final polish** — dark mode, motion, responsive screenshots and accessibility review.

## Acceptance gates

Each migration phase must satisfy:

- Node 22 production build succeeds.
- No horizontal page overflow at 390px, 768px, 1280px and 1440px.
- Keyboard focus remains visible.
- Popovers close with Escape and restore focus.
- Route permissions and app visibility are unchanged.
- English/Vietnamese switching remains functional.
- Light and dark modes remain readable.
- No Supabase schema or production-data mutation is bundled with visual changes.

## Current boundary

This branch completes the Foundation phase. Inner application workflows are intentionally migrated in subsequent reviewable phases rather than changed through a single unsafe global CSS override.
