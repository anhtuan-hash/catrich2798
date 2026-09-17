# TTCM Teacher History Pastel Refresh — Design Spec

**Date:** 2026-09-17
**Status:** Approved

## Goal

Refresh the existing **Kênh TTCM → Lịch sử & File GV** workspace so it feels more polished, visual, and modern while preserving all existing data, permissions, filtering, file preview/download behavior, and responsive behavior.

## Approved visual direction

- Keep the existing information architecture and roughly 40/60 history-to-file layout on desktop.
- Use a restrained pastel system: blue, lavender, mint, and peach/orange on a very light cool background.
- Give the TTCM history state a soft blue/lilac hero treatment without changing other TTCM workspaces.
- Make the teacher profile toolbar feel like a profile summary rather than a plain form row.
- Turn the four KPI cards into distinct pastel cards with stronger icon blocks, soft borders, and subtle depth.
- Present activity history as a journal: clearer colored timeline, stronger nodes, each event inside a compact mini-card, and readable metadata pills.
- Soften the submitted-file table: more whitespace, subtle row depth/hover, distinct file-type badges, clearer attempt/status pills, and round action buttons.
- Keep quick filters pill-shaped and make the selected state visually obvious.
- Preserve independent scrolling for history and file panels.
- Preserve accessibility affordances such as visible focus states and reduced-motion-friendly transitions.

## Functional constraints

- Do not change TTCM data loading, database queries, API calls, roles, permissions, school-year filtering, search logic, submission-round calculations, preview/download actions, or navigation behavior.
- Do not add a new dependency.
- Do not remove the Personnel tab or any existing TTCM workspace.
- Keep all existing contract tests passing.
- The visual refresh must remain usable at desktop, <=1180px, and <=720px breakpoints.

## Implementation boundary

Primary production file:
- `src/components/GlobalTtcmTeacherHistory.css`

No JSX or utility change is required unless a visual requirement cannot be expressed safely in the existing markup. Prefer CSS-only implementation to reduce regression risk.
