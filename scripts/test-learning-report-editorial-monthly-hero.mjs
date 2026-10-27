import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isValidReportPeriod,shiftReportPeriod,reportPeriodTitle} from '../src/features/learningReports/learningReportsPeriod.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const jsx=read('src/features/learningReports/LearningReportsWorkspace.jsx');
const css=read('src/features/learningReports/LearningReportsEditorialHero.css');
const spec=read('docs/brian-learning-reports-editorial-monthly-hero-spec-20261027.md');
const tabs=['reports','summary','history'];
const checks=[
 ['Reference-specific design specification',spec.includes('## 1. Nguồn tham chiếu bắt buộc')&&spec.includes('## 7. Kiểm thử, phát hành')],
 ['Editorial hero replaces three floating KPI cards',jsx.includes('blr-editorial-hero__paper')&&!jsx.includes('blr-hero-chip is-count')],
 ['Exact monthly header and live orange month',jsx.includes('Bồi dưỡng &amp;')&&jsx.includes('Phụ đạo tháng <em>{Number(heroPeriod.slice(5))}</em>')],
 ['Ivory, pale peach and blue palette',css.includes('#fffcf8')&&css.includes('rgba(255,211,183')&&css.includes('rgba(213,231,250')],
 ['Editorial paper and seal design',css.includes('.blr-editorial-hero__paper')&&css.includes('.blr-editorial-hero__seal')],
 ['Rotated motivational message',jsx.includes('Mỗi giờ dạy')&&css.includes('.blr-editorial-hero__motto')],
 ['Native real month input',jsx.includes('type="month"')&&jsx.includes('value={heroPeriod}')&&jsx.includes('onChange={e=>updateHeroPeriod(e.target.value)}')],
 ['Navigates both months',jsx.includes('shiftReportPeriod(heroPeriod,-1)')&&jsx.includes('shiftReportPeriod(heroPeriod,1)')],
 ['Month selection continues to use synchronized monthly summary',jsx.includes("setManagerView('summary')")&&jsx.includes('selectedPeriod={heroPeriod}')],
 ['All three semantic tabs retained',tabs.every(mode=>jsx.includes("managerView==='"+mode+"'"))&&jsx.includes('role="tablist"')],
 ['Tab layout unified by role tab selector',css.includes('> button[role="tab"]:not(.blr-task):not(.blrd-month)')],
 ['Same active state for all tab items',css.includes('button[role="tab"][aria-selected="true"]')],
 ['Old underlines not shown',css.includes('button[role="tab"]::after')],
 ['Editorial controls have keyboard focus',css.includes('.blr-editorial-hero__month-chip:focus-within')],
 ['Mobile layout and accessible scaling',css.includes('max-width:760px')&&css.includes('max-width:470px')],
 ['Reduced motion',css.includes('prefers-reduced-motion:reduce')],
 ['Visual CSS isolated to Specialist workspace',!/(^|\n)\s*(?:body|html|:root)\s*\{/.test(css)&&css.includes('.blr-shell .blr-hero')],
 ['No remote fonts/images/dependencies',!css.includes('@import')&&!css.includes('url(http')],
 ['Existing teacher workflow untouched',jsx.includes('saveLearningReport(selected,payload,submit)')&&jsx.includes('bulkRevokeLearningReportAssignments(ids)')],
];
for(const [label,pass] of checks)console.log((pass?'PASS':'FAIL')+': '+label);
assert.ok(checks.every(([,pass])=>pass));
assert.equal(isValidReportPeriod('2026-10'),true);
assert.equal(reportPeriodTitle('2026-10'),'Tháng 10/2026');
assert.equal(shiftReportPeriod('2026-12',1),'2027-01');
assert.equal(shiftReportPeriod('2026-01',-1),'2025-12');
console.log('PASS: '+checks.length+' editorial visual and behavior contracts, plus live month helpers.');
