import fs from 'node:fs';

const files = {
  tool: fs.readFileSync(new URL('../src/pages/ToolPage.jsx', import.meta.url), 'utf8'),
  portal: fs.readFileSync(new URL('../src/pages/BrianTeamPortal.jsx', import.meta.url), 'utf8'),
  ui: fs.readFileSync(new URL('../src/pages/MonthlyReportsWorkspace.jsx', import.meta.url), 'utf8'),
  util: fs.readFileSync(new URL('../src/utils/monthlyReports.js', import.meta.url), 'utf8'),
  templateCss: fs.readFileSync(new URL('../src/pages/MonthlyReportsTemplate.css', import.meta.url), 'utf8'),
  modernCss: fs.readFileSync(new URL('../src/pages/MonthlyReportsWorkspaceModern.css', import.meta.url), 'utf8'),
  flatNavigation: fs.readFileSync(new URL('../src/components/GlobalFlatNavigation.jsx', import.meta.url), 'utf8'),
  reportsTab: fs.readFileSync(new URL('../src/components/GlobalReportsNavigationTab.jsx', import.meta.url), 'utf8'),
  sql: fs.readFileSync(new URL('../supabase/brian-monthly-reports.sql', import.meta.url), 'utf8'),
};

const requiredStats = [
  'Dự giờ', 'Thao giảng', 'UDCNTT', 'SH chuyên đề', 'Dự án', 'Làm ĐDDH',
  'SD ĐDDH', 'SKKN', 'HSSS', 'TNTH', 'SD bảng TTTM', 'Lượt khai thác các kho học liệu số',
];

const checks = [
  ['Brian Team routes through the report-aware portal', files.tool.includes("renderLazy(BrianTeamPortal, props)")],
  ['Teachers get the monthly report workspace', files.portal.includes('MonthlyReportsWorkspace') && files.portal.includes('if (!isLeader)')],
  ['Template-style report sections are present', ['Công tác tổ chức','Số liệu chuyên môn','Tình hình thực hiện chuyên môn trong tháng','Kế hoạch thực hiện trong thời gian tới','Một số ý kiến, kiến nghị'].every((label) => files.ui.includes(label))],
  ['Full source numeric table is preserved', requiredStats.every((label) => files.util.includes(label)) && files.ui.includes('ProfessionalStatsTable')],
  ['Narrative sections use guided textareas', files.ui.includes('PLACEHOLDERS.organization') && files.ui.includes('PLACEHOLDERS.development') && files.ui.includes('PLACEHOLDERS.monthly') && files.ui.includes('PLACEHOLDERS.plan') && files.ui.includes('PLACEHOLDERS.recommendation')],
  ['No detailed add-activity workflow remains in teacher form', !files.ui.includes('Thêm hoạt động kiểm tra') && !files.ui.includes('Thêm hoạt động chuyên môn') && !files.ui.includes('Thêm học liệu / sản phẩm')],
  ['Teacher submit action exists', files.ui.includes('Gửi TTCM') && files.ui.includes('saveMyMonthlyReport')],
  ['TTCM review workflow exists', files.ui.includes('Yêu cầu chỉnh sửa') && files.ui.includes('Duyệt báo cáo')],
  ['TTCM sees aggregated full numeric table', files.ui.includes('TỔNG HỢP TỪ GIÁO VIÊN') && files.ui.includes('summary.stats')],
  ['TTCM report export exists', files.ui.includes('Xuất Word') && files.ui.includes('In / PDF')],
  ['Schema v2 keeps report status workflow', files.util.includes('schemaVersion: 2') && ['draft','submitted','revision','approved'].every((status) => files.util.includes(status))],
  ['Template styles are loaded', files.portal.includes("./MonthlyReportsTemplate.css") && files.templateCss.includes('.mr-number-table')],
  ['Modern report visual layer is loaded last', files.portal.includes("./MonthlyReportsWorkspaceModern.css") && files.modernCss.includes('.mr-shell.mr-teacher-shell') && files.modernCss.includes('.mr-manager')],
  ['Reports quick-access tab is mounted in primary navigation', files.flatNavigation.includes('GlobalReportsNavigationTab') && files.flatNavigation.includes('<GlobalReportsNavigationTab {...props} />')],
  ['Reports quick-access tab opens Brian Team reports', files.reportsTab.includes("target: '#/tool/brian-team'") && files.reportsTab.includes("language === 'vi' ? 'Báo cáo' : 'Reports'")],
  ['Supabase monthly report table exists', files.sql.includes('create table if not exists public.department_monthly_reports')],
  ['Membership routing RPC exists', files.sql.includes('bes_monthly_report_context') && files.sql.includes('bes_monthly_report_membership')],
  ['RLS protects report data', files.sql.includes('enable row level security') && files.sql.includes('Teachers and TTCM update monthly reports')],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? '✓' : '✗'} ${label}`);
if (failed.length) process.exit(1);
console.log(`\n${checks.length}/${checks.length} monthly-report contract checks passed.`);
