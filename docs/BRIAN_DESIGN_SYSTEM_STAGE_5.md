# Brian Design System — Stage 5 App-by-App Migration

## Scope of this migration wave
Stage 5 starts applying the Stage 1–4 system to production app surfaces without rewriting business logic.

First migrated surfaces:
- Home / Brian Hub
- Dashboard / Work center
- TTCM workspace
- Homeroom workspace

Weekly-practice management is part of Home and therefore inherits the Home migration. The legacy `practice` route still exists in the route registry but is not rendered by `main.jsx`; active practice/exam experiences must be migrated by their actual tool slug/component instead of reviving a dead route.

## Migration strategy
The existing pages are large and own sensitive behavior: dashboard aggregation, calendar events, TTCM events, homeroom records, export workflows and permissions. Stage 5 therefore uses route/workspace-scoped compatibility adapters as the first production migration step.

The adapters:
1. load after the historical visual layers;
2. preserve existing DOM, handlers and data contracts;
3. replace hard-coded visual values with Stage 1 semantic tokens;
4. align surfaces, controls, focus states and semantic status colors with Stage 2–4 contracts;
5. keep horizontal navigation unchanged;
6. avoid decorative motion.

## Files
- `src/styles/BrianStage5Migration.css` — Home + Dashboard.
- `src/styles/BrianStage5WorkflowMigration.css` — TTCM + Homeroom.
- `src/components/GlobalFlatNavigation.jsx` — loads the final route-scoped adapters globally.
- `scripts/audit-stage5-design-system.mjs` — migration contract audit.
- `.github/workflows/stage5-design-system-audit.yml` — PR audit workflow.

## Home
The approved Home editorial structure remains intact. Its paper, ink, borders, cards and primary/secondary actions now resolve through Brian semantic tokens. Weekly-practice surfaces are included in this migration.

## Dashboard
The dashboard keeps its aggregator, weather/calendar logic and existing action handlers. The hero, status strip, cards, events, empty states and horizontal navigation are normalized to the Brian token contract.

## TTCM
The existing TTCM workspace/modal keeps all messaging, attachment and response behavior. Its shell, toolbar, tabs, filters, cards and semantic announcement/resource/feedback/task states are normalized to Brian tokens.

## Homeroom
The existing Homeroom workspace keeps all student, attendance, conduct, export and cloud logic. Hero, tabs, panels, forms, metric cards and quick actions are normalized to Brian semantic surfaces and focus rules.

## Safety boundary
This wave does not change:
- route permission logic;
- dashboard aggregation;
- TTCM data/event logic;
- homeroom attendance/conduct records;
- Supabase policies/data models;
- export handlers;
- weekly-practice content/data;
- horizontal global navigation structure.

## Next migration targets
The next Stage 5 wave should resolve active tool slugs for exam/practice and the current weekly-management/reporting surfaces, then migrate those concrete components rather than old route aliases.
