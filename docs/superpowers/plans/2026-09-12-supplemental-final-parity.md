# Supplemental Final Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining user-visible parity gaps between Học bổ sung and the existing Phụ đạo/Bồi dưỡng attendance flow without changing Học bổ sung authorization boundaries.

**Architecture:** Keep the existing shared React rollcall as the UI owner. Add small supplemental API/RPC adapters for assigned-teacher choices and post-confirm correction, harden the v2 confirmation RPC so the server enforces the same metadata/absence invariants as the client, and make the existing post-confirm editor source-aware instead of creating a second editor.

**Tech Stack:** React/Vite, vanilla bootstrap helpers, Supabase PostgreSQL RPC, Node contract tests, GitHub Actions.

**Spec:** Existing Học bổ sung parity behavior established by PRs #778-#781 and this audit.

## Global Constraints

- Preserve strict `canManageSupplementalLearning` / backend supplemental-manager authorization; generic Attendance permissions must not grant Học bổ sung access.
- Preserve all existing Phụ đạo/Bồi dưỡng behavior and RPC signatures.
- Học bổ sung remains stored in its own supplemental tables.
- Attendance statuses remain Có mặt / Đi trễ / Vắng, with absence reason required and `other` requiring a note.
- Lesson periods remain 1 / 1.5 / 2.
- Every implementation change starts with a failing contract assertion and ends with relevant build/E2E verification.

---

### Task 1: Multi-teacher rollcall parity

**Files:**
- Modify: `scripts/test-attendance-supplemental-native-rollcall.mjs`
- Modify: `src/attendance/supplementalLearningApi.js`
- Modify: `src/components/GlobalAttendanceNavigationTab.jsx`
- Create/extend migration: `supabase/migrations/20260912_supplemental_final_parity.sql`

**Interfaces:**
- Produces: `loadSupplementalSessionTeachers(client, sessionId)` returning assigned teacher rows/names for the session group.
- Consumes: existing `bes_supplemental_group_teachers` and strict supplemental manager guard.

- [ ] Add contract assertions that supplemental rollcall loads the complete assigned-teacher list and uses it for the shared teacher selector.
- [ ] Verify the contract fails on the current branch.
- [ ] Add a lightweight manager-guarded RPC to return all teachers assigned to the recurring session's group.
- [ ] Add the API wrapper and merge returned names into the synthetic supplemental class; keep the session teacher selected when valid, otherwise default only when exactly one teacher exists.
- [ ] Run the supplemental native-rollcall contract and build.

### Task 2: Server-side confirmation invariants

**Files:**
- Modify: `scripts/test-attendance-supplemental-native-rollcall.mjs`
- Modify: `supabase/migrations/20260912_supplemental_final_parity.sql`
- Modify: `src/components/GlobalAttendanceNavigationTab.jsx`

**Interfaces:**
- Produces: hardened `bes_confirm_supplemental_attendance_v2(...)` with unchanged signature.
- Consumes: hardened legacy confirmation RPC for roster/count/proof semantics.

- [ ] Add contract assertions requiring server validation of effective teacher, room, start/end time, valid absence reasons, `other` note, and duplicate teacher/day conflicts across extra/supplemental sessions.
- [ ] Verify the contract fails before the migration is added.
- [ ] Override `bes_confirm_supplemental_attendance_v2` forward-only: validate effective metadata and participant absence payload before finalization, preserve 1/1.5/2 periods, and reject teacher/day conflicts without weakening authorization.
- [ ] Mirror the metadata/`other`-note checks in `confirmSupplementalSharedAttendance` for immediate UI feedback.
- [ ] Run native-rollcall, tardy, authorization and egress contracts plus build.

### Task 3: Post-confirm correction parity

**Files:**
- Create: `scripts/test-supplemental-post-confirm-edit-parity.mjs`
- Create: `.github/workflows/supplemental-post-confirm-edit-parity.yml`
- Modify: `src/attendance/supplementalLearningApi.js`
- Modify: `src/components/GlobalAttendanceNavigationTab.jsx`
- Modify: `src/attendancePostConfirmEditBootstrap.js`
- Modify: `supabase/migrations/20260912_supplemental_final_parity.sql`

**Interfaces:**
- Produces: `getSupplementalAttendanceEditSnapshot(client, sessionId)` and `updateSupplementalAttendanceSession(client, input)`.
- Produces backend RPCs `bes_get_supplemental_attendance_edit_snapshot(uuid)` and `bes_update_supplemental_attendance_session(uuid,jsonb,text)`.
- Consumes the existing post-confirm editor UI and preserves extra-class edit RPCs unchanged.

- [ ] Add a failing source contract proving supplemental rollcall exposes source/session ids, the editor recognizes `supplemental`, and supplemental edit RPCs/audit exist.
- [ ] Create a supplemental audit table and manager-aware edit-decision/snapshot/update RPCs. Preserve the 30-minute teacher rule where applicable; Admin/report-style bypass remains server-authoritative for eligible managers.
- [ ] Expose `data-bes-attendance-source` and `data-bes-attendance-session-id` on the shared rollcall.
- [ ] Make `attendancePostConfirmEditBootstrap.js` source-aware: extra sessions continue unchanged; supplemental sessions load a normalized snapshot, map `tardy` ↔ `late`, save through the supplemental update RPC, and display the same editor/card.
- [ ] Add a narrow GitHub Actions workflow for the new contract and run it with existing Critical E2E/build gates.

### Task 4: Final verification and release

**Files:** no product-code changes unless verification exposes a concrete regression.

- [ ] Review final diff for accidental cross-domain changes.
- [ ] Verify supplemental native rollcall, class simplification, history delete, post-confirm edit, tardy, build, Critical E2E, and egress guards all pass on the final head.
- [ ] Merge with expected head SHA only after all required checks are green.
- [ ] Verify `main` points to the merge commit and Vercel reports deployment success.
