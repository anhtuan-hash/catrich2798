import assert from 'node:assert/strict';
import fs from 'node:fs';

const main = fs.readFileSync('src/main.jsx', 'utf8');
const join = fs.readFileSync('src/pages/ClassroomJoin.jsx', 'utf8');
const joinCss = fs.readFileSync('src/pages/ClassroomJoin.css', 'utf8');
const classroomE2e = fs.readFileSync('tests/e2e/classroom-delivery.spec.js', 'utf8');
const homeroomE2e = fs.readFileSync('tests/e2e/homeroom-portal.spec.js', 'utf8');
const critical = fs.readFileSync('.github/workflows/critical-e2e.yml', 'utf8');

for (const token of [
  "'classroom-join'",
  "const ClassroomJoin = lazy(() => import('./pages/ClassroomJoin.jsx'))",
  "currentRoute === 'classroom-join' && <ClassroomJoin />",
]) assert.ok(main.includes(token), 'Public classroom route contract missing: ' + token);

assert.ok(main.includes("PUBLIC_ROUTES = new Set") && main.includes("'classroom-join'"), 'Classroom Join must be public.');
assert.ok(main.includes("!['homeroom-portal', 'classroom-join'].includes(currentRoute) ? <div className=\"bes-top-chrome\">"), 'Public classroom route must not render authenticated chrome.');
assert.ok(join.includes("className=\"classroom-join-page\""), 'Classroom Join page root missing.');
assert.ok(join.includes("className=\"cj-card cj-form\""), 'Classroom Join form contract missing.');
assert.ok(join.includes("classroom_join_session"), 'Classroom Join RPC wiring missing.');
assert.ok(join.includes("classroom_get_public_state"), 'Classroom public-state RPC wiring missing.');
assert.ok(join.includes("classroom_submit_response"), 'Classroom response RPC wiring missing.');
assert.ok(join.includes("classroom_ping_participant"), 'Classroom presence RPC wiring missing.');
assert.ok(joinCss.includes('@media (max-width: 640px)'), 'Classroom Join mobile contract missing.');

assert.ok(classroomE2e.includes("page.goto('/#/classroom-join?code=ABC234')"), 'Classroom E2E direct route coverage missing.');
assert.ok(homeroomE2e.includes("page.goto('/#/homeroom-portal')"), 'Homeroom E2E direct route coverage missing.');
assert.ok(critical.includes('Verify Classroom public join in Chromium'), 'Critical CI must gate Classroom public route.');
assert.ok(critical.includes('Verify Classroom public join in WebKit'), 'Critical CI must gate Classroom public route in WebKit.');
assert.ok(critical.includes('Verify Homeroom public portal in Chromium'), 'Critical CI must gate Homeroom public route.');
assert.ok(critical.includes('Verify Homeroom public portal in WebKit'), 'Critical CI must gate Homeroom public route in WebKit.');

console.log('PASS: Brian v11.9.3 public Classroom/Homeroom route restoration contract is present.');
