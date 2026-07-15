import { APPS, GAME_APPS, SPECIAL_TOOLS } from './apps.js';

export const ROUTE_APP_SHORTCUTS = [
  {
    slug: 'homeroom-hub', route: 'homeroom', icon: 'HR', tone: 'mint',
    group: 'School Management', groupVi: 'Quản lý lớp học',
    title: 'Homeroom Teacher', titleVi: 'Giáo viên chủ nhiệm',
    desc: 'Progress summaries, subject feedback, team competition, family/student portals and school-wide reports.',
    descVi: 'Tổng hợp tiến độ, nhận xét bộ môn, thi đua, cổng phụ huynh/học sinh và báo cáo toàn trường.',
    status: 'Phase 2 · Connected', statusVi: 'GVCN · Liên thông',
  },
  {
    slug: 'library-hub', route: 'library', icon: 'LB', tone: 'green',
    group: 'Teaching Resources', groupVi: 'Học liệu cá nhân',
    title: 'Library', titleVi: 'Thư viện',
    desc: 'Saved teaching resources, prompts, questions, reports and exported lesson materials.',
    descVi: 'Kho tài liệu, prompt, câu hỏi, báo cáo và học liệu đã lưu.',
    status: 'Resource shelf', statusVi: 'Kho nội dung đã lưu',
  },
  {
    slug: 'practice-hub', route: 'practice', icon: 'CL', tone: 'blue',
    group: 'Classroom', groupVi: 'Lớp học',
    title: 'Classroom', titleVi: 'Lớp học',
    desc: 'Scored practice sessions with progress tracking for learners.',
    descVi: 'Giao bài luyện, theo dõi tiến độ và chấm điểm học sinh.',
    status: 'Practice flow', statusVi: 'Giao bài · Theo dõi',
  },
  {
    slug: 'admin-hub', route: 'admin', icon: 'AD', tone: 'red',
    group: 'Administration', groupVi: 'Quản trị',
    title: 'Admin', titleVi: 'Quản trị',
    desc: 'Manage users, permissions, system configuration and activity logs.',
    descVi: 'Quản lý người dùng, vai trò, quyền truy cập và cấu hình hệ thống.',
    status: 'Control room', statusVi: 'Trung tâm điều khiển', adminOnly: true, hideable: false,
  },
];

export const HIDDEN_APPS_FOLDER = {
  slug: 'hidden-apps-vault',
  route: 'app-vault',
  icon: 'HV',
  tone: 'purple',
  group: 'Administration',
  groupVi: 'Quản trị ứng dụng',
  title: 'Hidden Apps Vault',
  titleVi: 'Thư mục ứng dụng đã ẩn',
  desc: 'Temporarily hide unused apps from teachers and restore them whenever needed.',
  descVi: 'Tạm ẩn các ứng dụng chưa sử dụng khỏi tài khoản giáo viên và khôi phục bất cứ lúc nào.',
  status: 'Admin only · Visibility control',
  statusVi: 'Chỉ Admin · Kiểm soát hiển thị',
  adminOnly: true,
  hideable: false,
};

export function appVisibilityId(item) {
  if (!item) return '';
  if (item.visibilityId) return String(item.visibilityId);
  if (item.slug && !item.routeOnly) return `tool:${item.slug}`;
  if (item.route) return `route:${item.route}`;
  return '';
}

function normalizeCatalogItem(item, source) {
  const id = appVisibilityId(item);
  return {
    ...item,
    id,
    source,
    target: item.route ? `#/${item.route}` : `#/tool/${item.slug}`,
    hideable: item.hideable !== false && !item.adminOnly,
  };
}

export function getAppVisibilityCatalog() {
  const merged = [
    ...APPS.map((item) => normalizeCatalogItem(item, 'apps')),
    ...GAME_APPS.map((item) => normalizeCatalogItem(item, 'games')),
    ...SPECIAL_TOOLS.map((item) => normalizeCatalogItem(item, 'tools')),
    ...ROUTE_APP_SHORTCUTS.map((item) => normalizeCatalogItem({ ...item, routeOnly: true }, 'routes')),
  ];
  const seen = new Set();
  return merged.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function findVisibilityItemByRoute(route) {
  const app = [...APPS, ...GAME_APPS, ...SPECIAL_TOOLS].find((item) => item.route === route);
  if (app) return normalizeCatalogItem(app, 'apps');
  const shortcut = ROUTE_APP_SHORTCUTS.find((item) => item.route === route);
  if (shortcut) return normalizeCatalogItem({ ...shortcut, routeOnly: true }, 'routes');
  return null;
}

export function visibilityIdForRoute(route, selectedTool = null) {
  if (route === 'tool' && selectedTool?.slug) return appVisibilityId(selectedTool);
  return findVisibilityItemByRoute(route)?.id || (route ? `route:${route}` : '');
}
