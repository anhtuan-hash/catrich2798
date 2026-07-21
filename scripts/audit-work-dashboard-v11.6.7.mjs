#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const main = read('src/main.jsx');
const apps = read('src/data/apps.js');
const permissions = read('src/utils/permissions.js');
const palette = read('src/components/GlobalCommandPalette.jsx');
const navigation = read('src/components/GlobalFlatNavigation.jsx');
const workspaceTabs = read('src/components/WorkspaceTabs.jsx');
const department = read('src/pages/DepartmentWorkspace.jsx');
const page = read('src/pages/WorkDashboard.jsx');
const aggregator = read('src/utils/dashboardAggregator.js');
const css = read('src/styles/work-dashboard-v1167.css');

const checks = [];
const add = (name, pass) => checks.push({ name, pass: Boolean(pass) });

add('Dashboard là route riêng', main.includes("'dashboard'") && main.includes("currentRoute === 'dashboard'"));
add('Dashboard được lazy-load', main.includes("WorkDashboard = lazy"));
add('Có thẻ riêng trong trang Ứng dụng', apps.includes("slug: 'work-dashboard'") && apps.includes("titleVi: 'Bảng điều hành'"));
add('Có quyền route và mọi tài khoản đăng nhập đều mở được', permissions.includes("dashboard: 'route:dashboard'") && permissions.includes("if (route === 'dashboard') return Boolean(user)"));
add('Có trong Command Palette', palette.includes("route: 'dashboard'"));
add('Có thể ghim lên launcher/navigation', navigation.includes("dashboard: 'Bảng điều hành'") && navigation.includes("'dashboard'"));
add(
  'Tương thích cả bản có hoặc không có Workspace Tabs',
  !workspaceTabs || workspaceTabs.includes("dashboard: ['Dashboard', 'Bảng điều hành']")
);
add('Tổng hợp Work Hub', aggregator.includes("work_hub_items") && aggregator.includes("listWorkHubNotifications"));
add('Tổng hợp Tổ chuyên môn', aggregator.includes("loadDepartmentSnapshot") && aggregator.includes("listDepartmentSubmissions") && aggregator.includes("listDepartmentSubmissionRequests"));
add('Tổng hợp Kho học liệu', aggregator.includes("resource_items") && aggregator.includes("loadResourceLibrary"));
add('Tổng hợp Chủ nhiệm', aggregator.includes("loadHomeroomWorkspace") && aggregator.includes("buildHomeroomSummary"));
add('Tổng hợp ứng dụng gần đây và bản nháp không phụ thuộc workspace.js', aggregator.includes("loadWorkspace") && aggregator.includes("getRecentAppUsage") && aggregator.includes("DRAFT_PREFIX") && !aggregator.includes("from './workspace.js'"));
add('Dữ liệu được lọc theo vai trò', aggregator.includes("isDepartmentLeaderRole") && aggregator.includes("leader ? workItems"));
add('Có timeline 14 ngày', aggregator.includes("timelineWithin(allTimelineCandidates, 14") && page.includes("Hôm nay và 14 ngày tới"));
add('Có bảy khối Dashboard V1', ['panel-timeline','panel-attention','panel-professional','panel-department','panel-approvals','panel-continue','panel-homeroom'].every((marker) => page.includes(marker)));
add('Có Realtime và refresh theo sự kiện', page.includes("subscribeTable") && page.includes("DASHBOARD_SOURCE_EVENTS") && page.includes("setInterval"));
add('Mở đúng Work Hub item và tab Tổ chuyên môn', aggregator.includes("rememberWorkHubItem") && aggregator.includes("bes-dashboard-department-tab") && department.includes("bes-dashboard-department-tab"));
add('Không tạo bảng Supabase mới', !aggregator.includes('create table') && !page.includes('create table'));
add('Có dark mode và responsive', css.includes('html[data-theme="dark"]') && css.includes('@media(max-width:620px)'));
add('Cỡ chữ thân bài dễ đọc', css.includes('font-size:1.08rem') && css.includes('font-size:1rem'));

const failed = checks.filter((item) => !item.pass);
checks.forEach((item) => console.log(`${item.pass ? '✓' : '✗'} ${item.name}`));
if (failed.length) {
  console.error(`\n❌ Work Dashboard audit FAILED (${checks.length - failed.length}/${checks.length})`);
  process.exit(1);
}
console.log(`\n✅ Work Dashboard audit PASS (${checks.length}/${checks.length})`);
