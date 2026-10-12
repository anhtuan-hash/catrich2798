import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DASHBOARD_CARD_IDS, DASHBOARD_SECTION_IDS,
  defaultDashboardLayout, dashboardLayoutStorageKey, normalizeDashboardLayout,
  readDashboardLayout, writeDashboardLayout, setDashboardCardVisible,
  setDashboardSectionVisible, moveDashboardCard,
} from '../src/utils/dashboardLayoutPreferences.js';

const memory = new Map();
const storage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
};
const a = { id: 'teacher-A' }, b = { id: 'teacher-B' };
assert.notEqual(dashboardLayoutStorageKey(a), dashboardLayoutStorageKey(b));
assert.equal(dashboardLayoutStorageKey({}), null);
assert.equal(readDashboardLayout(a, storage).density, 'comfortable');
assert.equal(DASHBOARD_SECTION_IDS.length, 8);

let layout = defaultDashboardLayout();
layout = moveDashboardCard(layout, 'overdue', -1, ['today', 'overdue', 'dueSoon', 'approvals']);
assert.equal(layout.cardOrder[0], 'overdue');
assert.equal(layout.cardOrder[1], 'today');
layout = setDashboardCardVisible(layout, 'dueSoon', false, ['today', 'overdue', 'dueSoon', 'approvals']);
assert.ok(layout.hiddenCards.includes('dueSoon'));
layout = setDashboardSectionVisible(layout, 'calendar', false);
assert.ok(layout.hiddenSections.includes('calendar'));
layout = { ...layout, density: 'compact' };
const written = writeDashboardLayout(a, layout, storage);
assert.deepEqual(readDashboardLayout(a, storage), written);
assert.equal(readDashboardLayout(b, storage).density, 'comfortable');
assert.deepEqual(readDashboardLayout(b, storage).hiddenSections, []);
assert.equal(readDashboardLayout(a, storage).cardOrder[0], 'overdue');

layout = setDashboardSectionVisible(layout, 'calendar', true);
assert.equal(layout.hiddenSections.includes('calendar'), false);
layout = setDashboardCardVisible(layout, 'dueSoon', true, ['today', 'overdue', 'dueSoon', 'approvals']);
assert.equal(layout.hiddenCards.includes('dueSoon'), false);

let limited = defaultDashboardLayout();
for (const id of ['today','overdue','dueSoon']) {
  limited = setDashboardCardVisible(limited, id, false, ['today','overdue','dueSoon','approvals']);
}
assert.equal(limited.hiddenCards.length, 3);
const afterLastHide = setDashboardCardVisible(limited, 'approvals', false, ['today','overdue','dueSoon','approvals']);
assert.deepEqual(afterLastHide.hiddenCards, limited.hiddenCards, 'Never hide last visible card');

assert.deepEqual(normalizeDashboardLayout({ version: 999 }), defaultDashboardLayout());
assert.deepEqual(normalizeDashboardLayout({ version: 1, cardOrder: ['wrong','today','today'], hiddenCards: ['fake'], hiddenSections: ['calendar','fake'], density: 'INVALID' }).cardOrder.sort(),
  [...DASHBOARD_CARD_IDS].sort());
assert.deepEqual(normalizeDashboardLayout({ version: 1, cardOrder: [], hiddenCards: [], hiddenSections: ['calendar','fake'], density: 'INVALID' }).hiddenSections, ['calendar']);
assert.deepEqual(readDashboardLayout({ id: 'missing' }, {
  getItem: () => '{malformed',
}), defaultDashboardLayout());
const original = JSON.stringify(defaultDashboardLayout());
assert.deepEqual(JSON.parse(original), defaultDashboardLayout(), 'Defaults should be deterministic');

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const parent = read('src/pages/WorkDashboard.jsx');
const center = read('src/components/DashboardCommandCenter.jsx');
const editor = read('src/components/DashboardLayoutEditor.jsx');
const css = read('src/styles/dashboard-command-center-v23.css');
assert.match(parent, /readDashboardLayout\(currentUser\)/);
assert.match(parent, /writeDashboardLayout\(currentUser/);
for(const id of ['nextEvent','calendar','quickActions','dropZone','news']) {
  assert.ok(parent.includes("isDashboardSectionVisible('"+id+"')"), 'Missing section visibility for '+id);
}
assert.match(parent, /onFocusCalendar=\{scrollToCalendar\}/);
assert.match(center, /<DashboardLayoutEditor/);
assert.match(center, /cardsToRender\.map/);
assert.match(center, /setDashboardSectionVisible\(current, 'priority', true\)/);
assert.match(center, /sectionVisible\('continue'\)/);
assert.match(center, /sectionVisible\('homeroom'\)/);
assert.match(editor, /moveDashboardCard/);
assert.match(editor, /setDashboardCardVisible/);
assert.match(editor, /defaultDashboardLayout/);
assert.match(css, /dcc-customizer/);
assert.match(css, /dcc-density--compact/);
console.log('PASS Dashboard 2.3: account isolation, normalized preferences, card reorder, section visibility, defaults, and CSS.');
