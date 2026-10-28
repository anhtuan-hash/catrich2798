# BRIAN Public Preview Mode — technical specification

## Scope (approved 28 October 2026)

For **anonymous users only**, keep the existing BRIAN shell and let visitors
navigate/scroll through **Home, Apps, Dashboard, Kiểm tra (Lesson Check Studio),
and Điểm danh**. All guest content must be read-only. **Chủ nhiệm and Sổ điểm**
remain visible as locked navigation labels only, with no page or data access.

| Route | Anonymous result | Logged-in result |
| --- | --- | --- |
| `#/home` | Existing public home, interaction guarded | Existing home |
| `#/apps` | Actual app registry + already approved public games, no launches | Existing permission checks |
| `#/dashboard` | Real, aggregate work counts and published Dashboard hero; no private task details | Existing dashboard |
| `#/tool/lesson-check-studio` | Real, aggregate activity totals by focus area; no exam content | Existing tool and permissions |
| `#/attendance` | Real, aggregate session counts and daily timeline; no student records | Existing attendance rules |
| `#/homeroom` | Redirect to login, never mount workspace | Existing role permissions |
| `#/tool/gradebook-studio` | Redirect to login, never mount tool | Existing role permissions |
| All other protected routes/tools | Existing login gate | Existing permissions |

## UX

- The guest desktop rail includes seven destinations in exact order immediately after the brand: Home, Apps, Dashboard,
  Homeroom (locked), Gradebook (locked), Assessment, Attendance. Keep both locked
  entries in the rail but never navigate to their content while anonymous.
- A separate horizontally scrollable mobile guest rail provides the same destinations.
- Public preview pages have no active buttons, forms, iframe, editable controls,
  write handlers, or user-specific state. CTA to sign in is the only allowed action.
- The existing public homepage is scrollable but its primary content controls
  are intercepted while anonymous. Global navigation and sign-in remain usable.
- Locked tabs offer a bilingual sign-in dialog; deep links to protected routes
  keep the existing authentication redirect.
- Maintain original navigation and page components for authenticated users.
- No opacity/overlay layer may disable mouse wheel, touch scroll or keyboard scroll.

## Real-data publication boundary

- **Apps:** public application labels and descriptions from the actual BRIAN registry;
  approved public classroom games from `custom_game_platforms` (anon RLS: `status='approved'`).
- **Dashboard:** real platform-wide counts of work items/tasks/announcements/published events
  from a *separate, privacy-safe aggregate feed*. The hero uses the existing
  `dashboard_hero_public` publication.
- **Assessment:** real counts of activities across focus areas, no questions, answers,
  activity embed codes, teacher notes, assessment scores, or student identifiers.
  The hero reads `lesson_check_hero_public` only.
- **Attendance:** actual session totals and dates grouped to daily counts.
  Never publish class rosters, student names, individual absence/presence flags,
  personal notes, teacher emails, proofs, or archived raw records.
- **Refresh:** Supabase pg_cron task `bes_guest_preview_feed_5min` recomputes
  aggregate values every five minutes, reports `refreshed_at`. This is near-live,
  not a direct read of protected tables from browsers.
- **Availability:** if the public feed cannot be read, show an unavailable state;
  **never silently substitute made-up numbers**.

## Security invariants

- Supabase RLS remains mandatory for every guest-facing table; only curated aggregate values and explicitly published hero records are readable by anon.

1. All guest reads use only `bes_guest_preview_feed`, the published hero tables,
   the allowlisted app registry, and the approved-games public RLS slice. The
   protected work/attendance/lesson-check source tables are queried only by a
   server-side refresh function in the non-exposed `bes_internal` schema.
2. No raw private rows are public. `bes_guest_preview_feed` has RLS and grants
   only `SELECT` to `anon` and `authenticated`, never mutation privileges.
3. The refresh function has no user arguments and no executable grants for
   `anon` or `authenticated`. It is invoked only by database cron, which writes
   a deliberately minimal fixed aggregate projection.
4. Do not mount authenticated `WorkDashboard`, `AttendanceWorkspace`,
   `LessonCheckStudio` or `GradebookStudio` for guests.
5. Never pass a fake user identity or privileged API key into the browser.
   This is **public aggregate exposure**, not an authentication bypass.
6. Logged-in roles continue to use the untouched application components and
   the original permission and RLS rules. Homeroom/Gradebook never load for guests.
7. Read-only guest previews have normal wheel/touch/keyboard scrolling.
   Only navigation and the explicit Sign in CTA can activate.

## Full-page read-only guest experience — 28 October 2026

- **Not a summary dashboard:** the GuestPreview route now delegates to `GuestFullPages`.
  An anonymous visitor receives a vertically scrollable full-page representation.
- **Apps:** render the genuine `WebAppsRedesign` launcher, including all public
  registered apps and the already-approved games. PublicReadonly bypasses private
  launcher preferences and removes the four-item-per-group clipping.
- **Dashboard:** reuse the genuine `DashboardWorkPlanner` and `DashboardNewsHub`
  with actual daily task *counts* and public news. Department tasks remain private:
  titles, assignees, notes, and staff-only schedules are not broadcast.
- **Assessment:** show all real activity cards from a curated public metadata copy
  (141 on migration day) including published-safe thumbnail, title, grade, unit,
  and focus. No iframe, question text, scores, permissions or answer key is exposed.
- **Attendance:** render all real session summary rows (334 on migration day):
  class label, subject, date, session status and total/present counts. Individual
  student names, identities, presence records, teacher emails and attachments
  never enter the guest feed.
- **Guest interaction:** capture and cancel clicks, form submission, keyboard
  activation, editing, dragging and paste *inside the page content only*.
  Preserve wheel/trackpad/touch scroll, page scroll keys, and navigation outside
  the read-only region; the explicit sign-in link remains active.
- **Private destinations:** Homeroom and Gradebook remain login-gated, unchanged.
- **Published-only read API:** `bes_guest_preview_entries` exposes only selected
  harmless fields; RLS grants SELECT to anon and authenticated, no writes.
  The source tables are not granted to anon. A restricted internal database
  function refreshes the curated snapshot every five minutes.
- **Not the same privilege as a signed-in teacher:** personal data, internal
  work items, private documents and all editing functionality remain restricted.

## Verification acceptance criteria

- Incognito anonymous direct navigation to all five preview destinations works.
- Anonymous scroll and keyboard scroll work on each page.
- Clicks in anonymous Home content do not launch an app, edit a record, or
  start a classroom activity. Other guest previews have no write controls.
- Anonymous click on Homeroom / Gradebook opens sign-in challenge, no data.
- Anonymous direct deep link to Homeroom / Gradebook resolves to Login.
- Existing logged-in roles render their original pages/permissions unchanged.
- Test narrow viewport for horizontal guest navigation and no clipped tabs.
- Verify guest REST queries select only the public aggregate feed, published hero and approved public games.
- Verify Supabase anon can SELECT the aggregate feed, but cannot INSERT/UPDATE/DELETE.
- Verify public trend excludes student-level and class-level details.
- Verify database cron has a successful run and aggregate values change following a source update.
- Verify Guest nav Home appears immediately after the logo, ahead of Apps and Dashboard.
- Run `node scripts/test-brian-public-preview.mjs`, then full Vite build.

## Correction: complete real published-content surfaces

- The guest preview must not render repeated placeholder task records. Daily
  work counts are represented by one dated row with a real count weight.
  The `DashboardWorkPlanner` consumes `countWeight` for accurate totals.
- Assessment must display **all** rows of the public assessment metadata
  feed (no artificial first-N limit in the UI) with title, thumbnail, grade,
  unit, focus, difficulty and duration where recorded. The layout must cap
  image sizes and preserve a responsive grid.
- Attendance must display **all** approved public session-summary rows, with
  date, class label, subject, completed/cancelled status, time range, room,
  lesson periods and totals, followed by real month and class reports.
- Navigation remains usable, but content buttons cannot execute, and normal
  wheel, trackpad and touch scrolling must not be prevented.
- No anonymous access is granted to attendance member lists, individual
  student-level attendance records, grades, personal details or confidential
  work item descriptions. An admin-authorized release is a separate,
  irreversible publication decision; simply disabling mouse events does
  **not** safeguard data returned to a public browser.

## Public detailed calendar (28 October 2026)

The owner has requested that anonymous users can see the **actual detailed
work calendar**, not aggregated daily placeholders. The read-only feed
`public.bes_guest_preview_entries` now holds an individual public mirror
of the 370 official imported schedule records (`schedule_event=true`),
including a title, start/end timestamp, local date, safe note and venue.
On the selected day, the existing BRIAN work planner shows each real event.
Below it, a monthly chronological archive lists **all** imported schedule
records so guests can browse by scrolling without needing to click dates.

The mirror intentionally does **not** expose assignment identifiers,
attachments, arbitrary metadata, internal feedback, meeting URLs,
passcodes or long numeric contacts. A known contact/login pattern in the
description or schedule note is replaced with a sign-in notice instead.
This is a limited publication of the official school work schedule,
not a blanket RLS grant over `work_hub_items`.

Data is refreshed by the already-existing database job
`bes_guest_preview_entries_5min`. Anonymous permission is SELECT on
the curated table only. The UI still prevents all clicks/edits within
the guest preview while allowing normal wheel, touch and keyboard scrolling.


## Actual attendance calendar for anonymous visitors (28 October 2026)

The anonymous `#/attendance` page must display the real **Lịch điểm danh**
before the historical session list, not just counts or history.

- A separate RLS-protected, SELECT-only public snapshot
  `bes_guest_attendance_schedule` contains **active class timetable metadata**
  (name, class type, subject, classroom, weekdays, teaching time, grade).
  Source: `bes_extra_classes` (28 active rows at deployment).
- The actual completed/cancelled session data comes from the existing
  `bes_guest_preview_entries` attendance feed (334 at deployment).
- `GuestAttendanceRealCalendar` reuses the canonical
  `isExtraClassScheduledOnDate` schedule engine, matches each class and date
  with its real recorded session, and distinguishes:
  **completed**, **cancelled**, **past unrecorded**, and **future scheduled**.
- The calendar displays chronological months (from recorded session history
  through the next month), with a seven-day calendar grid and a fully visible
  day-by-day timetable below **each** month: class name, subject,
  time, room, session status and aggregate counts where confirmed.
- **All details are in page flow.** No click is necessary to select a date,
  change month, or expand entries; normal mouse wheel, trackpad, keyboard and
  touch scrolling work. Guest interactions remain disabled at the shared
  read-only boundary.
- The source tables `bes_extra_classes` and
  `bes_extra_attendance_sessions` remain protected by their existing
  policies. Anonymous visitors are **not** granted class roster/student
  records, teacher contact details, individual attendance or notes.
- The private job `bes_guest_attendance_schedule_5min` refreshes the
  restricted public timetable every five minutes; it does not expose source
  table credentials or mutation access.

