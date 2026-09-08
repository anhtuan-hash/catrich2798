# Attendance Hub, Absence Reasons, and Professional Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing extra-class attendance module with fast class discovery, structured absence reasons, room/time session snapshots, day/month reporting, and school-branded PDF/XLSX exports.

**Architecture:** Keep `GlobalAttendanceNavigationTab.jsx` as the attendance shell/state owner, but move report calculation/export responsibilities into focused utilities and the existing attendance-report component. Extend Supabase additively first so production remains compatible, then switch the frontend to richer RPC signatures and harden old signatures after Vercel is serving the new client. Use the user-supplied Pétrus Ký logo as a local asset for PDF; extend the existing dependency-free XLSX writer instead of adding a new spreadsheet dependency.

**Tech Stack:** React 18, Vite, Supabase/Postgres PL/pgSQL, scoped CSS/Material 3, Node contract/unit tests, Playwright Critical E2E, dependency-free XLSX XML/ZIP writer, browser print-to-PDF.

**Spec:** `docs/superpowers/specs/2026-09-08-attendance-hub-absence-report-export-design.md`

## Global Constraints

- Scope is only `Điểm danh lớp phụ đạo & bồi dưỡng`; do not redesign unrelated Brian English screens.
- Keep class/day and teacher/day locks authoritative at database level.
- Teacher options continue to come from class assignments/manual additions, never website account registrations.
- Completed sessions require teacher, `lesson_periods ∈ {1,1.5,2}`, room, and teaching time; cancelled sessions remain `0 tiết`, no attendance records, no teacher occupancy.
- Every new absent record requires one of `excused`, `unexcused`, `sick`, `family`, `other`; `other` requires a note. Legacy absent rows use `unspecified`.
- Historical room/time stays blank and is displayed as `Chưa ghi`; do not fabricate legacy values.
- New write RPCs stay Admin-only, `SECURITY DEFINER`, `set search_path = public`, revoke `public/anon`, grant `authenticated`.
- PDF is A4 portrait and uses the supplied Pétrus Ký logo; no handwritten signature image, school photo, or slogan.
- Excel must be visibly formatted on open: merges, widths, heights, styles, wrapping, freeze panes, and autofilters.
- Use TDD for behavior/data changes. Frontend Build, Critical E2E, Supabase P0/P1/P2, and Vercel must be green before completion.

---

### Task 1: Add attendance detail schema and richer transactional RPCs

**Files:**
- Create: `supabase/migrations/20260908_attendance_absence_room_time.sql`
- Create: `supabase/migrations/20260908_attendance_absence_room_time_hardening.sql`
- Modify: `supabase/extra-class-attendance.sql`
- Create: `scripts/test-attendance-absence-room-time.mjs`
- Modify: `.github/workflows/frontend-build.yml`

**Interfaces:**
- Produces session fields `teaching_room text`, `teaching_time_range text`.
- Produces record fields `absence_reason_code text`, `absence_note text`.
- Produces rich confirm RPC:
  `bes_confirm_extra_class_attendance(p_class_id uuid, p_attendance_date date, p_teacher_name text, p_lesson_periods numeric, p_absence_details jsonb, p_note text, p_teaching_room text, p_teaching_time_range text)`.
- Produces rich cancel RPC:
  `bes_cancel_extra_class_session(p_class_id uuid, p_attendance_date date, p_cancellation_reason text, p_teaching_room text, p_teaching_time_range text)`.

- [ ] **Step 1: Write the failing database contract**

Create `scripts/test-attendance-absence-room-time.mjs` that reads the migration and asserts:

```js
assert.match(sql, /teaching_room\s+text\s+not\s+null\s+default\s+''/i);
assert.match(sql, /teaching_time_range\s+text\s+not\s+null\s+default\s+''/i);
assert.match(sql, /absence_reason_code\s+text\s+not\s+null\s+default\s+''/i);
assert.match(sql, /absence_note\s+text\s+not\s+null\s+default\s+''/i);
for (const code of ['excused','unexcused','sick','family','other','unspecified']) assert.match(sql, new RegExp(code));
assert.match(sql, /p_absence_details\s+jsonb/i);
assert.match(sql, /p_teaching_room\s+text/i);
assert.match(sql, /p_teaching_time_range\s+text/i);
assert.match(sql, /Giáo viên[\s\S]*đã được điểm danh tại lớp/i);
assert.match(sql, /security\s+definer/i);
assert.match(sql, /search_path\s*=\s*public/i);
assert.match(sql, /from\s+anon/i);
```

Add workflow step:

```yaml
- name: Verify attendance absence room/time contract
  run: node scripts/test-attendance-absence-room-time.mjs
```

- [ ] **Step 2: Run RED**

Run the PR Frontend Build. Expected: only the new attendance-detail contract fails because the migration/signatures do not exist yet.

- [ ] **Step 3: Implement additive schema/backfill**

Migration must add:

```sql
alter table public.bes_extra_attendance_sessions
  add column if not exists teaching_room text not null default '',
  add column if not exists teaching_time_range text not null default '';

alter table public.bes_extra_attendance_records
  add column if not exists absence_reason_code text not null default '',
  add column if not exists absence_note text not null default '';

update public.bes_extra_attendance_records
set absence_reason_code = 'unspecified'
where status = 'absent' and trim(absence_reason_code) = '';
```

Add constraints so present records have empty reason/note, absent rows have an allowed reason, and `other` requires a non-empty note. Do not require room/time at table level because historical rows intentionally stay blank; enforce new-session room/time inside the rich confirm RPC.

- [ ] **Step 4: Implement rich confirm RPC**

The RPC validates Admin/date/teacher/period/class/day/teacher-day exactly as the current hardened function does, then:

```sql
v_room := trim(coalesce(p_teaching_room,''));
v_time := trim(coalesce(p_teaching_time_range,''));
if v_room = '' then raise exception 'Vui lòng nhập phòng học.' using errcode='22023'; end if;
if v_time = '' then raise exception 'Vui lòng nhập thời gian dạy.' using errcode='22023'; end if;
```

`p_absence_details` is a JSON array of objects:

```json
[{"member_key":"identity:...","reason_code":"sick","note":"Sốt"}]
```

Server validation must reject unknown members, duplicate member keys, disallowed reason codes, and `other` without note. The RPC derives the absent set from this JSON rather than trusting a separate array. It inserts session snapshot room/time and record-level reason/note in the same transaction.

- [ ] **Step 5: Implement rich cancel RPC**

Cancelled session keeps teacher blank, zero periods/counts, no attendance records. Snapshot `p_teaching_room` / `p_teaching_time_range` when supplied, otherwise fall back to `v_class.room` / `v_class.time_range`; blanks are allowed for cancellation.

- [ ] **Step 6: Preserve compatibility for rollout**

During the first migration, keep the current 6-argument confirm and 3-argument cancel signatures so the currently deployed frontend keeps working. After the new frontend is deployed, `20260908_attendance_absence_room_time_hardening.sql` explicitly drops those legacy signatures and leaves only the rich signatures.

- [ ] **Step 7: Mirror the fresh installer and run GREEN**

Update `supabase/extra-class-attendance.sql` with the same fields, constraints, and final rich RPCs. Re-run the contract; expected PASS.

- [ ] **Step 8: Commit**

Commit schema/RPC/test/workflow changes as `feat: store attendance absence reasons and room time`.

### Task 2: Add subject hub, fast search, room/time controls, and absence-reason draft behavior

**Files:**
- Modify: `src/utils/extraClassAttendance.js`
- Modify: `src/components/GlobalAttendanceNavigationTab.jsx`
- Modify: `src/components/attendance/AttendanceMaterial3.css`
- Create: `scripts/test-attendance-hub-absence-ui.mjs`
- Modify: `.github/workflows/frontend-build.yml`

**Interfaces:**
- Produces `attendanceSubjectKey(subject)` and stable subject token names.
- `buildAttendanceDraft()` produces each member with `{ present: true, absence_reason_code: '', absence_note: '' }`.
- Quick confirm sends `p_absence_details`, `p_teaching_room`, `p_teaching_time_range`.

- [ ] **Step 1: Write failing UI contract**

Assert the component/CSS contain:

```js
for (const text of ['Tìm nhanh lớp','Tất cả','Toán','Ngữ văn','Tiếng Anh','Vật lí','Hóa học','Sinh học','Lịch sử','Địa lí']) assert.match(attendance, new RegExp(text));
for (const reason of ['Có phép','Không phép','Ốm','Việc gia đình','Khác']) assert.match(attendance, new RegExp(reason));
assert.match(attendance, /Phòng học/);
assert.match(attendance, /Thời gian dạy/);
assert.match(attendance, /p_absence_details/);
assert.match(css, /is-subject-math/);
assert.match(css, /is-subject-english/);
assert.match(css, /is-subject-chemistry/);
```

Add the test to Frontend Build.

- [ ] **Step 2: Run RED**

Expected: new UI contract fails.

- [ ] **Step 3: Extend draft utilities**

Change `buildAttendanceDraft()` so each row includes structured absence fields. Add helpers:

```js
export const ABSENCE_REASON_OPTIONS = [
  ['excused','Có phép'], ['unexcused','Không phép'], ['sick','Ốm'],
  ['family','Việc gia đình'], ['other','Khác'],
];

export function attendanceSubjectKey(subject = '') { /* accent-insensitive mapping */ }
```

Map `Toán/Casio` before generic `Toán`.

- [ ] **Step 4: Add search + subject hub**

Add state `classQuery` and `subjectFilter`. Build `filteredActiveClasses` from active classes using accent-insensitive match against class name, subject, and `teachersForClass(classRow)`. Render a horizontally scrollable hub with counts and stable subject classes such as `is-subject-math`, `is-subject-english`, `is-subject-chemistry`.

- [ ] **Step 5: Add session room/time state**

Add `teachingRoom` and `teachingTimeRange`. When class/date changes with no locked session, prefill from `selectedClass.room` / `selectedClass.time_range`; when loading a locked session use its snapshot. Completed confirm button is disabled until both are non-empty.

- [ ] **Step 6: Add inline absence reason UI**

When a checkbox marks a student absent, reveal reason chips/select plus note. `Khác` requires note. Unticking resets both fields. Before RPC, validate every absent row and build:

```js
const absenceDetails = draft
  .filter(row => row.present === false)
  .map(row => ({ member_key: row.member_key, reason_code: row.absence_reason_code, note: row.absence_note.trim() }));
```

- [ ] **Step 7: Call rich RPCs and keep existing locks**

Confirm call sends room/time and JSON absence details. Cancel call sends planned room/time. Existing teacher/day UI disabling and class/day lock remain unchanged.

- [ ] **Step 8: Style Material 3 subject colors and expanded absent rows**

Use distinct stable tones for math/ casio/literature/English/physics/chemistry/biology/history/geography, with color only as an accent; keep text badges for subject/type. Expanded absent controls must fit the roster scroll viewport without hiding the fixed action bar.

- [ ] **Step 9: Run GREEN and commit**

Expected: new UI contract plus existing Material 3 / teacher-day contracts and production build pass. Commit `feat: add attendance subject hub and absence reasons`.

### Task 3: Generalize reporting to day/month with full session and absence detail

**Files:**
- Modify: `src/utils/attendanceReport.js`
- Modify: `src/components/attendance/AttendanceMonthlyReport.jsx`
- Modify: `src/components/attendance/AttendanceMonthlyReport.css`
- Modify: `src/components/GlobalAttendanceNavigationTab.jsx`
- Modify: `scripts/test-attendance-report-aggregation.mjs`
- Modify: `scripts/test-attendance-monthly-report-ui.mjs`

**Interfaces:**
- Produces `buildAttendanceReport({ sessions, records, classes, mode, month, date, classId, teacherName })`.
- Keep compatibility export `buildAttendanceMonthlyReport(args)` as a thin wrapper during this PR.
- Report rows include room, teaching time, checked time, class type, attendance rate, structured absence labels/notes.

- [ ] **Step 1: Extend aggregation test to RED**

Add fixtures with `teaching_room`, `teaching_time_range`, `checked_at`, `absence_reason_code`, `absence_note`. Assert exact-day mode:

```js
const day = buildAttendanceReport({ sessions, records, classes:[], mode:'day', date:'2026-09-10', classId:'all', teacherName:'all' });
assert.equal(day.sessionRows.length, 1);
assert.equal(day.sessionRows[0].teaching_room, 'P.203');
assert.equal(day.absenceRows[0].reason_label, 'Ốm');
```

Also assert month mode still computes current totals.

- [ ] **Step 2: Implement period-agnostic report builder**

Normalize legacy data (`completed`, 1 period, empty room/time → `Chưa ghi` only at presentation). Filter by exact `attendance_date` for day mode or `YYYY-MM` for month mode, then class/teacher. Enrich session and absence rows with:

```js
{
  class_type, teaching_room, teaching_time_range, checked_at,
  total_students, present_count, absent_count, attendance_rate,
  reason_code, reason_label, absence_note
}
```

- [ ] **Step 3: Convert the report component to mode-aware UI**

Keep the file name for import stability but render a segmented control `Theo tháng | Theo ngày`. Add `type="date"` for day mode and retain `type="month"` for month mode. Query only the requested date/range and then only related records.

- [ ] **Step 4: Add reporter metadata and remarks**

State:

```js
reporterName, reporterTitle, generalRemarks
```

Use `localStorage` keys `attendance.reporterName` and `attendance.reporterTitle` only for convenience. `generalRemarks` auto-fills from metrics when the period/filter changes unless the Admin has manually edited it. Export metadata includes mode, period label, class label, teacher label, reporter name/title, remarks, generated-at date.

- [ ] **Step 5: Expand on-screen detail tables**

Session detail shows date, teaching time, checked time, class/type/subject, room, teacher, status, periods, size/present/absent/rate, note/reason. Add an absence-detail surface with student, regular class, reason/note, extra class, subject, teacher, date, teaching time, checked time, room.

- [ ] **Step 6: Run GREEN and commit**

Expected: aggregation + report UI tests and build pass. Commit `feat: add daily attendance reporting and full details`.

### Task 4: Replace PDF printout with branded A4 portrait report

**Files:**
- Create binary asset: `src/assets/petrus-ky-school-logo.png` from the user-supplied logo image `/mnt/data/fc7e9b01-8cc3-4507-85b2-016ca954406d.png`.
- Modify: `src/utils/attendanceReportExport.js`
- Modify: `scripts/test-attendance-report-export.mjs`

**Interfaces:**
- `printAttendanceReportPdf(report, metadata)` continues as the public UI API.
- PDF metadata accepts `{ mode, month, date, periodLabel, classLabel, teacherLabel, reporterName, reporterTitle, generalRemarks }`.

- [ ] **Step 1: Add logo asset to the branch**

Commit the exact supplied school logo as a local application asset. Do not fetch it remotely at export time.

- [ ] **Step 2: Extend PDF contract to RED**

Assert source includes:

```js
assert.match(reportExport, /@page\s*\{[^}]*size\s*:\s*A4\s+portrait/i);
for (const copy of ['SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH','TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ','THỐNG KÊ THEO GIÁO VIÊN','CHI TIẾT BUỔI HỌC','CHI TIẾT HỌC SINH VẮNG','NHẬN XÉT CHUNG','NGƯỜI BÁO CÁO']) assert.match(reportExport, new RegExp(copy));
assert.match(reportExport, /petrus-ky-school-logo/);
```

- [ ] **Step 3: Build branded print HTML**

Use the reference layout as visual direction: school logo/header, centered dynamic report title, four tonal KPI cards, green section headers/tables, remarks block, and reporter footer. Do not copy the reference's handwritten slogan or landscape artwork. Use `DD/MM/YYYY`, Vietnamese decimal commas, and `Asia/Ho_Chi_Minh` for confirmation time.

- [ ] **Step 4: Make long reports print safely**

CSS requirements:

```css
@page { size: A4 portrait; margin: 10mm 9mm 12mm; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
.report-section-title { break-after: avoid; }
```

Allow long notes to wrap. Empty absence data renders `Không có học sinh vắng trong phạm vi báo cáo.` rather than an empty table.

- [ ] **Step 5: Run GREEN and commit**

Expected: PDF contract and production build pass. Commit `feat: brand attendance PDF report`.

### Task 5: Extend the XLSX engine and generate a fully formatted workbook

**Files:**
- Modify: `src/utils/simpleXlsx.js`
- Modify: `src/utils/attendanceReportExport.js`
- Modify: `scripts/test-attendance-report-export.mjs`

**Interfaces:**
- Extend `createXlsxBlob(sheets)` to accept per-sheet metadata:

```js
{
  name,
  rows,                 // cells may be raw values or { value, style }
  merges: ['A1:G1'],
  columns: [{ width: 14 }, ...],
  rowHeights: { 1: 28 },
  freeze: { rows: 1 },
  autoFilter: 'A6:G20'
}
```

- Stable style names/ids used by attendance export: `title`, `schoolHeader`, `section`, `tableHeader`, `body`, `bodyCenter`, `metricBlue`, `metricGreen`, `metricPurple`, `metricAmber`, `percent`, `decimal`, `wrap`.

- [ ] **Step 1: Extend XLSX contract to RED**

Assert generated source/package supports `<mergeCells>`, `<cols>`, row custom heights, `<autoFilter>`, pane freeze, and multiple cell style XFs/fills/borders. Keep the current ZIP/XLSX MIME assertions.

- [ ] **Step 2: Extend worksheet/style XML generator**

Generate deterministic `styles.xml` with school green headers, white bold font, thin borders, wraps, center alignment, KPI fills, percentage and decimal formats. Cell objects map style name to a style index. Preserve raw primitive compatibility so existing callers do not break.

- [ ] **Step 3: Generate four formatted attendance sheets**

`Tổng quan`: merged school/report headings, period/filter/reporter metadata, KPI block, general remarks.

`Theo giáo viên`: green table header, teacher sessions/periods/classes/present/absent/rate, widths, frozen header, autofilter.

`Chi tiết buổi học`: all required session columns including room, teaching time, checked time, attendance counts/rate/status/note.

`Chi tiết vắng`: student/name/class, structured reason/note, extra class/subject/teacher/date/teaching time/checked time/room.

- [ ] **Step 4: Use Vietnamese sheet names**

Use visible names `Tổng quan`, `Theo giáo viên`, `Chi tiết buổi học`, `Chi tiết vắng`; adjust regression assertions accordingly. Filename is `bao-cao-diem-danh-<period>.xlsx`.

- [ ] **Step 5: Run GREEN and commit**

Expected: XLSX export contract + build pass. Commit `feat: format attendance Excel reports`.

### Task 6: Full regression, rollout, hardening, and production verification

**Files:**
- No feature file changes unless verification uncovers a defect.

**Interfaces:**
- Production project: `xpkbgqdlfonsinriggmj`.
- Branch: `feat/attendance-hub-absence-reports` → PR into `main`.

- [ ] **Step 1: Run complete PR CI on final head**

Require success for:

```text
Frontend Build
Critical E2E
Supabase Egress P0 Guard
Supabase Egress P1 Guard
Supabase Egress P2 Guard
```

Frontend Build must include all existing attendance contracts plus the new schema/UI/export contract.

- [ ] **Step 2: Review the final diff**

Confirm no unrelated application area was restyled, no website-account teacher lookup was reintroduced, no temporary patch scripts remain, and the supplied logo is used only as the report asset.

- [ ] **Step 3: Apply additive production migration**

Apply `20260908_attendance_absence_room_time.sql`. Verify columns, constraints, rich RPC grants/security, historical absent rows backfilled to `unspecified`, and no existing session room/time fabricated.

- [ ] **Step 4: Transaction-test production and roll back**

Inside a transaction with Admin auth context, confirm a sample completed session writes one room/time snapshot plus structured absence reason/note, retains class/day and teacher/day locks, and `other` without note is rejected. Confirm a cancelled session remains zero periods/no attendance records. Roll back the transaction and verify no test rows remain.

- [ ] **Step 5: Merge PR and wait for Vercel**

Squash-merge only after final PR CI is green. Verify Vercel status for the exact merge SHA is `success` before hardening legacy RPCs.

- [ ] **Step 6: Apply hardening migration**

Apply `20260908_attendance_absence_room_time_hardening.sql` to drop the current 6-argument confirm and 3-argument cancel functions. Query `pg_proc`/ACLs to verify only the rich signatures remain and `anon_execute=false`.

- [ ] **Step 7: Final production checks**

Verify: subject hub/search render, room/time/absence controls can be used, day report and month report query correctly, PDF print popup uses A4 portrait branded document, Excel opens as a styled 4-sheet workbook, and Vercel remains `success`.
