# BRIAN Homeroom 4.0 — Phase 2 expressive UI

Date: 2026-10-12. Only the `#/homeroom` page is changed.

## Implemented

- Dedicated `.hr-v4` gated Material 3 Expressive × Colorful Bento presentation file `src/styles/homeroom-4-expressive.css`.
- Compact, still-vector campus hero (490 → 308 px on wide screens), editable profile shifted out of daily overview to the class-management tab, core roster/export/add buttons stay functional.
- Seven colored navigation tabs with Lucide icons and `aria-current` semantics, preserving the existing responsive sticky-top measurement.
- Consistent card/form radius, focus-visible rings, accessible reduced-motion and dark mode styles.
- Responsive thresholds 1100/760/520px with no removal of menu functions.
- Separate subject-class privacy/data logic unchanged, admin assignment and instant homeroom cache unchanged.

## Known limitations / scope boundaries

- Previous layered styles still exist for compatibility. Only the scoped `.hr-v4` bridge should be extended; later refactor can remove obsolete legacy selectors after visual tests.
- The report/attendance/conduct/student-record business logic is NOT changed in Phase 2.
- No additional student fields or PII are stored; no SQL changes and no AI.
- Desktop, tablet and mobile screenshots must be visually reviewed before treating the design as final; static CI and build alone do not establish pixel parity.

## Release gate

- `scripts/test-homeroom-4-phase-1.mjs`
- `scripts/test-homeroom-4-phase-2.mjs`
- Existing Homeroom safety, legacy cleanup and gradebook-migration contract
- `npm run build` through `Homeroom Build Verification`
- Vercel preview/production READY, manual signed-in interaction check on class 12.6, cloud-only and subject class
