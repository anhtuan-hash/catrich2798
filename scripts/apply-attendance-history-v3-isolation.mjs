import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const componentPath = path.join(root, 'src/components/GlobalAttendanceNavigationTab.jsx');
const cssPath = path.join(root, 'src/components/attendance/AttendanceHistoryV2.css');
const staticTestPath = path.join(root, 'scripts/test-attendance-history-visual-redesign.mjs');

function assertCount(source, needle, expected, label) {
  const count = source.split(needle).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected} occurrence(s) of ${needle}, found ${count}`);
}

let jsx = fs.readFileSync(componentPath, 'utf8');

const oldRoot = '<div className="attendance-history-layout attendance-history-v2">';
assertCount(jsx, oldRoot, 1, 'History root');
jsx = jsx.replace(oldRoot, '__AHV3_ROOT__');

const cancelledBranch = "                {selectedSession.session_status === 'cancelled' ? <>";
assertCount(jsx, cancelledBranch, 1, 'History cancelled/completed branch anchor');
const auditPanel = `                <section className="attendance-audit-actor-panel" aria-label="Nhật ký người thao tác">\n                  <header><div><strong>Nhật ký người thao tác</strong><span>Dữ liệu chốt buổi</span></div></header>\n                  <div><span>Người thao tác</span><b>{selectedSession.checked_by || 'Không ghi nhận'}</b></div>\n                  <div><span>Chốt lúc</span><b>{formatDateTime(selectedSession.checked_at)}</b></div>\n                </section>\n\n`;
jsx = jsx.replace(cancelledBranch, auditPanel + cancelledBranch);

jsx = jsx
  .replaceAll('attendance-history-v2__', 'ahv3__')
  .replaceAll('attendance-history-', 'ahv3__')
  .replaceAll('attendance-audit-actor-panel', 'ahv3__audit-actor-panel')
  .replace('__AHV3_ROOT__', '<div className="ahv3__shell" data-attendance-history-v3="true">');

const searchLabel = '<label className="ahv3__search">';
assertCount(jsx, searchLabel, 1, 'History search label');
jsx = jsx.replace(searchLabel, '<label className="ahv3__search" data-bes-keep-search="true">');

if (/className=(?:"[^"\n]*attendance-history-|\{`[^`\n]*attendance-history-)/.test(jsx)) {
  throw new Error('Legacy attendance-history-* className remains in React History source.');
}
if (!jsx.includes('className="ahv3__audit-actor-panel"')) throw new Error('React audit actor panel was not created.');
if (!jsx.includes('data-bes-keep-search="true"')) throw new Error('History search exemption is missing.');
fs.writeFileSync(componentPath, jsx);

let css = fs.readFileSync(cssPath, 'utf8');
css = css
  .replaceAll('.attendance-history-layout.attendance-history-v2', '.ahv3__shell')
  .replaceAll('.attendance-history-v2__', '.ahv3__')
  .replaceAll('.attendance-history-v2', '.ahv3__shell')
  .replace(/\.attendance-history-([A-Za-z0-9_-]+)/g, '.ahv3__$1')
  .replaceAll('.attendance-audit-actor-panel', '.ahv3__audit-actor-panel');

if (/\.attendance-history-/.test(css)) throw new Error('Legacy .attendance-history-* selector remains in V3 stylesheet.');
if (!css.includes('.ahv3__shell .ahv3__stat-grid')) throw new Error('V3 stat grid selector is missing after migration.');

if (!css.includes('.ahv3__shell .ahv3__audit-actor-panel {')) {
  css += `\n\n/* React-owned audit actor panel: intentionally namespaced away from legacy runtime CSS. */\n.ahv3__shell .ahv3__audit-actor-panel {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto auto;\n  align-items: center;\n  gap: 10px 18px;\n  margin: 0 16px 12px;\n  padding: 11px 13px;\n  border: 1px solid var(--ahv2-border);\n  border-radius: 14px;\n  background: #f8fbff;\n  color: var(--ahv2-ink);\n}\n\n.ahv3__shell .ahv3__audit-actor-panel header {\n  min-width: 0;\n}\n\n.ahv3__shell .ahv3__audit-actor-panel header strong,\n.ahv3__shell .ahv3__audit-actor-panel header span,\n.ahv3__shell .ahv3__audit-actor-panel > div span,\n.ahv3__shell .ahv3__audit-actor-panel > div b {\n  display: block;\n}\n\n.ahv3__shell .ahv3__audit-actor-panel header strong {\n  font-size: 11px;\n}\n\n.ahv3__shell .ahv3__audit-actor-panel header span,\n.ahv3__shell .ahv3__audit-actor-panel > div span {\n  margin-top: 2px;\n  color: var(--ahv2-muted);\n  font-size: 9px;\n}\n\n.ahv3__shell .ahv3__audit-actor-panel > div {\n  min-width: 0;\n  text-align: right;\n}\n\n.ahv3__shell .ahv3__audit-actor-panel > div b {\n  margin-top: 2px;\n  max-width: 260px;\n  overflow: hidden;\n  font-size: 9.5px;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n@media (max-width: 900px) {\n  .ahv3__shell .ahv3__audit-actor-panel {\n    grid-template-columns: 1fr;\n  }\n\n  .ahv3__shell .ahv3__audit-actor-panel > div {\n    text-align: left;\n  }\n}\n`;
}
fs.writeFileSync(cssPath, css);

const staticTest = `import fs from 'node:fs';\nimport path from 'node:path';\n\nconst root = process.cwd();\nconst read = (file) => fs.readFileSync(path.join(root, file), 'utf8');\nconst jsx = read('src/components/GlobalAttendanceNavigationTab.jsx');\nconst css = read('src/components/attendance/AttendanceHistoryV2.css');\nconst legacyCss = read('public/attendance-ui-polish.css');\nconst stripJs = read('public/bes-remove-visible-search-bars.js');\n\nfunction expect(condition, message) {\n  if (!condition) throw new Error(message);\n}\n\nexpect(jsx.includes('className="ahv3__shell"'), 'History must render from the ahv3 namespace root.');\nexpect(jsx.includes('data-attendance-history-v3="true"'), 'History V3 root marker is missing.');\nexpect(jsx.includes('className="ahv3__search" data-bes-keep-search="true"'), 'History search must be explicitly exempt from global search stripping.');\nexpect(jsx.includes('className="ahv3__audit-actor-panel"'), 'Audit actor panel must be React-owned.');\nexpect(jsx.includes("selectedSession.checked_by || 'Không ghi nhận'"), 'Audit actor panel must render the stored checked_by value.');\nexpect(!/className=(?:"[^"\\n]*attendance-history-|\\{\\`[^\\`\\n]*attendance-history-)/.test(jsx), 'React History still exposes legacy attendance-history-* class names.');\n\nexpect(css.includes('.ahv3__shell'), 'V3 stylesheet root is missing.');\nexpect(!/\\.attendance-history-/.test(css), 'V3 stylesheet still contains legacy .attendance-history-* selectors.');\nexpect(/\\.ahv3__shell \\.ahv3__stat-grid\\s*\\{[\\s\\S]*?grid-template-columns:\\s*repeat\\(5,\\s*minmax\\(0,\\s*1fr\\)\\)/.test(css), 'Summary must define five equal columns in V3 CSS.');\nexpect(/\\.ahv3__shell \\.ahv3__detail > \\.ahv3__stat-grid\\s*\\{\\s*order:\\s*5;/.test(css), 'Summary order contract is missing.');\nexpect(/\\.ahv3__shell \\.ahv3__detail > \\.ahv3__audit-actor-panel\\s*\\{\\s*order:\\s*6;/.test(css), 'Audit actor order contract is missing.');\nexpect(/\\.ahv3__shell \\.ahv3__detail > \\.ahv3__proof\\s*\\{\\s*order:\\s*7;/.test(css), 'Proof order contract is missing.');\nexpect(/\\.ahv3__proof-image img\\s*\\{[\\s\\S]*?max-height:\\s*(?:1\\d\\d|20\\d|210)px/.test(css), 'Proof image must retain a bounded max-height.');\nexpect(!legacyCss.includes('.ahv3__'), 'Legacy attendance-ui-polish.css must not know about the V3 namespace.');\nexpect(stripJs.includes('[data-bes-keep-search="true"]'), 'Global search stripper must honor data-bes-keep-search.');\n\nconsole.log('Attendance History V3 static isolation contract passed.');\n`;
fs.writeFileSync(staticTestPath, staticTest);

console.log('Applied Attendance History V3 legacy isolation migration.');
