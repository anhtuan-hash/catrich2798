# iPhone Dashboard + Attendance Mobile Reflow Plan

**Goal:** Make Dashboard and Attendance comfortably readable on iPhone 16 Pro Max-class viewports without changing desktop/tablet layout or scaling the whole application.

**Architecture:** Keep existing React structure and add final, phone-scoped CSS authority files. Dashboard gets a route-local override imported last by `WorkDashboard.jsx`; Attendance gets an override imported after `AttendanceMaterial3.css`; shared navigation gets a final phone override imported last by `GlobalFlatNavigation.jsx`. Use internal horizontal scrollers only for navigation/chip/table rails, safe-area padding, and >=44px touch targets. Never use CSS `zoom` or `transform: scale(...)` as a responsive technique.

## Task 1 — Regression contract first

**Files:**
- Create: `scripts/test-iphone-dashboard-attendance-mobile.mjs`
- Modify: `.github/workflows/frontend-build.yml`

Add static UI contracts for the three final mobile stylesheets/imports, phone breakpoint, safe-area handling, readable typography, touch target sizes, iOS input font size, and no zoom/scale. Run in PR CI and confirm it fails before implementation.

## Task 2 — Shared mobile navigation

**Files:**
- Create: `src/components/GlobalIphoneNavigationReadable.css`
- Modify: `src/components/GlobalFlatNavigation.jsx`

At <=520px, preserve the fixed nav shell but make the primary rail horizontally scrollable with >=44px controls and 13–14px labels. Keep utility controls reachable and ensure safe-area left/right padding does not create document overflow.

## Task 3 — Dashboard mobile reflow

**Files:**
- Create: `src/styles/dashboard-iphone-readable.css`
- Modify: `src/pages/WorkDashboard.jsx`

At <=520px, use nearly full viewport width, enlarge type/buttons, shrink decorative hero artwork/stage, make schedule rows readable with two-line descriptions, and keep all overflow inside explicit scrollers.

## Task 4 — Attendance mobile reflow

**Files:**
- Create: `src/components/attendance/AttendanceIphoneReadable.css`
- Modify: `src/components/GlobalAttendanceNavigationTab.jsx`

At <=520px, enlarge title/tabs/chips/inputs, stack form controls, use 16px inputs/selects to prevent iOS Safari auto-zoom, reflow roster rows, and add safe-area bottom spacing for confirmation actions. Reports/history/tables scroll internally.

## Task 5 — Verification and integration

Run the new regression contract, existing attendance UI contracts, production build, and PR CI. Inspect PR diff for desktop leakage and forbidden scale/zoom rules. Merge only after fresh verification passes.