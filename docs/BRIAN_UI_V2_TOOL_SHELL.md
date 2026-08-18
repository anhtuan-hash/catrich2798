# Brian Metro Next — Tool Shell Migration Architecture

## Goal

Move Brian's existing teaching tools into Metro Next without rewriting stable business logic, data access, local storage, import/export, auth or permission behavior during the visual migration.

## Migration levels

### Level 1 — Runtime Bridge

The V2 Tool Shell owns navigation, identity, status, refresh, focus mode and fullscreen. The existing V1 tool runs in a same-origin iframe at `/#/tool/<slug>`.

The bridge injects a small cleanup stylesheet into the iframe to hide duplicated global V1 chrome. It does **not** modify tool logic.

Release meaning: safe private preview only.

### Level 2 — V2 Chrome Adapter

Stable tool logic remains V1, but common tool-level UI is moved to V2 components:

- tool header / breadcrumb
- command toolbar
- save / autosave status
- import / export controls
- tabs / segmented controls
- common dialogs and drawers
- loading / empty / error states

Release meaning: acceptable for broad private testing if regression checks pass.

### Level 3 — Native Metro Next Tool

The internal tool workspace is migrated to V2 primitives and tokens while preserving the same service and domain logic.

Release meaning: final visual target.

## Bridge rules

1. Never fork Supabase schema or business rules for V2.
2. Never copy tool data into a separate V2 store solely for redesign.
3. Same-origin runtime bridge is temporary architecture, not the final production destination for every tool.
4. A tool may be marked bridge-verified only when its slug is explicitly registered in `src/ui/v2/toolBridgeRegistry.js`.
5. Unregistered tools remain preview-only in the V2 Apps gallery.
6. Fullscreen must use the Tool Shell container so classroom/projector tools keep a consistent outer experience.
7. The V1 route remains available as an emergency escape hatch while Shadow UI is private.
8. Functional parity is more important than visual completeness.

## Current Level-1 bridge set

- Brian Classroom Stage
- Knowledge Train
- Crossword Trial
- Flying Words
- Top Five Arena
- Brian TextLab Activities
- Exam Studio
- Lesson Architect
- THPT Interactive Practice Hub
- Seating Chart Studio
- Reading Studio
- WordGraph Studio
- Vietnam Tax Studio
- TextCare Fixer

## Next Level-2 targets

Priority order:

1. Classroom Stage
2. Knowledge Train
3. Crossword Trial
4. Flying Words
5. Exam Studio
6. TextLab Activities
7. Lesson Architect
8. Seating Chart Studio

These represent the major interaction families: projector workspace, game, authoring, assessment and classroom management.

## Regression gate per tool

Before a bridged or adapted tool is considered release-ready, verify:

- route opens correctly for the intended role
- existing saved data is visible
- create/edit/delete behavior matches V1
- import/export still works
- autosave/local draft behavior still works
- keyboard and touch interactions remain usable
- fullscreen/projector mode remains usable where relevant
- no duplicate global navigation appears
- no V2 shell CSS leaks into the legacy runtime
- reload and back navigation are safe
- mobile/iPad/desktop layouts do not trap the user

## Final migration rule

The bridge lets Brian redesign safely in parallel, but the final UI program continues beyond Level 1. The project only reaches 100% when the agreed release-critical tools and pages pass the visual, functional, responsive, accessibility and rollback gates.
