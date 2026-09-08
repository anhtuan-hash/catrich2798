# Quick Attendance Right Pane Redesign

## Goal
Match the approved right-pane mock while fixing the compressed student roster.

## Implementation
- Make the right pane a single vertical scroll surface.
- Use higher-specificity rules so late-loaded Material 3 CSS cannot reintroduce a nested roster scroll.
- Restyle the class header, session controls, roster section, photo evidence card, and final action bar as one coherent flow.
- Keep the left class list independent.
- Keep 3-column controls on desktop, 2 columns below 1180px, 1 column below 760px.

## Verification
- Dedicated regression contract must fail before the redesign and pass afterward.
- Frontend build and critical browser E2E must pass before merge.
