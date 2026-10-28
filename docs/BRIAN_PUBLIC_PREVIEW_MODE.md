# BRIAN Public Preview Mode — technical specification

## Scope (approved 28 October 2026)

For **anonymous users only**, keep the existing BRIAN shell and let visitors
navigate/scroll through **Home, Apps, Dashboard, Kiểm tra (Lesson Check Studio),
and Điểm danh**. All guest content must be read-only. **Chủ nhiệm and Sổ điểm**
remain visible as locked navigation labels only, with no page or data access.

| Route | Anonymous result | Logged-in result |
| --- | --- | --- |
| `#/home` | Existing public home, interaction guarded | Existing home |
| `#/apps` | Public catalog preview, no app launches | Existing permission checks |
| `#/dashboard` | Static representative dashboard, not real work data | Existing dashboard |
| `#/tool/lesson-check-studio` | Static assessment preview | Existing tool and permissions |
| `#/attendance` | Static attendance preview | Existing attendance rules |
| `#/homeroom` | Redirect to login, never mount workspace | Existing role permissions |
| `#/tool/gradebook-studio` | Redirect to login, never mount tool | Existing role permissions |
| All other protected routes/tools | Existing login gate | Existing permissions |

## UX

- The guest desktop rail includes seven destinations: Home, Apps, Dashboard,
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

## Security invariants

1. Render **local, static demo data only** for guest Dashboard/Attendance/Assessment.
   Do not mount `WorkDashboard`, `AttendanceWorkspace`, or `ToolPage` for a guest.
2. Never pass synthetic guest credentials/user IDs to existing internal components.
3. Do not change Supabase RLS or server authorization. Guest read-only UI is
   **not** a permission grant and must not bypass API-level checks.
4. Guest app cards are static metadata from a small allowlist. Never expose
   gradebook, student rosters or internal dashboard aggregates in the preview.
5. An authenticated user continues through the existing `hasRouteAccess`,
   attendance permissions and app-visibility rules.

## Verification acceptance criteria

- Incognito anonymous direct navigation to all five preview destinations works.
- Anonymous scroll and keyboard scroll work on each page.
- Clicks in anonymous Home content do not launch an app, edit a record, or
  start a classroom activity. Other guest previews have no write controls.
- Anonymous click on Homeroom / Gradebook opens sign-in challenge, no data.
- Anonymous direct deep link to Homeroom / Gradebook resolves to Login.
- Existing logged-in roles render their original pages/permissions unchanged.
- Test narrow viewport for horizontal guest navigation and no clipped tabs.
- Verify no Supabase personal-data reads are initiated by guest previews.
- Run `node scripts/test-brian-public-preview.mjs`, then full Vite build.
