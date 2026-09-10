# Attendance Manage Two-Step Tiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current split-view Attendance “Quản lý lớp” screen with the approved two-step experience: a full-width searchable tile grid first, then a full-width class detail view after a tile is selected.

**Architecture:** Keep the existing Supabase data flow, permissions, class/member mutation functions, and `AttendanceClassEditor`. Add one React UI state (`manageDetailOpen`) to distinguish overview from detail while continuing to reuse `selectedClassId` for all existing mutations. Render the overview and detail branches directly inside `GlobalAttendanceNavigationTab.jsx`; styling stays in the attendance CSS files with no DOM runtime or MutationObserver bridge.

**Tech Stack:** React, existing attendance utility functions, CSS, Node regression-contract scripts, GitHub Actions Frontend Build and Critical E2E.

**Spec:** Approved mockup in the current ChatGPT conversation: “Trạng thái 1 – Danh sách lớp” grid tiles → “Trạng thái 2 – Chi tiết lớp” full-width detail with “Quay lại danh sách lớp”.

## Global Constraints

- Do not change Supabase schema, RPC contracts, permissions, or attendance data flow.
- Do not restore DOM overlay/runtime mutation for this screen.
- Opening “Quản lý lớp” must show the tile overview, not an implicitly selected class detail.
- Tile click must select that class and open its detail view.
- Detail view must occupy the full content width and provide “Quay lại danh sách lớp”.
- Preserve Import Excel, create class, add teacher, add student, edit class/member, delete class/member functions.
- Keep responsive behavior for desktop, tablet, and mobile.

---

### Task 1: Lock the approved two-step behavior with regression contracts

**Files:**
- Create: `scripts/test-attendance-manage-two-step-tiles.mjs`
- Modify: `.github/workflows/frontend-build.yml`

**Interfaces:**
- Consumes: `GlobalAttendanceNavigationTab.jsx`, `GlobalAttendanceNavigationTab.css`, `AttendanceClassEditor.jsx`, `AttendanceClassEditor.css`.
- Produces: a contract that requires overview/detail state, tile-grid markup, back navigation, full-width detail, filters, and preserved management actions.

- [ ] **Step 1: Write the failing test**

Assert the source contains `manageDetailOpen`, an overview class grid, tile buttons that call both `setSelectedClassId(classRow.id)` and `setManageDetailOpen(true)`, a back button that calls `setManageDetailOpen(false)`, tile metadata for room/day/time/student count/teacher, overview filters, and separate overview/detail CSS selectors. Assert the legacy `attendance-management-grid` split-view is no longer the manage root.

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-attendance-manage-two-step-tiles.mjs`
Expected: FAIL because the current manage UI is still a two-column split view.

- [ ] **Step 3: Add the test to Frontend Build**

Insert a named workflow step immediately after the existing attendance management contracts.

- [ ] **Step 4: Commit**

Commit message: `test: lock two-step attendance class management`

### Task 2: Implement the tile overview state

**Files:**
- Modify: `src/components/GlobalAttendanceNavigationTab.jsx`
- Modify: `src/components/GlobalAttendanceNavigationTab.css`

**Interfaces:**
- Consumes: `activeClasses`, `memberCounts`, `teachersForClass`, `roomForExtraClass`, `weekdaysForExtraClass`, existing `classQuery`, `subjectFilter`, `setSelectedClassId`.
- Produces: `manageDetailOpen` state and a full-width overview grid.

- [ ] **Step 1: Add overview/detail state**

Create `const [manageDetailOpen, setManageDetailOpen] = useState(false);`. Reset it to `false` when the modal closes or the user leaves the manage tab.

- [ ] **Step 2: Derive filtered classes and filter metadata**

Create a memoized manage-class list filtered by search text, class type and grade. Keep the existing class data as the only source of truth.

- [ ] **Step 3: Render the approved overview toolbar**

Render search, class-type chips, grade chips, Import Excel and Tạo lớp mới in one responsive control area.

- [ ] **Step 4: Render full-width class tiles**

Each tile shows type badge, class name, subject/grade, room, weekday, time, active student count, and assigned teacher(s). Clicking a tile sets the class id then opens detail state.

- [ ] **Step 5: Style the overview**

Use a responsive 4-column desktop grid, 2-column tablet grid and 1-column mobile grid, with subject/type tonal differentiation matching the approved mockup.

- [ ] **Step 6: Run regression**

Run: `node scripts/test-attendance-manage-two-step-tiles.mjs`
Expected: overview assertions pass; detail assertions may still fail until Task 3.

- [ ] **Step 7: Commit**

Commit message: `feat: add attendance class tile overview`

### Task 3: Implement the full-width class detail state

**Files:**
- Modify: `src/components/GlobalAttendanceNavigationTab.jsx`
- Modify: `src/components/GlobalAttendanceNavigationTab.css`
- Modify: `src/components/attendance/AttendanceClassEditor.jsx`
- Modify: `src/components/attendance/AttendanceClassEditor.css`

**Interfaces:**
- Consumes: selected class/member/teacher data and all existing management mutation handlers.
- Produces: full-width detail view with back navigation and the existing management functions preserved.

- [ ] **Step 1: Add the back-navigation header**

Render `← Quay lại danh sách lớp`; it only changes `manageDetailOpen` to false and does not clear underlying class data.

- [ ] **Step 2: Build the detail hero**

Render class type, class name, subject, grade, room, weekday, time, active member count and assigned teachers with action buttons grouped on the right.

- [ ] **Step 3: Recompose the detail body**

Use a two-column desktop body: class information/editor on the left and student roster on the right. Collapse to one column on narrower screens.

- [ ] **Step 4: Preserve existing mutations**

Keep Add teacher, Add student, Edit class, Edit student, Remove student and Delete class wired to the existing handlers/RPC paths.

- [ ] **Step 5: Run regression**

Run: `node scripts/test-attendance-manage-two-step-tiles.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: add full-width attendance class detail`

### Task 4: Verify and ship

**Files:**
- No functional file changes unless verification exposes a regression.

**Interfaces:**
- Consumes: completed implementation.
- Produces: verified PR ready for production.

- [ ] **Step 1: Run Frontend Build**

Expected: all attendance contracts and production bundle PASS.

- [ ] **Step 2: Run Critical E2E**

Expected: Chromium, WebKit, iPhone layout and independent scroll checks PASS.

- [ ] **Step 3: Review changed-file scope**

Expected: only the plan, regression/workflow, manage React/CSS and class-editor React/CSS files are changed.

- [ ] **Step 4: Merge only the verified head SHA**

Use the exact verified PR head SHA to prevent a race with later commits.

- [ ] **Step 5: Verify Vercel production status**

Expected: Vercel reports `success` for the merge commit.
