# Homeroom 4.0 — Phase 8 performance/QA release gates

Date: 2026-10-12. Stage weight: final 5%.

## Initial-route optimization
- Defer large tabs (Student Records with OCR/Excel, Conduct, Attendance, Student Hub and subject student view, Safety and Class Lifecycle) using React.lazy. Do not start unnecessary network RPCs on hover or during first render.
- The class hero/nav and already-authorized cached GVCN overview remain eager. The existing account-scoped cached workspace and cloud-only privacy guard remain intact.
- While a deferred tab loads, display a compact accessible status and honor reduced-motion.
- No student data migrations, authentication/RLS changes, score formula changes or new third-party dependencies.

## Verification matrix (production sign-off)
1. Admin assigned class 12.6: reload, first paint is correct class, no stale 10.5; repeat on poor network.
2. Teacher with subject class: no GVCN report/task center, no hidden roster; switching classes must not leak drafts.
3. GVCN: open every tab with mouse and keyboard, archive/reopen workflow and source scanner/import preview, conduct unlock/lock.
4. Student 360: duplicate code/name, CSV import with review, cloud-conflict save, task edit/complete/reopen, report CSV injection-safe.
5. Cloud-only: clear local cache; show only class name until cloud payload hydrates. Never render empty editable records.
6. Vercel preview and production: deploy correct merged SHA, confirm aliases; rollback via previous green commit if error.
7. On actual hardware: measure LCP, INP and CLS, and compare warm/cold route load; do not call targets achieved without data.
8. Run all phase 1–8 Node contracts, existing Homeroom production-safety and class-assignment tests, Vite production build and applicable E2E.

## Acceptance boundaries
A green static/CI build proves code paths and build validity, not authenticated browser UI or real-world Web Vitals. Record those separately before claiming performance SLA or 100% real-world acceptance. Other-app CI failures must be fixed in separate scoped PRs.
