import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const componentPath = path.join(root, 'src/components/GlobalAttendanceNavigationTab.jsx');
const cssPath = path.join(root, 'src/components/attendance/AttendanceHistoryV2.css');

function assertCount(source, needle, expected, label) {
  const count = source.split(needle).length - 1;
  if (count !== expected) {
    throw new Error(`${label}: expected ${expected} occurrence(s), found ${count}`);
  }
}

let jsx = fs.readFileSync(componentPath, 'utf8');

const oldRoot = '<div className="attendance-history-layout attendance-history-v2">';
assertCount(jsx, oldRoot, 1, 'History root');
jsx = jsx.replace(oldRoot, '__AHV3_ROOT__');

const completedBranch = "                {selectedSession.session_status === 'cancelled' ? <>";
assertCount(jsx, completedBranch, 1, 'History completed/cancelled branch anchor');
const auditPanel = [
  '                <section className="attendance-audit-actor-panel" aria-label="Nhật ký người thao tác">',
  '                  <header className="attendance-audit-actor-panel__head">',
  '                    <div><strong>Nhật ký người thao tác</strong><span>Dữ liệu chốt buổi</span></div>',
  '                  </header>',
  '                  <div className="attendance-audit-actor-panel__grid">',
  "                    <div><span>Người thao tác</span><b>{selectedSession.checked_by || 'Không ghi nhận'}</b></div>",
  '                    <div><span>Chốt lúc</span><b>{formatDateTime(selectedSession.checked_at)}</b></div>',
  '                  </div>',
  '                </section>',
  '',
].join('\n');
jsx = jsx.replace(completedBranch, auditPanel + completedBranch);

jsx = jsx
  .replaceAll('attendance-history-v2__', 'ahv3__')
  .replaceAll('attendance-history-', 'ahv3__')
  .replaceAll('attendance-audit-actor-panel', 'ahv3__audit-actor-panel')
  .replace('__AHV3_ROOT__', '<div className="ahv3__shell" data-attendance-history-v3="true">');

const searchLabel = '<label className="ahv3__search">';
assertCount(jsx, searchLabel, 1, 'History search label');
jsx = jsx.replace(searchLabel, '<label className="ahv3__search" data-bes-keep-search="true">');

if (/className="[^"\n]*attendance-history-/.test(jsx)) {
  throw new Error('Legacy attendance-history-* className remains in React History source.');
}
if (!jsx.includes('className="ahv3__audit-actor-panel"')) {
  throw new Error('React audit actor panel was not created.');
}
if (!jsx.includes('data-bes-keep-search="true"')) {
  throw new Error('History search exemption is missing.');
}
fs.writeFileSync(componentPath, jsx);

let css = fs.readFileSync(cssPath, 'utf8');
css = css
  .replaceAll('.attendance-history-layout.attendance-history-v2', '.ahv3__shell')
  .replaceAll('.attendance-history-v2__', '.ahv3__')
  .replaceAll('.attendance-history-v2', '.ahv3__shell')
  .replace(/\.attendance-history-([A-Za-z0-9_-]+)/g, '.ahv3__$1')
  .replaceAll('.attendance-audit-actor-panel', '.ahv3__audit-actor-panel');

if (/\.attendance-history-/.test(css)) {
  throw new Error('Legacy .attendance-history-* selector remains in V3 stylesheet.');
}
if (!css.includes('.ahv3__shell .ahv3__stat-grid')) {
  throw new Error('V3 stat-grid selector is missing after migration.');
}

css += `

/* History V3 is React-owned and intentionally outside every legacy History selector. */
.ahv3__shell .ahv3__audit-actor-panel__head strong,
.ahv3__shell .ahv3__audit-actor-panel__head span,
.ahv3__shell .ahv3__audit-actor-panel__grid span,
.ahv3__shell .ahv3__audit-actor-panel__grid b {
  display: block;
}

.ahv3__shell .ahv3__audit-actor-panel__head strong {
  color: var(--ahv2-ink);
  font-size: 10.5px;
}

.ahv3__shell .ahv3__audit-actor-panel__head span,
.ahv3__shell .ahv3__audit-actor-panel__grid span {
  margin-top: 2px;
  color: var(--ahv2-muted);
  font-size: 8.5px;
}

.ahv3__shell .ahv3__audit-actor-panel__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.ahv3__shell .ahv3__audit-actor-panel__grid > div {
  min-width: 0;
  padding: 8px 9px;
  border-radius: 10px;
  background: #f5f8fd;
}

.ahv3__shell .ahv3__audit-actor-panel__grid b {
  margin-top: 2px;
  overflow: hidden;
  color: var(--ahv2-ink);
  font-size: 9.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .ahv3__shell .ahv3__audit-actor-panel__grid {
    grid-template-columns: 1fr;
  }
}
`;

fs.writeFileSync(cssPath, css);
console.log('Applied Attendance History V3 legacy isolation migration.');
