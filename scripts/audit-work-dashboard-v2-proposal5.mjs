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

add('Dashboard vẫn là route riêng', main.includes("'dashboard'") && main.includes("currentRoute === 'dashboard'"));
add('Dashboard vẫn được lazy-load', main.includes('WorkDashboard = lazy'));
add('Thẻ Bảng điều hành vẫn có trong trang Ứng dụng', apps.includes("slug: 'work-dashboard'") && apps.includes("titleVi: 'Bảng điều hành'"));
add('Phân quyền route vẫn được giữ', permissions.includes("dashboard: 'route:dashboard'") && permissions.includes("if (route === 'dashboard') return Boolean(user)"));
add('Command Palette vẫn mở được Dashboard', palette.includes("route: 'dashboard'"));
add('Có thể ghim Dashboard lên launcher/navigation', navigation.includes("dashboard: 'Bảng điều hành'") && navigation.includes("'dashboard'"));
add('Tương thích bản có hoặc không có Workspace Tabs', !workspaceTabs || workspaceTabs.includes("dashboard: ['Dashboard', 'Bảng điều hành']"));

add('Giữ tổng hợp Work Hub', aggregator.includes('work_hub_items') && aggregator.includes('listWorkHubNotifications'));
add('Giữ tổng hợp Tổ chuyên môn', aggregator.includes('loadDepartmentSnapshot') && aggregator.includes('listDepartmentSubmissions'));
add('Giữ tổng hợp Kho học liệu', aggregator.includes('resource_items') && aggregator.includes('loadResourceLibrary'));
add('Giữ tổng hợp Chủ nhiệm', aggregator.includes('loadHomeroomWorkspace') && aggregator.includes('buildHomeroomSummary'));
add('Không phụ thuộc workspace.js đã bị xoá', !aggregator.includes("from './workspace.js'") && aggregator.includes('function loadWorkspace()'));
add('Dữ liệu tiếp tục lọc theo vai trò', aggregator.includes('isDepartmentLeaderRole') && aggregator.includes('leader ? workItems'));
add('Deep-link Work Hub và Tổ chuyên môn còn hoạt động', aggregator.includes('rememberWorkHubItem') && aggregator.includes('bes-dashboard-department-tab') && department.includes('bes-dashboard-department-tab'));
add('Realtime và làm mới 60 giây còn hoạt động', page.includes('subscribeTable') && page.includes('DASHBOARD_SOURCE_EVENTS') && page.includes('setInterval(onRefresh, 60000)'));

add('Đúng hero Đề xuất 5', page.includes('wd5-hero') && page.includes('wd5-hero-illustration') && page.includes('wd5-profile-card'));
add('Đồ hoạ hero được dựng bằng CSS', ['wd5-paper-plane','wd5-books','wd5-mug','wd5-tablet','wd5-plant'].every((marker) => page.includes(marker) && css.includes(`.${marker}`)));
add('Có đúng năm widget chỉ số', (page.match(/<MetricCard/g) || []).length === 5 && css.includes('grid-template-columns:repeat(5'));
add('Năm widget có màu riêng', ['tone-blue','tone-green','tone-violet','tone-orange','tone-cyan'].every((marker) => css.includes(marker)));
add('Hai thẻ chính cùng hàng và cùng chiều cao', page.includes('wd5-main-grid') && page.includes('wd5-task-card') && page.includes('wd5-schedule-card') && css.includes('grid-auto-rows:430px'));
add('Ba thẻ Phê duyệt/Tổ/Chủ nhiệm cùng hàng', page.includes('wd5-triple-grid') && page.includes('wd5-approval-card') && page.includes('wd5-department-card') && page.includes('wd5-homeroom-card'));
add('Các card dùng cấu trúc header-body-footer', page.includes('wd5-card-head') && page.includes('wd5-card-body') && page.includes('wd5-card-foot') && css.includes('grid-template-rows:auto minmax(0,1fr) auto'));
add('Danh sách công việc có vùng cuộn riêng', page.includes('wd5-scroll-list') && css.includes('overflow:auto'));
add('Lịch 14 ngày có vùng cuộn riêng', page.includes('ScheduleRow') && page.includes('scheduleRange'));
add('Bộ lọc công việc tương tác', page.includes("setTaskFilter") && page.includes("['all', 'today', 'soon', 'overdue', 'pending']"));
add('Bộ lọc lịch 0/7/14 ngày tương tác', page.includes('setScheduleRange(0)') && page.includes('setScheduleRange(7)') && page.includes('setScheduleRange(14)'));
add('Widget chỉ số lọc dữ liệu thật', page.includes("taskFilter === 'overdue'") && page.includes("taskFilter === 'today'") && page.includes("taskFilter === 'soon'"));
add('Carousel bản nháp/học liệu tương tác', page.includes('bottomMode') && page.includes('scrollCarousel') && css.includes('scroll-snap-type:x mandatory'));
add('Nguồn dữ liệu vẫn hiển thị', page.includes('SourcePill') && page.includes('snapshot?.sources?.workHub'));
add('Không tạo bảng Supabase mới', !page.includes('create table') && !aggregator.includes('create table'));
add('Không tải ảnh ngoài cho hero', !page.includes('<img') && !css.includes('url(http'));
add('Có dark mode', css.includes('html[data-theme="dark"]'));
add('Có responsive desktop/tablet/mobile', css.includes('@media(max-width:1280px)') && css.includes('@media(max-width:980px)') && css.includes('@media(max-width:680px)'));
add('Tương thích cỡ chữ 130% và 140%', css.includes('html[data-font-scale="130"]') && css.includes('html[data-font-scale="140"]'));
add('Có hỗ trợ Reduce Motion', css.includes('@media(prefers-reduced-motion:reduce)'));

const remValues = [...css.matchAll(/(?<![\w-])(0?\.\d+)rem/g)].map((match) => Number(match[1]));
add('Không có cỡ chữ rem dưới 14px', remValues.every((value) => value >= 0.875));
add('Tiêu đề và số liệu dùng chữ lớn', css.includes('clamp(2.2rem,3.2vw,3.875rem)') && css.includes('2.05rem') && css.includes('1.35rem'));
add('Thanh cuộn rõ, không quá mảnh', css.includes('::-webkit-scrollbar{width:11px;height:11px}') && css.includes('scrollbar-width:auto'));

const failed = checks.filter((item) => !item.pass);
checks.forEach((item) => console.log(`${item.pass ? '✓' : '✗'} ${item.name}`));
if (failed.length) {
  console.error(`\n❌ Dashboard Proposal 5 audit FAILED (${checks.length - failed.length}/${checks.length})`);
  process.exit(1);
}
console.log(`\n✅ Dashboard Proposal 5 audit PASS (${checks.length}/${checks.length})`);
