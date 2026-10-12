# BRIAN Homeroom 4.0 — Phase 1 Foundation and Migration Record

Date: 2026-10-12. Scope: `#/homeroom` only.

## Baseline and invariants

- The application has seven active navigation tabs, defined in `src/data/homeroom.js`: `overview`, `classes`, `students`, `studentRecords`, `attendance`, `conduct`, `safety`.
- The actual rendered module is `src/pages/HomeroomWorkspace.jsx`, not the retired phase-2/phase-3 auxiliary tabs.
- Runtime data: `src/utils/homeroomClassWorkspaceStore.js`, `src/utils/homeroomStore.js`, `src/preferredHomeroomEntry.js`, `src/utils/homeroomFastEntry.js`.
- The account-specific, admin-assigned GVCN opening is the source of truth. Cached metadata is only a first-paint shortcut. Keep the user in the correct assigned class; never hard-code class 12.6.
- `StudentsTab` / `SubjectStudentsTab` use distinct data privacy and class-role logic.
- Conduct locking and attendance corrections are enforced in `homeroomProductionSafety.js` and must remain intact.
- Student Records coordinates paper, vnEdu, MOET; do not change those values or grant additional cloud access.
- Class lifecycle and backup/restore preserve access checks, audit history, and masking of old credentials.
- Separate gradebook and schoolwide attendance apps are outside this migration. Do not rewrite their components or data.

## Current UI issue inventory

1. **Layered overrides:** Homeroom imports GoogleRedesign, GoogleColorPolish, GoogleReadabilityPolish, HomeroomNavigationPalette and HomeroomGlassHero CSS. Material3Refinement CSS is also bootstrapped globally. Some rules use high specificity / `!important`. Existing layers remain unchanged in Phase 1; migrate to one scoped presentation layer gradually.
2. **Tall hero:** Current GlassHero CSS sets 490px desktop height. Phase 2 target ~260–300px; ensure the illustration remains vector-sharp, text remains readable and action buttons remain interactive.
3. **Dense admin forms:** The student/profile screens contain large form groups and tables, requiring long scrolling.
4. **Overview:** The current overview supplies basic counts and quick links, not a true tasks-first command center.
5. **Performance:** No blocking assigned-homeroom RPC on initial route load. No eager loading of all 28 classes on first paint; preserve this regression.
6. **Legacy routes:** Retired `parents`, `records`, `search`, `support`, and similar tabs are excluded by `homeroomClassTypes.js`; do not accidentally re-enable them.

## Design contract

- Style direction: Material 3 Expressive × Colorful Bento UI, professional with sharply-defined illustrations, visible affordances, and deliberate color meaning.
- Foundation: `src/styles/homeroom-4-tokens.css` contains scoped color, typography-related, radius, shadow and motion constants, light and dark.
- Component mapping (Phase 2): Hero / nav / form controls and card surfaces consume variables from this single source. Avoid new large global CSS or the practice of piling `!important` overrides.
- Existing interactions remain identical until an explicitly verified stage changes them.
- Targets to test (not claims of measurements): cached class displayed promptly, INP <=200ms p75, LCP <=2.5s p75, CLS <=0.1, a11y keyboard / reduced motion, high contrast, no accidental class switching.
- Never render synthetic student counts or fictitious conduct / attendance data in a loading state.

## Sequential release checklist

1. Create branch from the latest observed `main`, never force-push.
2. Add tests for each stage and run the Homeroom Build Verification workflow + existing data-safety regressions.
3. Review production Vercel preview and failure logs; do not merge failing Homeroom contract checks.
4. Merge PR only on green Homeroom gate, preserve concurrent `main` commits, verify production deployment is READY and the custom alias is attached.
5. Keep rollback commit / PR reference and verify `#/homeroom` for admin, GVCN, subject teacher, cloud-only, offline, cross-device edits.
6. Phase 2 begins only after Phase 1 source and tests are merged.

## Eight-stage project progress weights

| Stage | Deliverable | Share |
|---|---|---:|
| 1 | Inventory, scoped tokens, safety tests | 10% |
| 2 | Hero, navigation, controls and layout redesign | 15% |
| 3 | Tasks-first Homeroom Command Center | 15% |
| 4 | Student Hub & 360° profile | 15% |
| 5 | Paper / vnEdu / MOET Records workflow | 15% |
| 6 | Attendance and Conduct analytics UX | 15% |
| 7 | Reports, work tracking, data safety | 10% |
| 8 | Browser/E2E, performance, production certification | 5% |

A stage is complete only after its intended code, checks, and safe integration pass. Do not substitute plan documentation for implemented functionality.
