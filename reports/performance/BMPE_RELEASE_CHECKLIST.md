# BMPE RELEASE CONTROL — NO-GO UNTIL EVIDENCE
Repository: https://github.com/anhtuan-hash/catrich2798
Wave 1 PR: https://github.com/anhtuan-hash/catrich2798/pull/1399
Waves 2–5 PR: https://github.com/anhtuan-hash/catrich2798/pull/1400

## Current evidence and limitations
- Wave 1 source/CSS contract and Linux/Windows/macOS browser-engine matrix passed in the previous validation. CI WebKit does **not** certify native Safari.
- Wave 2 Smart Bubble Dock dedicated lifecycle/source tests passed; no native visual approval.
- Wave 3 includes a new static Vite build manifest for raw/gzip/brotli assets and lazy diagnostics; equal-environment before/after CPU/paint traces remain required.
- Wave 4 adds session-local opt-in rAF/Long Task monitoring to Admin Motion settings and upgrades official LCP/INP/CLS measurement to web-vitals 6.2.3. A single browser session is not a representative p75 distribution.
- Production data and role parity remain **NOT VERIFIED**.
- Legacy Critical E2E failed on main (baseline SHA 497da8086e1503de9097eefa4d0c26147ca0bd2e); main's unrelated dashboard editorial gate also failed. Do not mask.
- Attendance class management contract previously assumed useState(false), whereas current source restores the session. The assertion was updated without changing the attendance application state.
- No production deploy is authorized by the presence of previews or by a successful Vite build alone.

## Pending review (must each link reproducible evidence)
1. Source, bundle, role and critical E2E tests pass, and failures pre-existing on main are either resolved or explicitly risk-reviewed.
2. Visual baseline/diff for Home, Apps, Dashboard, Settings, Gradebook, Attendance, TTCM, Work Hub, all seasonal/off toggles.
3. macOS Safari stable, Chrome, Edge; Windows Edge, Chrome and Firefox on real devices or controlled test hardware.
4. Reduced motion and no-motion preset, keyboard and focus, no orphan loader/modal/dock.
5. 30 navigation cycles without leaked listeners/overlay, no dropped feature or permission.
6. Authenticated real API staging UAT with synthetic safe fixtures; no production student data in CI.
7. Representative p75 LCP <= 2.5s, INP <= 200ms, CLS <= .1; measured traces of 60Hz/120Hz motion, controlled before/after.
8. Rollback deployment SHA, production smoke, human visual approval.

Formal checker: `node scripts/bmpe-release-gate.mjs <evidence-json>` fails closed until all eight gate objects contain status PASS and a valid HTTPS evidence URL for the **same** candidate SHA. It never deploys.
