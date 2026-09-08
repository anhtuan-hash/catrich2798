# Attendance Hub, Absence Reasons, and Professional Report Exports

**Date:** 2026-09-08  
**Scope:** `Điểm danh lớp phụ đạo & bồi dưỡng` only  
**Status:** Design approved in chat; written spec awaiting final user review before implementation planning.

## 1. Goals

Upgrade the existing attendance module without redesigning unrelated Brian English areas. The change has five connected goals:

1. Make active classes faster to find through search, subject hubs, and stable subject-specific Material 3 colors.
2. Capture a structured reason and optional note for every absent student.
3. Capture the actual teaching room and teaching time for each completed attendance session, while keeping the server confirmation timestamp separately.
4. Extend Reporting to support both a selected month and a selected date, with full class/session/absence information and editable reporter identity before export.
5. Replace the current plain PDF/Excel exports with school-branded, professionally formatted outputs inspired by the supplied Pétrus Ký report reference.

## 2. Non-goals

- Do not redesign the rest of the Brian English application.
- Do not reintroduce teacher selection from website account registrations.
- Do not add a handwritten signature image, school photograph, or handwritten slogan to the report. The school logo and restrained green decorative elements are sufficient.
- Do not create a separate absence-reason taxonomy table in this iteration.

## 3. Quick Attendance: Search and Subject Hub

### 3.1 Search

Add a compact search field above the active-class list. Search is accent-insensitive and case-insensitive and matches:

- class name;
- subject;
- assigned teacher names.

Search combines with the selected subject hub filter. A clear button resets the query without changing the selected class.

### 3.2 Subject hub

Add a horizontally scrollable Material 3 subject hub above the class list:

`Tất cả · Toán · Toán/Casio · Ngữ văn · Tiếng Anh · Vật lí · Hóa học · Sinh học · Lịch sử · Địa lí`

Each hub chip shows the number of active classes in that subject. The list updates immediately when the user changes the selected subject.

### 3.3 Stable subject colors

Use stable semantic colors rather than making every class visually identical. Color is not the only distinction; every card still shows subject and class type text.

Suggested palette:

- Toán: indigo
- Toán/Casio: purple
- Ngữ văn: rose
- Tiếng Anh: teal
- Vật lí: blue
- Hóa học: amber
- Sinh học: green
- Lịch sử: orange
- Địa lí: cyan
- unknown/other: neutral

Apply the subject color to a small leading accent, subject chip, and/or count badge. The selected class still receives a Material primary-container surface so selection remains unambiguous. `Phụ đạo` and `Bồi dưỡng HSG` remain explicit text badges and are not distinguished by color alone.

## 4. Attendance Session Fields

The existing daily lock, teacher/day lock, teacher selection, lesson-period selection, and cancellation behavior remain in force.

### 4.1 New session snapshots

Add snapshot fields to `bes_extra_attendance_sessions`:

- `teaching_room text not null default ''`
- `teaching_time_range text not null default ''`

The quick-attendance controls add:

- **Phòng học**
- **Thời gian dạy**

Both are prefilled from `bes_extra_classes.room` and `bes_extra_classes.time_range` when available. Admin can override them for the specific session before confirmation.

For a **completed** session, both values are required. This guarantees new reports contain room and teaching time. For a **cancelled** session, the planned room/time are snapshotted when available but are not required.

`checked_at` remains the separate server-side confirmation timestamp. Reports therefore show both:

- **Giờ dạy** (`teaching_time_range`), e.g. `14:00–15:30`;
- **Giờ chốt điểm danh** (`checked_at` in `Asia/Ho_Chi_Minh`), e.g. `14:07:26`.

Historical sessions must not be assigned fabricated room/time values. Existing rows are backfilled with empty strings and reports display `Chưa ghi` when those historical values are unavailable.

## 5. Structured Absence Reasons

### 5.1 Data model

Add to `bes_extra_attendance_records`:

- `absence_reason_code text not null default ''`
- `absence_note text not null default ''`

Allowed codes for absent records:

- `excused` → `Có phép`
- `unexcused` → `Không phép`
- `sick` → `Ốm`
- `family` → `Việc gia đình`
- `other` → `Khác`
- `unspecified` → `Chưa ghi lý do` (legacy compatibility only)

Present records keep both fields empty. Historical absent records are backfilled as `unspecified`; they are not silently assigned a reason that was never recorded.

### 5.2 Quick-attendance interaction

When Admin ticks **Vắng** for a student, that row expands inline to show:

- quick reason chips/select: `Có phép · Không phép · Ốm · Việc gia đình · Khác`;
- a short optional note field.

Rules:

- An absent student must have a reason before the session can be confirmed.
- `Khác` additionally requires a non-empty note.
- Unticking **Vắng** clears the draft reason and note for that student.
- Locked/confirmed sessions show the saved reason read-only.

### 5.3 RPC contract

Keep the existing transactional confirmation flow but extend the confirmation RPC to receive structured absence details. The preferred contract is a `jsonb` map/list keyed by `member_key`, in addition to the existing attendance/session fields. Server validation must verify:

- each absent key belongs to an active class member;
- each absent member has an allowed reason;
- `other` has a note;
- present members do not receive absence details;
- teacher/day and class/day locks still hold.

The server inserts session and record snapshots in one transaction.

## 6. Reporting Modes and Filters

Rename the report concept from month-only to a general attendance report with a segmented mode control:

- **Theo tháng**
- **Theo ngày**

### 6.1 Month mode

Filters:

- month picker;
- class (`Tất cả lớp` or one class);
- teacher (`Tất cả giáo viên` or one teacher).

### 6.2 Day mode

Filters:

- date picker;
- class;
- teacher.

The query must fetch only the requested date/range and related attendance records. Do not depend on the 400-row history list.

### 6.3 Reporter identity

Before export, show editable fields:

- **Người báo cáo**
- **Chức vụ**

They are free-entry inputs with optional browser-side remembered last values. They are export metadata, not attendance data, and do not need a new database table.

Also provide an editable **Nhận xét chung** field prefilled with a neutral automatic summary derived from the filtered metrics. Admin may change it before export.

## 7. Report Data Requirements

Every completed session row in on-screen reports, PDF, and Excel must expose:

- ngày học;
- giờ dạy;
- giờ chốt điểm danh;
- lớp phụ đạo/bồi dưỡng;
- loại lớp;
- môn học;
- phòng học;
- giáo viên thực dạy;
- số tiết;
- sĩ số;
- số học sinh có mặt;
- số học sinh vắng;
- tỷ lệ chuyên cần;
- trạng thái;
- ghi chú buổi học.

Cancelled sessions show:

- date;
- class/subject;
- planned room/time when available;
- `Đã hủy`;
- `0 tiết`;
- cancellation reason;
- no teacher occupancy and no student attendance counts.

Every absent-student detail row must expose:

- họ và tên;
- mã HS when available;
- lớp chính khóa;
- lý do vắng;
- ghi chú lý do;
- lớp phụ đạo/bồi dưỡng;
- môn học;
- giáo viên dạy;
- ngày;
- giờ dạy;
- giờ chốt;
- phòng học.

## 8. Monthly/Day Aggregation

The report utility becomes period-agnostic: it accepts either a month range or one exact date, then applies class and teacher filters.

Metrics include:

- completed sessions;
- cancelled sessions;
- total lesson periods;
- present instances;
- absent instances;
- attendance rate.

Teacher rows include:

- teacher name;
- completed sessions;
- total periods;
- distinct classes;
- present instances;
- absent instances;
- attendance rate.

Absence rows include structured reason labels and notes.

## 9. PDF Export Design

Replace the current plain landscape printout with a dedicated **A4 portrait** school-branded print document inspired by the supplied reference.

### 9.1 First-page composition

1. Pétrus Ký school logo at top-left.
2. Text header:
   - `SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH`
   - `TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ`
3. Dynamic title:
   - `BÁO CÁO ĐIỂM DANH THEO THÁNG` + month/year; or
   - `BÁO CÁO ĐIỂM DANH THEO NGÀY` + selected date.
4. Filter subtitle: selected class and teacher.
5. Four KPI cards with distinct but restrained colors:
   - Buổi đã dạy
   - Buổi đã hủy
   - Tổng số tiết
   - Tỷ lệ chuyên cần
6. `1. THỐNG KÊ THEO GIÁO VIÊN`
7. `2. CHI TIẾT BUỔI HỌC`
8. `3. CHI TIẾT HỌC SINH VẮNG` when absences exist; otherwise a concise no-absence message.
9. `NHẬN XÉT CHUNG`.
10. Footer identity block:
    - `Thành phố Hồ Chí Minh, ngày ... tháng ... năm ...`
    - `NGƯỜI BÁO CÁO`
    - reporter name
    - position/title.

No handwritten signature, school photograph, or handwritten slogan is added.

### 9.2 Multi-page behavior

Reports may span multiple A4 portrait pages. Use print CSS to:

- repeat table headers;
- avoid splitting a single table row when practical;
- keep section headings with their following content;
- keep margins consistent;
- preserve school-green table headers and light tonal section backgrounds;
- avoid clipping long notes.

Dates display `DD/MM/YYYY`; decimal periods display `1,5` rather than `1.5`; percentages use Vietnamese comma decimals.

### 9.3 Logo asset

Use the Pétrus Ký logo supplied by the user as the report logo asset. It must be optimized for web/print and stored as an application asset rather than fetched from an external URL at export time.

## 10. Excel Export Design

The current minimal XLSX writer produces unformatted sheets. Extend it to support styled workbook metadata required for this report:

- cell styles/fonts/fills/borders;
- merged cells;
- column widths;
- row heights;
- horizontal/vertical alignment;
- text wrap;
- numeric and percentage formats where appropriate;
- freeze panes;
- autofilter for detail tables.

### 10.1 Workbook sheets

Keep four focused sheets:

1. **Tổng quan**
   - merged school header and report title;
   - period/filter/reporter metadata;
   - four KPI blocks;
   - neutral general remarks.
2. **Theo giáo viên**
   - styled green header;
   - teacher totals and attendance rate;
   - freeze header row;
   - sensible widths.
3. **Chi tiết buổi học**
   - full session fields, including room, teaching time, checked time, counts, status, note/cancellation reason;
   - autofilter and frozen header.
4. **Chi tiết vắng**
   - student, main class, structured reason, note, extra class, subject, teacher, date, teaching time, checked time, room;
   - autofilter and frozen header.

Use a consistent Pétrus Ký green identity, white bold table headers, light alternating/tonal section backgrounds, borders, wrapped text, and correct Vietnamese labels. The workbook must look intentionally formatted immediately on open; no manual column resizing should be required for ordinary data.

Embedding the bitmap logo into XLSX is optional for this iteration; formatting and school identity through typography/color are mandatory. PDF must include the logo.

## 11. Error Handling and Validation

- UI blocks confirmation if any absent student lacks a reason or `Khác` lacks a note.
- Server independently enforces absence validation.
- UI blocks completed attendance if teaching room/time are empty.
- Server independently validates required completed-session room/time.
- Existing class/day and teacher/day database locks remain authoritative.
- Export buttons are disabled while report data are loading.
- Empty reports still export a valid branded document/workbook with `Không có dữ liệu phù hợp bộ lọc.`
- Popup-blocked PDF export retains the current clear browser message.

## 12. Compatibility and Migration

Migration is additive and safe for existing data:

- add session room/time snapshot columns with empty-string defaults;
- add record absence reason/note columns with empty-string defaults;
- backfill historical absent records to `unspecified`;
- leave historical room/time empty rather than inventing values;
- update confirmation RPC to write structured reasons and room/time transactionally;
- cancellation RPC snapshots planned room/time when provided/available but remains `0 tiết` and creates no attendance records.

Current reporting treats legacy missing room/time as `Chưa ghi` and legacy absence reason as `Chưa ghi lý do`.

## 13. Main Code Areas

Expected implementation touches:

- `src/components/GlobalAttendanceNavigationTab.jsx`
- `src/components/attendance/AttendanceMaterial3.css`
- report component(s) under `src/components/attendance/`
- `src/utils/attendanceReport.js`
- `src/utils/attendanceReportExport.js`
- `src/utils/simpleXlsx.js`
- Supabase attendance migration/RPC SQL
- regression/unit test scripts and frontend build workflow
- new local report logo asset

If the report component becomes too large, split period filters, export metadata, and table sections into focused attendance-report components rather than growing one monolithic file.

## 14. Testing Strategy

Use TDD and regression contracts.

### Database/RPC

Verify:

- new columns/defaults/check constraints;
- structured absence reason validation;
- `other` requires note;
- completed session requires room/time;
- present records cannot retain absence metadata;
- class/day and teacher/day locks still work;
- cancellation remains zero-period/no-record;
- RPC security remains `SECURITY DEFINER`, `search_path=public`, `anon_execute=false`.

### Utilities

Unit-test:

- daily vs monthly period filtering;
- class/teacher filtering;
- metrics and teacher totals;
- structured absence mapping;
- legacy `unspecified` display;
- Vietnamese date/period/percentage formatting.

### UI contracts

Verify:

- class search field exists;
- subject hub exists and uses stable subject tokens/colors;
- absent row reveals reason and note controls;
- report has `Theo tháng | Theo ngày`;
- report has reporter name/title inputs;
- room/time controls are present in quick attendance.

### Exports

Verify PDF HTML contains:

- school header/logo asset;
- dynamic day/month title;
- KPI blocks;
- teacher table;
- session-detail table;
- absence-detail table;
- reporter block;
- A4 portrait print CSS.

Verify XLSX package contains:

- style definitions beyond the single default style;
- merges;
- column widths;
- frozen panes;
- autofilters on detail sheets;
- four expected sheet names and full new columns.

Finally run Frontend Build, Critical E2E, Supabase P0/P1/P2 guards, and verify the deployed Vercel commit after merge.

## 15. Rollout Order

1. RED tests.
2. Additive production-safe database migration/RPC changes.
3. UI search/hub + session room/time + structured absence draft.
4. Generalized report data model and day/month filters.
5. PDF export redesign with bundled logo.
6. XLSX writer styling extension and formatted workbook.
7. Full CI and self-review.
8. Apply production migration in a backward-compatible order.
9. Merge/deploy frontend.
10. Post-deploy database and Vercel verification.
