import fs from 'node:fs';

const files = {
  tool: fs.readFileSync(new URL('../src/pages/ToolPage.jsx', import.meta.url), 'utf8'),
  portal: fs.readFileSync(new URL('../src/pages/BrianTeamPortal.jsx', import.meta.url), 'utf8'),
  ui: fs.readFileSync(new URL('../src/pages/MonthlyReportsWorkspace.jsx', import.meta.url), 'utf8'),
  util: fs.readFileSync(new URL('../src/utils/monthlyReports.js', import.meta.url), 'utf8'),
  sql: fs.readFileSync(new URL('../supabase/brian-monthly-reports.sql', import.meta.url), 'utf8'),
};

const checks = [
  ['Brian Team routes through the report-aware portal', files.tool.includes("renderLazy(BrianTeamPortal, props)")],
  ['Teachers get the monthly report workspace', files.portal.includes('MonthlyReportsWorkspace') && files.portal.includes('if (!isLeader)')],
  ['Seven report sections are present', ['Giảng dạy & tiến độ','Kiểm tra – đánh giá','Hoạt động chuyên môn','Học liệu – CNTT – thiết bị','Bồi dưỡng chuyên môn','Công việc khác trong tháng','Kế hoạch – khó khăn – kiến nghị'].every((label) => files.ui.includes(label))],
  ['Teacher submit action exists', files.ui.includes('Gửi TTCM') && files.ui.includes('saveMyMonthlyReport')],
  ['TTCM review workflow exists', files.ui.includes('Yêu cầu chỉnh sửa') && files.ui.includes('Duyệt báo cáo')],
  ['TTCM report export exists', files.ui.includes('Xuất Word') && files.ui.includes('In / PDF')],
  ['Structured report statuses exist', ['draft','submitted','revision','approved'].every((status) => files.util.includes(status))],
  ['Supabase monthly report table exists', files.sql.includes('create table if not exists public.department_monthly_reports')],
  ['Membership routing RPC exists', files.sql.includes('bes_monthly_report_context') && files.sql.includes('bes_monthly_report_membership')],
  ['RLS protects report data', files.sql.includes('enable row level security') && files.sql.includes('Teachers and TTCM update monthly reports')],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? '✓' : '✗'} ${label}`);
if (failed.length) process.exit(1);
console.log(`\n${checks.length}/${checks.length} monthly-report contract checks passed.`);
