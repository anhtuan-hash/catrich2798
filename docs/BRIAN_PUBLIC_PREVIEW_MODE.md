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
