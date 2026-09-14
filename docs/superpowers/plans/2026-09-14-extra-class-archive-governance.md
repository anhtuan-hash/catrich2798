# Extra-Class Archive Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace destructive Phụ đạo/Bồi dưỡng class deletion with an archive-first, fully restorable class package whose permanent deletion requires Admin approval.

**Architecture:** Add a dedicated `bes_extra_class_archive` table and RPC state machine for whole-class snapshots, separate from the existing session-oriented attendance archive. Expose a small client adapter for archive/list/restore/request/review/finalize, then wire the class-detail delete action and the unified Archive tab without widening report-only or attendance-history permissions.

**Tech Stack:** React 18, Vite, Supabase/PostgreSQL RPCs + RLS, Supabase Storage, Node 22 contract tests, GitHub Actions, Playwright critical E2E.

**Spec:** `docs/superpowers/specs/2026-09-14-extra-class-archive-governance-design.md`

## Global Constraints

- Admin and `attendance:manage` may archive, restore and request permanent deletion of whole classes.
- Report-only accounts may not archive, restore or request permanent deletion of whole classes.
- Only Admin may approve, reject or finalize permanent deletion.
- A class archive is one atomic package: class + all members + all teachers + all sessions + all attendance records + proof paths.
- Proof objects survive archive and restore; they are removed only after Admin approval and before finalize.
- Existing `bes_attendance_archive` behavior and Học bổ sung behavior must remain unchanged.
- The frontend is not the authorization boundary; every mutating RPC enforces permissions server-side.
- The legacy `bes_delete_extra_class` path must no longer allow authenticated callers to bypass archive governance.

---

### Task 1: Lock the database archive contract with a failing test

**Files:**
- Create: `scripts/test-extra-class-archive-governance.mjs`
- Modify: `.github/workflows/attendance-archive.yml`
- Modify: `.github/workflows/frontend-build.yml`

**Interfaces:**
- Consumes: current extra-class tables and existing attendance-archive conventions.
- Produces: a source contract that requires `bes_extra_class_archive` and the five class-archive RPCs before implementation can pass CI.

- [ ] **Step 1: Write the failing contract test**

Create a Node source-contract test that reads the migration/API/UI files and requires the new lifecycle. The core assertions must include:

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';

const migrationPath = 'supabase/migrations/20260914182000_extra_class_archive_governance.sql';
const apiPath = 'src/attendance/extraClassArchiveApi.js';
const navigation = fs.readFileSync('src/components/GlobalAttendanceNavigationTab.jsx', 'utf8');
const workspace = fs.readFileSync('src/components/attendance/AttendanceClassManagementWorkspace.jsx', 'utf8');
const panel = fs.readFileSync('src/components/attendance/AttendanceArchivePanel.jsx', 'utf8');
const migration = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, 'utf8') : '';
const api = fs.existsSync(apiPath) ? fs.readFileSync(apiPath, 'utf8') : '';

for (const token of [
  'bes_extra_class_archive',
  'bes_archive_extra_class',
  'bes_list_extra_class_archive',
  'bes_restore_extra_class_archive',
  'bes_request_extra_class_archive_delete',
  'bes_review_extra_class_archive_delete',
  'bes_finalize_extra_class_archive_delete',
  'class_snapshot',
  'members_snapshot',
  'teachers_snapshot',
  'sessions_snapshot',
  'records_snapshot',
  'proof_paths',
]) assert.ok(migration.includes(token), `Missing database contract: ${token}`);

assert.match(migration, /can_manage_extra_class_roster\(\)/i,
  'Archive/restore/request must reuse the attendance:manage server capability.');
assert.match(migration, /bes_review_extra_class_archive_delete[\s\S]*public\.is_admin\(\)/i,
  'Review must be Admin-only.');
assert.match(migration, /bes_finalize_extra_class_archive_delete[\s\S]*public\.is_admin\(\)/i,
  'Finalize must be Admin-only.');
assert.match(migration, /delete_request_status[\s\S]*'none'[\s\S]*'pending'[\s\S]*'approved'[\s\S]*'rejected'/i,
  'Archive must model the approved state machine.');
assert.doesNotMatch(migration, /delete\s+from\s+storage\.objects/i,
  'Database code must not delete Storage metadata directly.');
assert.match(migration, /bes_delete_extra_class[\s\S]*bes_archive_extra_class/i,
  'Legacy class delete must delegate to archive-first behavior instead of hard deleting.');

for (const name of [
  'archiveExtraClass', 'listExtraClassArchive', 'restoreExtraClassArchive',
  'requestExtraClassArchiveDelete', 'reviewExtraClassArchiveDelete',
  'finalizeExtraClassArchiveDelete',
]) assert.ok(api.includes(name), `Missing client adapter: ${name}`);

assert.match(api, /storage\.from\(ATTENDANCE_PROOF_BUCKET\)\.remove\(proofPaths\)/,
  'Approved permanent deletion must remove all proof paths through Storage before finalize.');
assert.match(navigation, /archiveExtraClass/,
  'Class delete UI must use archive RPC.');
assert.doesNotMatch(navigation, /client\.rpc\(['"]bes_delete_extra_class['"]/,
  'UI must not call the legacy destructive class RPC directly.');
assert.match(workspace, /canArchiveClass/,
  'Workspace must receive an explicit class-archive capability.');
assert.match(panel, /Lớp học/,
  'Archive UI must distinguish whole-class archive cards.');
```

- [ ] **Step 2: Run the contract and prove RED**

Run:

```bash
node scripts/test-extra-class-archive-governance.mjs
```

Expected: **FAIL** because the migration and `extraClassArchiveApi.js` do not exist yet and the UI still calls the destructive path.

- [ ] **Step 3: Wire the test into CI while it is red**

Add to `.github/workflows/attendance-archive.yml` path filters and steps:

```yaml
- 'src/attendance/extraClassArchiveApi.js'
- 'supabase/migrations/20260914182000_extra_class_archive_governance.sql'
- 'scripts/test-extra-class-archive-governance.mjs'

- name: Verify whole-class archive governance
  run: node scripts/test-extra-class-archive-governance.mjs
```

Add the same command before the production build in `.github/workflows/frontend-build.yml`:

```yaml
- name: Verify extra-class archive governance
  run: node scripts/test-extra-class-archive-governance.mjs
```

- [ ] **Step 4: Commit the RED contract**

```bash
git add scripts/test-extra-class-archive-governance.mjs .github/workflows/attendance-archive.yml .github/workflows/frontend-build.yml
git commit -m "test: define extra class archive governance contract"
```

---

### Task 2: Implement atomic whole-class archive, restore and governance RPCs

**Files:**
- Create: `supabase/migrations/20260914182000_extra_class_archive_governance.sql`
- Test: `scripts/test-extra-class-archive-governance.mjs`

**Interfaces:**
- Consumes: `public.can_manage_extra_class_roster()`, `public.is_admin()`, `audit_events`, `work_hub_notifications`, extra-class/member/teacher/session/record tables.
- Produces RPCs:
  - `bes_archive_extra_class(p_class_id uuid) -> jsonb`
  - `bes_list_extra_class_archive() -> setof record`
  - `bes_restore_extra_class_archive(p_archive_id uuid) -> jsonb`
  - `bes_request_extra_class_archive_delete(p_archive_id uuid, p_reason text) -> jsonb`
  - `bes_review_extra_class_archive_delete(p_archive_id uuid, p_approve boolean, p_note text) -> jsonb`
  - `bes_finalize_extra_class_archive_delete(p_archive_id uuid) -> jsonb`

- [ ] **Step 1: Create the archive table and ACLs**

The migration must create a dedicated table similar to:

```sql
create table if not exists public.bes_extra_class_archive (
  id uuid primary key default gen_random_uuid(),
  source_class_id uuid not null,
  class_type text not null,
  class_name text not null,
  subject text not null default '',
  grade_level text not null default '',
  school_year text not null default '',
  class_snapshot jsonb not null,
  members_snapshot jsonb not null default '[]'::jsonb,
  teachers_snapshot jsonb not null default '[]'::jsonb,
  sessions_snapshot jsonb not null default '[]'::jsonb,
  records_snapshot jsonb not null default '[]'::jsonb,
  proof_paths jsonb not null default '[]'::jsonb,
  member_count integer not null default 0,
  teacher_count integer not null default 0,
  session_count integer not null default 0,
  record_count integer not null default 0,
  archived_by uuid not null,
  archived_by_name text not null default '',
  archived_at timestamptz not null default clock_timestamp(),
  delete_request_status text not null default 'none'
    check (delete_request_status in ('none','pending','approved','rejected')),
  delete_requested_by uuid,
  delete_requested_at timestamptz,
  delete_request_reason text not null default '',
  delete_reviewed_by uuid,
  delete_reviewed_at timestamptz,
  delete_review_note text not null default ''
);

create unique index if not exists bes_extra_class_archive_source_uidx
  on public.bes_extra_class_archive(source_class_id);

alter table public.bes_extra_class_archive enable row level security;
revoke all on table public.bes_extra_class_archive from public, anon, authenticated;
```

- [ ] **Step 2: Implement `bes_archive_extra_class` atomically**

Use `for update` on the source class, aggregate snapshots with ordered `jsonb_agg(to_jsonb(...))`, collect non-empty `proof_path` values from class sessions, insert the archive row, then remove operational rows only after the snapshot exists. The function gate must be:

```sql
if not public.can_manage_extra_class_roster() then
  raise exception 'Bạn không có quyền đưa lớp vào Kho lưu trữ.' using errcode = '42501';
end if;
```

Return:

```sql
return jsonb_build_object(
  'archive_id', v_archive_id,
  'class_id', v_class.id,
  'class_name', v_class.class_name,
  'member_count', v_member_count,
  'teacher_count', v_teacher_count,
  'session_count', v_session_count,
  'record_count', v_record_count,
  'archived', true
);
```

Do **not** delete proof objects.

- [ ] **Step 3: Implement list + restore**

`bes_list_extra_class_archive()` may be reached only by Admin or `attendance:manage`, and returns display fields, snapshot counts, proof paths, archive actor/time and delete-request state.

Restore must accept only `none`/`rejected`, reject source id/source-key collisions before any insert, restore in dependency order, and delete the archive row only after all inserts succeed:

```sql
if v_archive.delete_request_status not in ('none', 'rejected') then
  raise exception 'Mục này đang chờ hoặc đã được Admin duyệt xóa, không thể khôi phục.' using errcode = '22023';
end if;
```

Use `jsonb_populate_record` / `jsonb_populate_recordset` so original ids and timestamps are restored.

- [ ] **Step 4: Implement request/review/finalize governance**

Request: Admin or `attendance:manage`, only from `none`/`rejected`, transition to `pending`, store reason/requester and notify every approved Admin with a dedicated type such as `attendance_class_purge_approval` and `item_id = null::uuid`.

Review: Admin-only. `pending -> approved` when `p_approve=true`, otherwise `pending -> rejected`. Return `proof_paths` on approval so the client can remove Storage objects.

Finalize: Admin-only, only `approved`, then delete the archive row and return `{ finalized: true }`.

- [ ] **Step 5: Audit all lifecycle transitions**

Write `audit_events` rows for:

```text
attendance.class_archive
attendance.class_archive_restore
attendance.class_purge_requested
attendance.class_purge_approved
attendance.class_purge_rejected
attendance.class_purge_finalized
```

Use the real `source_module` column and non-null `{}` JSON for `before_data`/`after_data` where appropriate, matching the existing attendance-archive governance pattern.

- [ ] **Step 6: Close the legacy hard-delete bypass**

Replace `bes_delete_extra_class(uuid)` with a compatibility wrapper that returns:

```sql
select public.bes_archive_extra_class(p_class_id);
```

Revoke from `public, anon`; grant only `authenticated`, so the server gate remains authoritative.

- [ ] **Step 7: Run the database contract**

```bash
node scripts/test-extra-class-archive-governance.mjs
node scripts/test-attendance-archive.mjs
node scripts/test-attendance-report-class-creation-permission.mjs
```

Expected: the new contract advances past database assertions; existing attendance archive and report-create boundaries remain PASS.

- [ ] **Step 8: Commit database behavior**

```bash
git add supabase/migrations/20260914182000_extra_class_archive_governance.sql
git commit -m "feat: archive extra classes before deletion"
```

---

### Task 3: Add the class-archive client adapter and safe proof finalization

**Files:**
- Create: `src/attendance/extraClassArchiveApi.js`
- Test: `scripts/test-extra-class-archive-governance.mjs`

**Interfaces:**
- Consumes: Supabase client `.rpc()` and Storage bucket `attendance-session-proofs`.
- Produces the six client functions named in Task 1.

- [ ] **Step 1: Implement the thin RPC adapter**

Use the same `requireClient`/`rpc` pattern as `attendanceArchiveApi.js`:

```js
const ATTENDANCE_PROOF_BUCKET = 'attendance-session-proofs';

export async function archiveExtraClass(client, classId) {
  if (!classId) throw new Error('Không xác định được lớp cần lưu trữ.');
  return rpc(client, 'bes_archive_extra_class', { p_class_id: classId });
}

export async function listExtraClassArchive(client) {
  const rows = await rpc(client, 'bes_list_extra_class_archive');
  return Array.isArray(rows) ? rows : [];
}

export async function restoreExtraClassArchive(client, archiveId) {
  if (!archiveId) throw new Error('Không xác định được lớp cần khôi phục.');
  return rpc(client, 'bes_restore_extra_class_archive', { p_archive_id: archiveId });
}
```

Add request and finalize wrappers with the approved RPC names.

- [ ] **Step 2: Implement review + proof cleanup + finalize**

```js
export async function reviewExtraClassArchiveDelete(client, archiveId, approve, note = '') {
  const review = await rpc(client, 'bes_review_extra_class_archive_delete', {
    p_archive_id: archiveId,
    p_approve: approve === true,
    p_note: String(note || '').trim(),
  });
  if (approve !== true) return review;

  const proofPaths = [...new Set(
    (Array.isArray(review?.proof_paths) ? review.proof_paths : [])
      .map((value) => String(value || '').trim())
      .filter(Boolean),
  )];
  if (proofPaths.length) {
    if (!client?.storage?.from) {
      throw new Error('Admin đã duyệt xóa nhưng dịch vụ lưu trữ chưa sẵn sàng. Gói lớp vẫn được giữ để thử lại.');
    }
    const { error } = await client.storage.from(ATTENDANCE_PROOF_BUCKET).remove(proofPaths);
    if (error) {
      throw new Error(`Admin đã duyệt xóa nhưng chưa thể xóa minh chứng: ${error.message || 'lỗi Storage'}. Gói lớp vẫn được giữ để thử lại.`);
    }
  }
  const finalized = await finalizeExtraClassArchiveDelete(client, archiveId);
  return { ...review, ...finalized };
}
```

- [ ] **Step 3: Run the contract**

```bash
node scripts/test-extra-class-archive-governance.mjs
```

Expected: API assertions PASS; UI assertions may still be RED.

- [ ] **Step 4: Commit the adapter**

```bash
git add src/attendance/extraClassArchiveApi.js
git commit -m "feat: add extra class archive client adapter"
```

---

### Task 4: Replace class hard-delete UI with archive-first behavior

**Files:**
- Modify: `src/components/GlobalAttendanceNavigationTab.jsx`
- Modify: `src/components/attendance/AttendanceClassManagementWorkspace.jsx`
- Test: `scripts/test-extra-class-archive-governance.mjs`
- Regression: `scripts/test-attendance-manage-two-step-tiles.mjs`

**Interfaces:**
- Consumes: `archiveExtraClass`, `hasAttendanceTabAccess(currentUser, 'manage')`, existing class/member/teacher/session state.
- Produces: explicit `canArchiveClass` UI capability and archive-first `deleteClass(classRow)` handler.

- [ ] **Step 1: Import the new adapter and derive class archive capability**

In `GlobalAttendanceNavigationTab.jsx`:

```js
import {
  archiveExtraClass,
  listExtraClassArchive,
  requestExtraClassArchiveDelete,
  restoreExtraClassArchive,
  reviewExtraClassArchiveDelete,
} from '../attendance/extraClassArchiveApi.js';

const canArchiveClass = isAdmin || hasAttendanceTabAccess(currentUser, 'manage');
```

Do not use `attendance:report` as a mutation capability.

- [ ] **Step 2: Replace `deleteClass` hard deletion**

Compute member/teacher/session counts from already-loaded state and show an archive-specific confirmation:

```js
const confirmed = window.confirm(
  `Đưa lớp “${classRow.class_name}” vào Kho lưu trữ?\n\n`
  + `${memberCount} học sinh · ${teacherCount} giáo viên · ${sessionCount} buổi điểm danh sẽ được lưu cùng lớp.\n\n`
  + 'Lớp có thể khôi phục sau này. Xóa vĩnh viễn vẫn phải được Admin duyệt.'
);
```

Then call only:

```js
const result = await archiveExtraClass(client, classRow.id);
```

On success clear selected class/session state, refresh active data + class archive, and show `Đã đưa lớp … vào Kho lưu trữ.` Do not call `removeAttendanceProofPaths`.

- [ ] **Step 3: Gate the workspace delete action explicitly**

Add prop:

```jsx
canArchiveClass={canArchiveClass}
```

In `AttendanceClassManagementWorkspace.jsx`, receive `canArchiveClass = false` and render the danger button only when true:

```jsx
{canArchiveClass ? (
  <button type="button" className="is-danger" disabled={busy}
    onClick={() => deleteClass?.(selectedClass)}>
    <WorkspaceIcon name="trash" size={15} />Xóa lớp
  </button>
) : null}
```

This keeps report-only/read-only views non-destructive even if they can see class data.

- [ ] **Step 4: Run UI + regression contracts**

```bash
node scripts/test-extra-class-archive-governance.mjs
node scripts/test-attendance-manage-two-step-tiles.mjs
node scripts/test-attendance-report-class-creation-permission.mjs
```

Expected: no direct `bes_delete_extra_class` call remains in navigation; report-only creation remains available but does not gain archive controls.

- [ ] **Step 5: Commit the archive-first class action**

```bash
git add src/components/GlobalAttendanceNavigationTab.jsx src/components/attendance/AttendanceClassManagementWorkspace.jsx
git commit -m "feat: move deleted extra classes into archive"
```

---

### Task 5: Unify whole-class items into the Archive tab without leaking attendance-history archives

**Files:**
- Modify: `src/components/GlobalAttendanceNavigationTab.jsx`
- Modify: `src/components/attendance/AttendanceArchivePanel.jsx`
- Modify: `src/components/attendance/AttendanceArchive.css`
- Test: `scripts/test-extra-class-archive-governance.mjs`
- Regression: `scripts/test-attendance-archive.mjs`

**Interfaces:**
- Consumes: attendance-history archive items only when caller has `attendance:delete`; class archive items only when caller is Admin/`attendance:manage`.
- Produces: one Archive tab that renders two backing collections safely.

- [ ] **Step 1: Maintain separate archive collections in navigation**

Keep existing session archive state and add `classArchiveItems` + `classArchiveLoading`. Load them independently:

```js
const canUseAttendanceHistoryArchive = isAdmin
  || hasExplicitPermissionId(currentUser, ATTENDANCE_PERMISSION_IDS.delete);
const canUseClassArchive = isAdmin || hasAttendanceTabAccess(currentUser, 'manage');
const canOpenArchive = canUseAttendanceHistoryArchive || canUseClassArchive;
```

Only call `listAttendanceArchive` when `canUseAttendanceHistoryArchive`; only call `listExtraClassArchive` when `canUseClassArchive`. This prevents a manage-only user from seeing session archives they were never granted.

The Archive badge count becomes:

```js
const archiveCount = attendanceArchiveItems.length + classArchiveItems.length;
```

- [ ] **Step 2: Add class restore/request/review handlers**

Use explicit handlers that call the class adapter and then refresh both active classes and class archive. Request reason and Admin review note may use the same prompt/confirm interaction style already used by the attendance archive.

- [ ] **Step 3: Extend `AttendanceArchivePanel` with two typed collections**

Change props to include:

```js
items = [],
classItems = [],
canManageClasses = false,
onRestoreClass,
onRequestDeleteClass,
onApproveDeleteClass,
onRejectDeleteClass,
```

Normalize render items with a discriminator:

```js
const combined = [
  ...items.map((item) => ({ ...item, archive_kind: 'attendance' })),
  ...classItems.map((item) => ({ ...item, archive_kind: 'class', source_type: 'class' })),
];
```

Add source filter option:

```jsx
<option value="class">Lớp học</option>
```

Class cards must show `Lớp học`, type/subject/grade/school year and `{member_count} HS · {teacher_count} GV · {session_count} buổi điểm danh` instead of a single attendance date.

Action rules:

```js
const mayMutate = item.archive_kind === 'class' ? canManageClasses : true;
const restorable = !pending && !approved && mayMutate;
```

Admin review buttons remain `isAdmin`-only.

- [ ] **Step 4: Add responsive class-card styling**

Add a dedicated class source badge and snapshot count line while preserving current breakpoints:

```css
.attendance-archive__source.is-class { background: #f0fdf4; color: #166534; }
.attendance-archive__counts { display: flex; flex-wrap: wrap; gap: 8px; color: #475569; font-size: .8rem; }
```

Do not remove existing mobile single-column action behavior.

- [ ] **Step 5: Run archive contracts**

```bash
node scripts/test-extra-class-archive-governance.mjs
node scripts/test-attendance-archive.mjs
node scripts/test-attendance-archive-entry-permission.mjs
```

Expected: PASS. Existing `attendance:delete`-only user still lands in Archive; manage-only user gains only the class archive collection.

- [ ] **Step 6: Commit unified archive UI**

```bash
git add src/components/GlobalAttendanceNavigationTab.jsx src/components/attendance/AttendanceArchivePanel.jsx src/components/attendance/AttendanceArchive.css
git commit -m "feat: show archived classes in attendance archive"
```

---

### Task 6: Full verification, PR review and production handoff

**Files:**
- Verify all files from Tasks 1-5.
- No new implementation file unless a failing check identifies a concrete regression.

**Interfaces:**
- Consumes: all completed feature changes.
- Produces: reviewable PR with fresh passing evidence.

- [ ] **Step 1: Run all focused contracts**

```bash
node scripts/test-extra-class-archive-governance.mjs
node scripts/test-attendance-archive.mjs
node scripts/test-attendance-manage-two-step-tiles.mjs
node scripts/test-attendance-report-class-creation-permission.mjs
node scripts/test-attendance-granular-permissions.mjs
```

Expected: PASS.

- [ ] **Step 2: Run production build**

```bash
npm ci --ignore-scripts
npm run build
```

Expected: Vite production bundles complete successfully.

- [ ] **Step 3: Open a PR from `feat/extra-class-archive-governance` to `main`**

PR body must explicitly state:

```text
- delete class is now archive-first
- Admin + attendance:manage may archive/restore/request purge
- only Admin may approve/reject/finalize purge
- class/member/teacher/session/record snapshots restore atomically
- proof files survive archive and are deleted only after Admin approval
- existing attendance-history archive remains permission-separated
```

- [ ] **Step 4: Verify GitHub Actions**

Require fresh PASS for:

```text
Attendance Archive
Frontend Build
Critical E2E
Supabase Egress P0 Guard
Supabase Egress P1 Guard
Supabase Egress P2 Guard
```

If a workflow fails, inspect the exact failing step/log and fix the root cause before merge; do not merge on a stale green run.

- [ ] **Step 5: Review the PR diff for scope/security regressions**

Confirm no report-only mutation gate, no Storage deletion during archive/restore, no direct frontend `bes_delete_extra_class`, no change to Học bổ sung, and no widening of attendance-history archive visibility.

- [ ] **Step 6: Merge only after verification**

Merge the PR into `main`, then check the merged commit's Vercel status. Do not claim production completion until Vercel reports success and the database migration has been applied to production Supabase.