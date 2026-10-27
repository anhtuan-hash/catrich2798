import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const spec=read('docs/brian-learning-reports-macos-material3-redesign-spec-20261027.md');
const css=read('src/features/learningReports/LearningReportsMacMaterial.css');
const portalCss=read('src/pages/BrianTeamPortal.css');
const workspace=read('src/features/learningReports/LearningReportsWorkspace.jsx');
const table=read('src/features/learningReports/LearningAssignmentManager.jsx');
const portal=read('src/pages/BrianTeamPortal.jsx');
const analytics=read('src/features/learningReports/LearningReportsManagerDashboard.jsx');
const smart=read('src/features/learningReports/SmartAssignmentComposer.jsx');
const checks=[
  ['Full written design specification',spec.includes('## 12. Acceptance gates')&&spec.includes('## 7. Teacher assignment list')],
  ['Scoped theme CSS loaded after base CSS',workspace.indexOf("import './LearningReportsMacMaterial.css'")>workspace.indexOf("import './LearningReportsWorkspace.css'")],
  ['No global html/body styling',!/^\s*(?:html|body|\*)\s*\{/m.test(css)],
  ['Typography / surfaces / colours from tokens',css.includes('--blm-brand:#2465c8')&&css.includes('--blm-shadow:')],
  ['Hero includes CSS decorative document and layered surfaces',css.includes('.blr-hero-icon:before')&&css.includes('.blr-hero:after')],
  ['Editorial illustration hidden from screenreader',workspace.includes('className="blr-editorial-hero__art" aria-hidden="true"')&&workspace.includes('className="blr-editorial-hero__paper"')],
  ['Accessible role tabs preserved',workspace.includes('role="tablist"')&&workspace.includes('aria-selected={managerView')],
  ['Metric cards have real semantic icons',workspace.includes('icon={FileText}')&&workspace.includes('icon={Clock3}')&&workspace.includes('icon={CheckCircle2}')&&workspace.includes('icon={AlertCircle}')],
  ['Metric numerals use readable tabular figures',css.includes('font-variant-numeric:tabular-nums')],
  ['Separate dedicated programme portal style',portal.includes('btp-specialist-portal')&&portalCss.includes('.btp-specialist-portal .btp-switcher')],
  ['Global monthly report untouched by visual selector',!css.includes('.mrw-')&&!css.includes('.monthly-reports')],
  ['Real unified teacher table maintained',workspace.includes('<LearningAssignmentManager')&&table.includes('Danh sách báo cáo được giao')],
  ['Select-all and safe revoke preserved',table.includes('Chọn tất cả')&&table.includes('reportCanBeRevoked(t)')&&table.includes('onBulkRevoke')],
  ['Action panel remains working',workspace.includes('setShowComposer(v=>!v)')&&workspace.includes('<SmartAssignmentComposer')],
  ['Attendance source and teacher identity preserved',workspace.includes('loadLearningAttendance(selected.id)')&&workspace.includes('attendance_snapshot')],
  ['Student data and write functions untouched',workspace.includes('saveLearningReport(selected,payload,submit)')&&workspace.includes('reviewLearningReport(selected.id,status,reviewComment)')],
  ['Summary and annual views accessible',workspace.includes("managerView==='summary'")&&workspace.includes("managerView==='history'")],
  ['Month and annual metrics visually harmonized',css.includes('.blrd-metrics')&&css.includes('.blrd-month-grid')&&css.includes('.blrd-deadline')],
  ['Native Print/PDF retained',analytics.includes('window.print()')],
  ['Auto assignment preview retained',smart.includes('previewSmartLearningAssignments')],
  ['Keyboard focus visible for controls',css.includes(':focus-visible')&&portalCss.includes('btp-switcher button:focus-visible')],
  ['Mobile and tablet responsive',css.includes('max-width:1200px')&&css.includes('max-width:880px')&&css.includes('max-width:650px')],
  ['Reduced-motion support',css.includes('prefers-reduced-motion:reduce')],
  ['Floating tools clearance',css.includes('Floating utilities remain outside Specialist')],
  ['No external font/network dependence',!css.includes('@import')&&!css.includes('url(http')],
];
for(const [label,ok] of checks)console.log((ok?'PASS':'FAIL')+': '+label);
assert.ok(checks.every(([,ok])=>ok),'macOS Material 3 redesign contract failed');
console.log('PASS: '+checks.length+' UI design/behaviour contracts.');
