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

### Applications directory

Source: `src/pages/WebApps.jsx` and `WebAppsPremium.css`

- Replaces overlapping pseudo-window cards and the duplicate page-level navigation.
- Editorial page header and role-aware application statistics.
- Sticky search and command bar.
- Pinned application quick-access row.
- Calm modular card grid using the shared token system.
- Workflow-group filtering and comfortable/compact density modes.
- Admin launcher editor retains drag ordering, pin, hide, navigation placement, custom groups, cloud save and reset.
- Locked applications retain the existing permission-request workflow.

### Work Dashboard

Source: `src/pages/WorkDashboard.jsx` and `WorkDashboardPremium.css`

- Rewritten component rather than a stylesheet overlay on the former dashboard.
- Keeps the existing dashboard aggregator, realtime source events and role-aware snapshot.
- Editorial greeting and role card with workflow-health progress.
- Five semantic metrics with task filtering.
- Dedicated work, schedule, approval, professional, homeroom, recent-work and resource panels.
- Uses the same component anatomy when embedded on Home and when opened as a full route.
- Mobile layout removes secondary metadata before allowing horizontal overflow.

## Migration sequence

1. **Foundation** — tokens, shell, homepage and notification contract. **Complete.**
2. **Directory** — rebuild the Apps page using the same card anatomy and spacing. **Complete.**
3. **Shared surfaces** — forms, tables, empty states, toolbars and dialogs. **In progress; dashboard establishes the first production surface patterns.**
4. **Management workspaces** — Dashboard, Work Hub, Homeroom and Professional Hub. **Dashboard complete; remaining workspaces pending.**
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

This branch completes the Foundation, Applications Directory and Work Dashboard migrations. The next implementation boundary is the shared component layer followed by Work Hub, Homeroom and Professional Hub. Their business logic remains untouched until the shared form, toolbar, table and dialog primitives are stable.
