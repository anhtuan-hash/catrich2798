import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const nav=read('src/components/GlobalFlatNavigation.jsx');
const css=read('src/components/GlobalNavigationTextOnlyCompact.css');
const basic=read('src/components/GlobalCompactNavigation.jsx');
const dashboard=read('src/components/GlobalDashboardNavigationTab.jsx');
const homeroom=read('src/components/GlobalHomeroomNavigationTab.jsx');
const gradebook=read('src/components/GlobalGradebookNavigationTab.jsx');
const reports=read('src/components/GlobalReportsNavigationTab.jsx');
const ttcm=read('src/components/GlobalTtcmNavigationTab.jsx');
const attendance=read('src/components/GlobalAttendanceNavigationTab.jsx');

test('compact text-only stylesheet is mounted after existing nav visuals',()=>{
  assert.ok(nav.indexOf("import './GlobalNavigationTextOnlyCompact.css'")>nav.indexOf("import './DashboardTopChromeMockup.css'"));
  assert.match(css,/\.brian-nav__primary > :is\(button, a, \[role='button'\]\)/);
  assert.match(css,/height: 40px !important/);
  assert.match(css,/padding: 0 14px !important/);
  assert.match(css,/border-radius: 14px !important/);
  assert.match(css,/font-size: 14px !important/);
  assert.match(css,/gap: 7px !important/);
  assert.match(css,/::before,/);
  assert.match(css,/::after \{/);
  assert.match(css,/content: none !important/);
  assert.match(css,/\.brian-nav__reports-svg-wrapper-1/);
  assert.match(css,/\.brian-nav__ttcm-badge/);
  assert.match(css,/\.brian-nav__reports-countdown/);
  assert.doesNotMatch(css,/\.brian-nav__account\s*\{|\.brian-nav__brand\s*\{/);
});
test('all eight route entries and their original actions remain mounted',()=>{
  assert.match(basic,/className="brian-nav__primary"/);
  assert.match(basic,/openRoute\('#\/home'/);
  assert.match(basic,/openRoute\('#\/apps'/);
  assert.match(dashboard,/launchRoute\(\{/);
  assert.match(homeroom,/launchRoute\(\{/);
  assert.match(gradebook,/launchRoute\(\{/);
  assert.match(reports,/launchRoute\(\{/);
  assert.match(ttcm,/brian-nav__ttcm-badge/);
  assert.match(attendance,/brian-nav__attendance-tab/);
  assert.match(nav,/<GlobalReportsNavigationTab \{\.\.\.props\} \/>/);
  assert.match(nav,/<GlobalAttendanceNavigationTab \{\.\.\.props\} \/>/);
  assert.match(nav,/<GlobalTtcmNavigationTab \{\.\.\.props\} \/>/);
});
