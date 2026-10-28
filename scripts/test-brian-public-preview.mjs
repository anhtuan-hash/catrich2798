import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GUEST_PREVIEW_ROUTES, GUEST_PREVIEW_TOOLS,
  GUEST_LOCKED_ROUTES, GUEST_LOCKED_TOOLS,
  isGuestPreviewRoute, isGuestLockedRoute,
} from '../src/utils/guestPreviewPolicy.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const app = read('src/main.jsx');
const entrypoint = read('src/pages/GuestPreview.jsx');
const page = read('src/pages/GuestFullPages.jsx');
const appsPage = read('src/pages/WebAppsRedesign.jsx');
const pageStyle = read('src/pages/GuestFullPages.css');
const nav = read('src/components/GlobalGuestNavigationHub.jsx');
const shell = read('src/components/GlobalFlatNavigation.jsx');
const spec = read('docs/BRIAN_PUBLIC_PREVIEW_MODE.md');

assert.deepEqual([...GUEST_PREVIEW_ROUTES], ['home', 'apps', 'dashboard', 'attendance']);
assert.deepEqual([...GUEST_PREVIEW_TOOLS], ['lesson-check-studio']);
assert.deepEqual([...GUEST_LOCKED_ROUTES], ['homeroom']);
assert.deepEqual([...GUEST_LOCKED_TOOLS], ['gradebook-studio']);
for (const route of GUEST_PREVIEW_ROUTES) assert.equal(isGuestPreviewRoute(route), true);
assert.equal(isGuestPreviewRoute('tool', { slug: 'lesson-check-studio' }), true);
assert.equal(isGuestPreviewRoute('tool', { slug: 'gradebook-studio' }), false);
assert.equal(isGuestPreviewRoute('tool'), false);
assert.equal(isGuestPreviewRoute('homeroom'), false);
assert.equal(isGuestLockedRoute('homeroom'), true);
assert.equal(isGuestLockedRoute('tool', { slug: 'gradebook-studio' }), true);
assert.equal(isGuestLockedRoute('dashboard'), false);
assert.equal(isGuestLockedRoute('tool', { slug: 'lesson-check-studio' }), false);

assert.match(app, /authReady && requiresAuth && !currentUser && !guestPreviewAllowed/);
assert.match(app, /guestPreviewAllowed && currentRoute !== 'home' && <GuestPreview/);
assert.match(app, /currentRoute === 'dashboard' && currentUser && <WorkDashboard/);
assert.match(app, /currentRoute === 'attendance' && currentUser && <AttendanceWorkspace/);
assert.match(app, /currentRoute === 'tool' && currentUser && <ToolPage/);
assert.match(app, /currentRoute === 'homeroom' && currentUser && <HomeroomWorkspace/);
assert.match(app, /onClickCapture=\{guardGuestHomeInteraction\}/);
assert.match(app, /onKeyDownCapture=\{guardGuestHomeInteraction\}/);
assert.match(app, /onSubmitCapture=\{guardGuestHomeInteraction\}/);

assert.match(nav, /id: 'homeroom'[^\n]*locked: true/);
assert.match(nav, /id: 'gradebook'[^\n]*locked: true/);
assert.match(nav, /id: 'assessment'[^\n]*lesson-check-studio/);
assert.match(nav, /id: 'attendance'[^\n]*#\/attendance/);
assert.match(nav, /aria-modal="true"/);
assert.match(shell, /<GlobalGuestNavigationHub[^\n]*mobile=\{mobile\}/);

assert.match(entrypoint, /GuestFullPages\.jsx/);
assert.match(page, /data-real-public-data="true"/);
assert.match(page, /<WebAppsRedesign/);
assert.match(page, /<DashboardWorkPlanner/);
assert.match(page, /<DashboardNewsHub/);
assert.match(page, /GuestAssessment/);
assert.match(page, /GuestAttendance/);
assert.match(page, /\.from\('bes_guest_preview_entries'\)/);
assert.match(appsPage, /publicReadonly \? group\.items : group\.items\.slice\(0, 4\)/);
assert.match(appsPage, /data-public-readonly-apps/);
assert.match(page, /onClickCapture=\{inertAction\}/);
assert.match(page, /onDragStartCapture=\{inertAction\}/);
assert.doesNotMatch(page, /onWheelCapture|onTouchMoveCapture|onScrollCapture/);
assert.match(pageStyle, /overflow:visible!important/);
assert.match(page, /\.from\('bes_guest_preview_feed'\)/);
assert.match(page, /\.from\('custom_game_platforms'\)/);
assert.match(page, /\.eq\('status','approved'\)/);
assert.doesNotMatch(page, /\.from\('(?:lesson_check_activities|work_hub_items|bes_extra_attendance_sessions)'\)/);
assert.doesNotMatch(page, /\b(?:XMLHttpRequest|localStorage|sessionStorage)\b/);
assert.doesNotMatch(page, /<iframe|<form|<input|<textarea|<select/);
assert.match(page, /PRIVATE_TOOLS/);
assert.match(page, /'gradebook-studio'/);
const navCss = read('src/components/GlobalGuestNavigationHub.css');
assert.match(navCss, /\[data-guest-destination="apps"\] \{ order: 20 !important; \}/);
assert.match(navCss, /\.brian-nav__primary:has\(> \[data-guest-destination\]\) > button:first-child \{ order: -10 !important; \}/);

assert.match(page, /room_label,time_label,periods,difficulty,duration_minutes/);
assert.match(page, /countWeight:/);
assert.doesNotMatch(page, /entries\.flatMap\(item=>/);
assert.match(page, /brian-guest-full__extended-report/);
assert.match(page, /brian-guest-full__classes/);
assert.match(read('src/components/DashboardWorkPlanner.jsx'), /countWeight/);
assert.match(pageStyle, /brian-guest-full__activity-grid \{ display:grid !important/);
assert.match(spec, /Supabase RLS/);

console.log('BRIAN Public Preview: full-page read-only views, real public entries, native scrolling, private route gates — PASS');
