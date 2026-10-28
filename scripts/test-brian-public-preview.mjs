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
const page = read('src/pages/GuestPreview.jsx');
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

assert.match(page, /data-demo-only="true"/);
assert.doesNotMatch(page, /\b(?:supabase|fetch|axios|XMLHttpRequest|localStorage|sessionStorage)\b/);
assert.doesNotMatch(page, /<iframe|<form|<input|<textarea|<select/);
assert.doesNotMatch(page, /gradebook-studio/);
assert.match(spec, /Supabase RLS/);

console.log('BRIAN Public Preview: policy, route gates, locked navigation, guest-only mock content — PASS');
