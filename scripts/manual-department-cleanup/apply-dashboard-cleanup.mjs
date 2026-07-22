import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, value) => fs.writeFileSync(path.join(root, file), value);

function replaceRequired(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`Missing expected ${label}: ${from.slice(0, 100)}`);
  return text.replace(from, to);
}

let dashboard = read('src/pages/WorkDashboard.jsx');
const replacements = [
  ["    department: 'Tổ chuyên môn',", "    professional: 'Hoạt động chuyên môn',", 'Vietnamese professional label'],
  ["    emptyDepartment: 'Chưa có hoạt động chuyên môn.',", "    emptyProfessional: 'Chưa có hoạt động chuyên môn.',", 'Vietnamese empty label'],
  ["    leader: 'Department leader',", "    leader: 'Team leader',", 'English leader label'],
  ["    department: 'Department',", "    professional: 'Professional work',", 'English professional label'],
  ["    emptyDepartment: 'No professional activity yet.',", "    emptyProfessional: 'No professional activity yet.',", 'English empty label'],
  ["      ['department_workspace_snapshots', 'dashboard-department'],\n      ['department_submissions', 'dashboard-submissions'],\n      ['department_submission_requests', 'dashboard-requests'],\n", '', 'legacy realtime tables'],
  ["  const completion = snapshot?.departmentHealth?.progress || 0;", "  const completion = snapshot?.workflowHealth?.progress || 0;", 'workflow completion'],
  ["<button type=\"button\" onClick={() => { window.location.hash = '#/department'; }}>▣ {t.department}</button>", "<button type=\"button\" onClick={() => { window.location.hash = '#/resource-library'; }}>▣ {t.resources}</button>", 'hero action'],
  ["Work Hub · {t.department} · {t.resources} · {t.homeroom}", "Work Hub · {t.resources} · {t.homeroom}", 'sync source list'],
  ["note={`${snapshot?.departmentHealth?.open || 0} ${t.taskCount}`} selected={false} onClick={() => document.querySelector('.wd5-department-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}", "note={`${snapshot?.workflowHealth?.open || 0} ${t.taskCount}`} selected={false} onClick={() => document.querySelector('.wd5-professional-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}", 'completion metric'],
  ["action={() => openDashboardTarget({ route: 'department', departmentTab: 'submissions' })}", "action={() => { window.location.hash = '#/work-hub'; }}", 'approval action'],
  ["className=\"wd5-department-card\" icon=\"●\" title={t.department}", "className=\"wd5-professional-card\" icon=\"●\" title={t.professional}", 'professional card'],
  ["<button type=\"button\" onClick={() => { window.location.hash = '#/department'; }}>{completion}% →</button>", "<button type=\"button\" onClick={() => { window.location.hash = '#/work-hub'; }}>{completion}% →</button>", 'professional footer action'],
  ["className=\"wd5-feature-art department\"", "className=\"wd5-feature-art professional\"", 'professional illustration'],
  ["t.emptyDepartment", "t.emptyProfessional", 'professional empty state'],
  ["<SourcePill label=\"Tổ chuyên môn\" value={snapshot?.sources?.department || 'empty'} t={t} />", '', 'legacy source pill'],
];
for (const [from, to, label] of replacements) dashboard = replaceRequired(dashboard, from, to, label);
dashboard = dashboard.replaceAll("action={() => { window.location.hash = '#/department'; }}", "action={() => { window.location.hash = '#/work-hub'; }}");
if (/#\/department|departmentStore|department_workspace_|wd5-department|t\.department|departmentHealth/.test(dashboard)) {
  throw new Error('WorkDashboard still contains an old workspace reference.');
}
write('src/pages/WorkDashboard.jsx', dashboard);

let dashboardCss = read('src/styles/work-dashboard-v1167.css');
dashboardCss = replaceRequired(dashboardCss, '.wd5-feature-art.department span', '.wd5-feature-art.professional span', 'professional illustration CSS');
write('src/styles/work-dashboard-v1167.css', dashboardCss);

console.log('Manual workspace cleanup applied to WorkDashboard and its stylesheet.');
