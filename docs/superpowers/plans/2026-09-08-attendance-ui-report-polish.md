# Attendance UI and PDF Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore visible class search/filter controls, separate the calendar/manage/history surfaces, and make the attendance report print cleanly as A4 portrait with an unobstructed school logo.

**Architecture:** Keep the existing React attendance component and report exporter intact. Fix layout only through the attendance CSS modules and print HTML/CSS, while extending existing source-contract tests that already run in the Frontend Build workflow. Do not alter Supabase queries, attendance calculations, or report data structures.

**Tech Stack:** React 19, Vite, CSS, Node source-contract tests, GitHub Actions Frontend Build.

**Spec:** `docs/superpowers/specs/2026-09-08-attendance-ui-report-polish.md`

## Global Constraints

- Preserve all attendance business logic and persisted data behavior.
- Keep PDF page format `A4 portrait`.
- Keep the attendance discovery surface opted out of the global search remover with `data-bes-keep-search="true"`.
- Reuse existing attendance CSS modules; do not introduce a new UI dependency.
- Each production change must be preceded by a failing regression test.

---

### Task 1: Reserve visible space for class discovery controls

**Files:**
- Modify: `scripts/test-attendance-hub-absence-ui.mjs`
- Modify: `src/components/attendance/AttendanceMaterial3.css`

**Interfaces:**
- Consumes: `.attendance-class-list`, `.att-m3-class-discovery`, `.att-m3-class-search`, `.att-m3-subject-hub`.
- Produces: a three-row class-list layout where discovery controls cannot collapse between the header and scrollable results.

- [ ] **Step 1: Write the failing test**

Add assertions requiring the Material 3 CSS to define `.attendance-class-list{grid-template-rows:auto auto minmax(0,1fr)}` (whitespace-tolerant) and to keep `.att-m3-class-discovery` non-collapsing with `min-height` or `flex-shrink:0`.

- [ ] **Step 2: Run test to verify it fails**

Run through the PR Frontend Build job: `node scripts/test-attendance-hub-absence-ui.mjs`.
Expected: FAIL because the current inherited class-list grid has only two rows and the discovery block has no reserved row.

- [ ] **Step 3: Write minimal implementation**

In `AttendanceMaterial3.css`, override `.attendance-class-list` with `grid-template-rows:auto auto minmax(0,1fr)` and make `.att-m3-class-discovery` a non-collapsing surface with adequate padding.

- [ ] **Step 4: Run test to verify it passes**

Run the same Frontend Build job.
Expected: PASS for the attendance hub/absence UI contract.

- [ ] **Step 5: Commit**

Commit message: `fix: reserve attendance class discovery space`.

---

### Task 2: Separate calendar, management, and history cards

**Files:**
- Modify: `scripts/test-attendance-material3-ui.mjs`
- Modify: `src/components/attendance/AttendanceMaterial3.css`
- Modify: `src/components/GlobalAttendanceDailyCalendar.css`
- Modify: `src/components/GlobalAttendanceNavigationTab.css`

**Interfaces:**
- Consumes: `.attendance-calendar-layout`, `.attendance-calendar-grid`, `.attendance-calendar-day`, `.attendance-manage-layout`, `.attendance-management-grid`, `.attendance-history-layout`.
- Produces: separated Material 3 surfaces with explicit gaps and independent rounded cards.

- [ ] **Step 1: Write the failing test**

Extend `test-attendance-material3-ui.mjs` to require: calendar layout/card gap tokens, calendar grid gap with no fused border, calendar day rounded corners, and non-zero gaps in management/history workspace layouts.

- [ ] **Step 2: Run test to verify it fails**

Run through Frontend Build: `node scripts/test-attendance-material3-ui.mjs`.
Expected: FAIL because calendar currently uses `gap:0`, a surrounding grid border, and touching cells; management/history surfaces are visually fused.

- [ ] **Step 3: Write minimal implementation**

Add Material 3 overrides and base layout adjustments so calendar days have independent spacing/radii, management grid children are separated, and history list/detail are separated by a visible workspace gap while preserving responsive behavior.

- [ ] **Step 4: Run test to verify it passes**

Run the same Frontend Build job.
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `style: separate attendance workspace cards`.

---

### Task 3: Protect A4 portrait report header and logo

**Files:**
- Modify: `scripts/test-attendance-report-export.mjs`
- Modify: `src/utils/attendanceReportExport.js`

**Interfaces:**
- Consumes: `printAttendanceReportPdf(report, filters)` and `schoolLogoUrl`.
- Produces: print HTML with `@page size:A4 portrait`, safe top margin, bounded logo dimensions, and a dedicated report page/header wrapper.

- [ ] **Step 1: Write the failing test**

Extend `test-attendance-report-export.mjs` to require a larger safe top print margin, a bounded logo block using physical units or explicit max dimensions, and print rules that suppress default page overflow while retaining `A4 portrait`.

- [ ] **Step 2: Run test to verify it fails**

Run through Frontend Build: `node scripts/test-attendance-report-export.mjs`.
Expected: FAIL because the current print sheet uses only `11mm` top margin and a `52px` logo in a header positioned too close to Chrome's print header region.

- [ ] **Step 3: Write minimal implementation**

Update the popup stylesheet to use a safer A4 portrait page margin, a `.report-page` wrapper, a bounded logo box expressed in mm, and table/layout constraints that cannot exceed portrait width. Keep report content and school identity unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run the same Frontend Build job.
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `fix: protect attendance PDF header`.

---

### Task 4: Full verification and merge

**Files:**
- No additional production files unless verification exposes a regression.

**Interfaces:**
- Consumes: all changes from Tasks 1-3.
- Produces: a mergeable branch with green CI and production build.

- [ ] **Step 1: Run full Frontend Build**

Open/update a PR from `fix/attendance-ui-report-polish` to `main` and wait for `.github/workflows/frontend-build.yml`.
Expected: every attendance contract and `npm run build` pass.

- [ ] **Step 2: Inspect PR diff**

Confirm only the planned spec/plan, attendance tests, attendance CSS, and report exporter changed.

- [ ] **Step 3: Merge to main**

Merge only after green CI using squash or merge per repository policy.

- [ ] **Step 4: Verify production deployment**

Check the resulting production Vercel deployment is READY and tied to the merged main SHA.
