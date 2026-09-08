# Attendance Class Editing and Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Quản lý lớp` the authoritative Admin editing surface for current extra-class schedule metadata and current roster data, while preserving already-confirmed attendance data as immutable historical snapshots.

**Architecture:** Persist current room, time range, and weekdays on `bes_extra_classes`, make runtime helpers prefer persisted fields before the 2026–2027 fallback catalog, add Admin-only Supabase RPCs for class/member edits, wire Management UI to those RPCs, and preserve session/record snapshots.

**Tech Stack:** React, Supabase/Postgres RPCs, Node regression contracts, GitHub Actions, Vite/Vercel.

**Spec:** `docs/superpowers/specs/2026-09-08-attendance-class-edit-sync-design.md`

## Global Constraints
- Only Admin may edit current class metadata or student details.
- Non-Admins with Management access remain read-only for these edit actions.
- Current class/roster tables are authoritative for future/current use.
- Already-confirmed/cancelled attendance sessions and records are immutable snapshots.
- Persisted weekdays/room outrank hard-coded fallback catalog values.
- Backfill never overwrites non-empty Admin-maintained values.

### Task 1: RED regression contract
- Create `scripts/test-attendance-class-edit-sync.mjs` covering persisted weekday/room precedence, Admin-only UI/RPC markers, and immutable-history SQL contract.
- Register in frontend CI only if contracts are explicitly listed.
- Run and confirm failure is caused by missing feature.

### Task 2: Persisted schedule/room precedence
- Modify `src/utils/extraClassSchedule2026.js` to prefer valid `classRow.weekdays` and `classRow.room`.
- Keep fallback catalog behavior for incomplete rows and unknown classes.
- Run new contract plus existing schedule-dimming/room-chip contracts.

### Task 3: Admin Supabase RPCs and backfill
- Reuse existing database Admin predicate.
- Add `bes_admin_update_extra_class(...)` updating only `bes_extra_classes`.
- Add `bes_admin_update_extra_class_member(...)` updating only `bes_extra_class_members`, recalculating `member_key`, rejecting active duplicates.
- Add additive deterministic backfill for missing schedule metadata.
- Apply the committed migration to project `xpkbgqdlfonsinriggmj` after branch verification and confirm functions exist.

### Task 4: Admin class editing UI
- Add synchronized class edit state in `GlobalAttendanceNavigationTab.jsx`.
- Add `saveClassInfo()` calling `bes_admin_update_extra_class`, then reload shared state.
- Render current metadata to all Management users; render edit controls only for Admin.
- Add Monday–Sunday weekday toggles and scoped Material 3 styling.

### Task 5: Admin student editing UI
- Add member edit state/save flow calling `bes_admin_update_extra_class_member`.
- Render `Sửa` only for Admin on active students; preserve remove-member behavior.
- Reload shared state after success.

### Task 6: Regression/build/security verification
- Run all attendance contracts, production build, critical Playwright smoke, and Supabase advisors.
- Fix only feature-caused regressions/new advisories.

### Task 7: PR/merge/production verification
- Open PR `feat/attendance-class-edit-sync` → `main`.
- Require green CI, merge, confirm Vercel production READY.
- Perform a non-destructive production verification that current metadata comes from persisted class data while historical sessions/records retain snapshots.
