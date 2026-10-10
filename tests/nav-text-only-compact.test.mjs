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
const lessonCheck=read('src/components/GlobalLessonCheckNavigationTab.jsx');
const hubOrder=read('src/components/GlobalNavigationHubController.jsx');
const palette=read('src/components/GlobalNavigationPastelPalette.css');
const reports=read('src/components/GlobalReportsNavigationTab.jsx');
const ttcm=read('src/components/GlobalTtcmNavigationTab.jsx');
const attendance=read('src/components/GlobalAttendanceNavigationTab.jsx');
const hub=read('src/components/GlobalNavigationHubController.jsx');
const region=read('src/components/GlobalNavigationRegionalTypographyRuntime.jsx');
const qbSpec=read('tests/e2e/question-bank-route.spec.js');

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
test('all nine route entries and their original actions remain mounted',()=>{
  assert.match(basic,/className="brian-nav__primary"/);
  assert.match(basic,/openRoute\('#\/home'/);
  assert.match(basic,/openRoute\('#\/apps'/);
  assert.match(dashboard,/launchRoute\(\{/);
  assert.match(homeroom,/launchRoute\(\{/);
  assert.match(gradebook,/launchRoute\(\{/);
  assert.match(lessonCheck,/launchRoute\(\{/);
  assert.match(lessonCheck,/#\/tool\/lesson-check-studio/);
  assert.match(lessonCheck,/hasToolAccess\(currentUser, LESSON_CHECK_SLUG\)/);
  assert.match(reports,/launchRoute\(\{/);
  assert.match(ttcm,/brian-nav__ttcm-badge/);
  assert.match(attendance,/brian-nav__attendance-tab/);
  assert.match(nav,/<GlobalLessonCheckNavigationTab \{\.\.\.props\} \/>/);
  assert.ok(nav.indexOf('<GlobalGradebookNavigationTab {...props} />') < nav.indexOf('<GlobalLessonCheckNavigationTab {...props} />'));
  assert.ok(nav.indexOf('<GlobalLessonCheckNavigationTab {...props} />') < nav.indexOf('<GlobalReportsNavigationTab {...props} />'));
  assert.match(nav,/<GlobalReportsNavigationTab \{\.\.\.props\} \/>/);
  assert.match(nav,/<GlobalAttendanceNavigationTab \{\.\.\.props\} \/>/);
  assert.match(nav,/<GlobalTtcmNavigationTab \{\.\.\.props\} \/>/);
});

test('runtime inline default matches compact 14px CSS, without disabling Admin regional typography',()=>{
  assert.match(hub,/navItem: \{ fontSize: '14px', lineHeight: '1' \}/);
  assert.match(hub,/setImportant\(item, 'font-size', HUB_TYPOGRAPHY.navItem.fontSize\)/);
  assert.match(region,/if \(hasSize && size\) node.style.setProperty\('font-size', size, 'important'\)/);
  assert.match(region,/--bes-font-size-navigation/);
});

test('Question Bank module E2E selectors stay scoped to its own tab strip',()=>{
  assert.match(qbSpec,/page\.locator\('\.qb-tabs-horizontal'\)\.getByRole\('button', \{ name: label, exact: true \}\)\.click\(\)/);
  assert.doesNotMatch(qbSpec,/page\.getByRole\('button', \{ name: label, exact: true \}\)\.first\(\)\.click\(\)/);
});

test('Assessment shortcut is strictly ordered between Gradebook and Reports',()=>{
  assert.match(hubOrder,/gradebook: 45/);
  assert.match(hubOrder,/'lesson-check': 47/);
  assert.match(hubOrder,/reports: 50/);
  assert.match(hubOrder,/classList.contains\('brian-nav__lesson-check-tab'\)/);
  assert.match(css,/\.brian-nav__lesson-check-tab\s*\{ order: 47 !important/);
  assert.match(palette,/\.brian-nav__lesson-check-tab\s*\{[\s\S]*?--nav-pastel-surface: #e3f8f3/);
});
