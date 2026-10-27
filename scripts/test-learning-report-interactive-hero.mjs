import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isValidReportPeriod,reportPeriodTitle,shiftReportPeriod,reportSchoolYear}
  from '../src/features/learningReports/learningReportsPeriod.js';

const file=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ws=file('src/features/learningReports/LearningReportsWorkspace.jsx');
const dash=file('src/features/learningReports/LearningReportsManagerDashboard.jsx');
const css=file('src/features/learningReports/LearningReportsHeroInteractive.css');
const i18n=file('src/utils/legacySiteTranslations.js');

assert.equal(isValidReportPeriod('2026-10'),true);
assert.equal(isValidReportPeriod('2026-13'),false);
assert.equal(isValidReportPeriod('2026-00'),false);
assert.equal(isValidReportPeriod('oops'),false);
assert.equal(shiftReportPeriod('2026-12',1),'2027-01');
assert.equal(shiftReportPeriod('2026-01',-1),'2025-12');
assert.equal(shiftReportPeriod('2026-10',-1),'2026-09');
assert.equal(reportPeriodTitle('2026-10'),'Tháng 10/2026');
assert.equal(reportSchoolYear('2026-07',2025),2025);
assert.equal(reportSchoolYear('2026-08',2025),2026);
assert.equal(reportSchoolYear('2027-01',2025),2026);

const cases=[
  ['Hero uses an actual controlled month input',ws.includes('type="month"')&&ws.includes('value={heroPeriod}')],
  ['Hero renders selected month in visible summary',ws.includes('reportPeriodTitle(heroPeriod)')],
  ['Hero supports previous and next month',ws.includes('shiftReportPeriod(heroPeriod,-1)')&&ws.includes('shiftReportPeriod(heroPeriod,1)')],
  ['Period picker directs TTCM to corresponding monthly summary',ws.includes("setManagerView('summary')")&&ws.includes("updateHeroPeriod(e.target.value)")],
  ['Hero period numbers counted from actual tasks',ws.includes("reportPeriodTasks=filtered.filter")&&ws.includes('reportPeriodTasks.length')],
  ['Teacher report list still opens from Hero',ws.includes('blr-hero-chip is-count')&&ws.includes("setManagerView('reports')")],
  ['Hero selected period passes to analytics',ws.includes('selectedPeriod={heroPeriod} onPeriodChange={setHeroPeriod}')],
  ['Dashboard synchronizes period changes back into hero',dash.includes('onPeriodChange?.(e.target.value)')&&dash.includes('onPeriodChange?.(period)')],
  ['Analytics school year matches chosen month',dash.includes('reportSchoolYear(selectedPeriod,schoolYearStartYear())')],
  ['No static fake monthly KPI values',!ws.includes('reportPeriodTasks.length||6')],
  ['Tab navigation remains semantic and accessible',ws.includes('role="tablist"')&&ws.includes('aria-selected={managerView')],
  ['All three tab buttons share one design selector',css.includes('.blr-manager-modes.blr-unified-tabs > button:not(.blr-task):not(.blrd-month)')],
  ['Active tab consistent regardless of selection',css.includes('button[aria-selected=true]')&&css.includes('button.is-active')],
  ['Old underline indicator explicitly removed',css.includes('button.is-active:after{display:none}')],
  ['Month control accessible by label',ws.includes('htmlFor="blr-hero-report-period"')&&ws.includes('id="blr-hero-report-period"')],
  ['Keyboard focus style retained',file('src/features/learningReports/LearningReportsMacMaterial.css').includes(':focus-visible')],
  ['Responsive hero on phone and tablet',css.includes('max-width:825px')&&css.includes('max-width:650px')],
  ['Reduced-motion compatible',css.includes('prefers-reduced-motion:reduce')],
  ['Only Specialist styles scoped',css.includes('.blr-shell')&&!/^\s*body\s*\{/m.test(css)],
  ['Vietnamese month UI translations added',i18n.includes('"Tháng trước"')&&i18n.includes('"Còn cần hoàn tất"')],
  ['Back-end and destructive assignment code untouched',ws.includes('bulkRevokeLearningReportAssignments(ids)')],
];
cases.forEach(([label,pass])=>console.log((pass?'PASS':'FAIL')+': '+label));
assert.ok(cases.every(x=>x[1]),'Interactive Hero & tabs design contracts failed');
console.log('PASS: '+cases.length+' design and interaction contracts plus pure reporting-period tests.');
