import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../data/apps.js';
import { HOMEROOM_PERMISSION_ID, HOMEROOM_PERMISSION_ITEM } from '../data/homeroom.js';
import { isAdminRole, isDepartmentLeaderRole } from './roles.js';

export const PERMISSION_MODE_ALL = 'all';
export const PERMISSION_MODE_CUSTOM = 'custom';

export const ROUTE_PERMISSION_IDS = {
  apps: 'section:apps',
  news: 'tool:news-reader',
  games: 'section:games',
  tools: 'section:tools',
  'resource-library': 'route:resource-library',
  'knowledge-hub': 'route:knowledge-hub',
  dashboard: 'route:dashboard',
  'work-hub': 'route:work-hub',
  'content-ecosystem': 'route:content-ecosystem',
  'assessment-core': 'route:assessment-core',
  'platform-readiness': 'route:platform-readiness',
  'automation-center': 'route:automation-center',
  'cloud-operations': 'route:cloud-operations',
  'collaboration-hub': 'route:collaboration-hub',
  'data-governance': 'route:data-governance',
  'production-hardening': 'route:production-hardening',
  'app-vault': 'route:app-vault',
  qa: 'route:qa',
  attendance: 'route:attendance',
  settings: 'route:settings',
  homeroom: HOMEROOM_PERMISSION_ID,
};

// Attendance is intentionally outside normal "full teacher" access.
// The legacy route:attendance id remains readable for backwards compatibility only.
export const ATTENDANCE_PERMISSION_IDS = {
  quick: 'attendance:quick',
  calendar: 'attendance:calendar',
  manage: 'attendance:manage',
  history: 'attendance:history',
  report: 'attendance:report',
};

export const ATTENDANCE_PERMISSION_ITEMS = [
  {
    id: ATTENDANCE_PERMISSION_IDS.quick,
    tab: 'quick',
    type: 'attendance',
    section: 'attendance',
    title: 'Quick attendance',
    titleVi: 'Điểm danh nhanh',
    desc: 'Take attendance, cancel a class session, and reopen a locked attendance day.',
    descVi: 'Điểm danh, hủy buổi học và xóa buổi điểm danh đã chốt để mở lại ngày.',
  },
  {
    id: ATTENDANCE_PERMISSION_IDS.calendar,
    tab: 'calendar',
    type: 'attendance',
    section: 'attendance',
    title: 'Monthly calendar',
    titleVi: 'Lịch tháng',
    desc: 'View the monthly attendance calendar.',
    descVi: 'Xem lịch điểm danh theo tháng.',
  },
  {
    id: ATTENDANCE_PERMISSION_IDS.manage,
    tab: 'manage',
    type: 'attendance',
    section: 'attendance',
    title: 'Class management',
    titleVi: 'Quản lý lớp',
    desc: 'Import, create, edit and remove extra classes, students and teachers.',
    descVi: 'Import, tạo, chỉnh sửa và xóa lớp, học sinh, giáo viên phụ đạo/bồi dưỡng.',
  },
  {
    id: ATTENDANCE_PERMISSION_IDS.history,
    tab: 'history',
    type: 'attendance',
    section: 'attendance',
    title: 'Attendance history',
    titleVi: 'Lịch sử',
    desc: 'View completed and cancelled attendance sessions and absence details.',
    descVi: 'Xem lịch sử buổi học đã điểm danh/đã hủy và chi tiết học sinh vắng.',
  },
  {
    id: ATTENDANCE_PERMISSION_IDS.report,
    tab: 'report',
    type: 'attendance',
    section: 'attendance',
    title: 'Attendance reports',
    titleVi: 'Báo cáo',
    desc: 'View and export attendance reports.',
    descVi: 'Xem và xuất báo cáo chuyên cần.',
  },
];

export const ATTENDANCE_PERMISSION_GROUP = {
  key: 'attendance',
  title: 'Attendance',
  titleVi: 'Điểm danh',
  ids: ATTENDANCE_PERMISSION_ITEMS.map((item) => item.id),
};

const PUBLIC_ROUTES = new Set(['home', 'resources', 'contact', 'login', 'register', 'setup']);
const RETIRED_ROUTES = new Set(['library', 'practice']);

const SECTION_BY_SLUG = new Map([
  ...APPS.map((item) => [item.slug, 'apps']),
  ...GAME_APPS.map((item) => [item.slug, 'games']),
  ...SPECIAL_TOOLS.map((item) => [item.slug, 'tools']),
]);

const TOOL_BY_SLUG = new Map([...APPS, ...GAME_APPS, ...SPECIAL_TOOLS].map((item) => [item.slug, item]));

export const CORE_PERMISSION_ITEMS = [
  HOMEROOM_PERMISSION_ITEM,
  {
    id: ROUTE_PERMISSION_IDS['resource-library'],
    type: 'content',
    section: 'content',
    title: 'Department Resource Library',
    titleVi: 'Kho học liệu Tổ Tiếng Anh',
    desc: 'Upload, review and search shared English teaching resources stored on the department leader’s Google Drive.',
    descVi: 'Tải lên, duyệt và tìm kiếm học liệu dùng chung lưu trên Google Drive của TTCM.',
  },
  {
    id: ROUTE_PERMISSION_IDS['knowledge-hub'],
    type: 'content',
    section: 'content',
    title: 'Smart Knowledge Library',
    titleVi: 'Kho học liệu thông minh',
    desc: 'Search, classify, favorite and organize approved resources.',
    descVi: 'Tìm kiếm, phân loại, yêu thích và tổ chức học liệu đã duyệt.',
  },
  {
    id: ROUTE_PERMISSION_IDS.dashboard,
    type: 'content',
    section: 'content',
    title: 'Work Dashboard',
    titleVi: 'Bảng điều hành',
    desc: 'View role-aware schedules, action items, approvals and department summaries.',
    descVi: 'Xem lịch, việc cần xử lý, phê duyệt và tổng hợp tổ chuyên môn theo vai trò.',
  },
  {
    id: ROUTE_PERMISSION_IDS['work-hub'],
    type: 'content',
    section: 'content',
    title: 'Unified Work Hub',
    titleVi: 'Trung tâm công việc',
    desc: 'Manage tasks, submissions, feedback and approvals.',
    descVi: 'Quản lí nhiệm vụ, sản phẩm nộp, phản hồi và phê duyệt.',
  },
  {
    id: ROUTE_PERMISSION_IDS['content-ecosystem'],
    type: 'content',
    section: 'content',
    title: 'Teaching Content Ecosystem',
    titleVi: 'Hệ sinh thái nội dung dạy học',
    desc: 'Manage reusable assets, structured canvases, production recipes and connected content kits.',
    descVi: 'Quản lí tài sản tái sử dụng, canvas theo khối, dây chuyền sản xuất và bộ nội dung liên thông.',
  },
  {
    id: ROUTE_PERMISSION_IDS['assessment-core'],
    type: 'content',
    section: 'content',
    title: 'Assessment Core',
    titleVi: 'Ngân hàng câu hỏi và đề thi',
    desc: 'Manage question banks, blueprints and test versions.',
    descVi: 'Quản lí ngân hàng câu hỏi, blueprint và mã đề.',
  },  {
    id: ROUTE_PERMISSION_IDS['platform-readiness'],
    type: 'system',
    section: 'content',
    title: 'Platform Readiness',
    titleVi: 'PWA, bảo mật và khả năng tiếp cận',
    desc: 'Install the PWA and review security, accessibility and performance readiness.',
    descVi: 'Cài PWA và kiểm tra trạng thái bảo mật, khả năng tiếp cận và hiệu năng.',
  },
  {
    id: ROUTE_PERMISSION_IDS['automation-center'],
    type: 'content',
    section: 'operations',
    title: 'Automation Center',
    titleVi: 'Trung tâm tự động hóa',
    desc: 'Create automation rules, approve actions and review operational audit logs.',
    descVi: 'Tạo quy tắc tự động hóa, phê duyệt hành động và xem nhật ký vận hành.',
  },
  {
    id: ROUTE_PERMISSION_IDS['cloud-operations'],
    type: 'system',
    section: 'operations',
    title: 'Cloud Operations',
    titleVi: 'Vận hành nền 24/7',
    desc: 'Monitor durable automation queues, server schedules, retries and operations digests.',
    descVi: 'Theo dõi hàng đợi tự động hóa, lịch máy chủ, retry và bản tin vận hành.',
  },
  {
    id: ROUTE_PERMISSION_IDS['collaboration-hub'],
    type: 'content',
    section: 'operations',
    title: 'Collaboration Hub',
    titleVi: 'Không gian cộng tác',
    desc: 'Coordinate projects, members, discussion threads, presence and content versions.',
    descVi: 'Điều phối dự án, thành viên, thảo luận, hiện diện và lịch sử phiên bản.',
  },
  {
    id: ROUTE_PERMISSION_IDS['data-governance'],
    type: 'system',
    section: 'operations',
    title: 'Data Governance',
    titleVi: 'Quản trị dữ liệu & tuân thủ',
    desc: 'Review audit events, permission overrides, backups, restores and deleted items.',
    descVi: 'Kiểm tra audit log, quyền ngoại lệ, sao lưu, khôi phục và dữ liệu đã xóa.',
  },
  {
    id: ROUTE_PERMISSION_IDS.qa,
    type: 'system',
    section: 'content',
    title: 'System Health Center',
    titleVi: 'Trung tâm trạng thái hệ thống',
    desc: 'Check connectivity, browser storage, Supabase, Newsroom and recent runtime errors.',
    descVi: 'Kiểm tra kết nối, bộ nhớ, Supabase, Newsroom và lỗi runtime gần đây.',
  },
  {
    id: ROUTE_PERMISSION_IDS.settings,
    type: 'system',
    section: 'content',
    title: 'System Settings',
    titleVi: 'Cài đặt hệ thống',
    desc: 'Configure account and application preferences.',
    descVi: 'Cấu hình tài khoản và tuỳ chọn giao diện.',
  },
];

function makeToolPermissionItem(item, section) {
  return {
    id: `tool:${item.slug}`,
    type: section === 'games' ? 'game' : 'tool',
    section,
    slug: item.slug,
    title: item.title,
    titleVi: item.titleVi || item.title,
    desc: item.desc,
    descVi: item.descVi || item.desc,
    group: item.group,
    groupVi: item.groupVi || item.group,
  };
}

export const TOOL_PERMISSION_ITEMS = [
  ...APPS.map((item) => makeToolPermissionItem(item, 'apps')),
  ...GAME_APPS.map((item) => makeToolPermissionItem(item, 'games')),
  ...SPECIAL_TOOLS.map((item) => makeToolPermissionItem(item, 'tools')),
];

export const PERMISSION_ITEMS = [...CORE_PERMISSION_ITEMS, ...ATTENDANCE_PERMISSION_ITEMS, ...TOOL_PERMISSION_ITEMS];
export const ALL_PERMISSION_IDS = PERMISSION_ITEMS.map((item) => item.id);
export const EXPLICIT_PERMISSION_IDS = [...ATTENDANCE_PERMISSION_GROUP.ids];
const EXPLICIT_PERMISSION_SET = new Set(EXPLICIT_PERMISSION_IDS);

export const PERMISSION_GROUPS = [
  {
    key: 'content',
    title: 'Content & system access',
    titleVi: 'Nội dung & hệ thống',
    ids: CORE_PERMISSION_ITEMS.map((item) => item.id),
  },
  {
    key: 'apps',
    title: 'App activities',
    titleVi: 'Hoạt động / ứng dụng',
    ids: TOOL_PERMISSION_ITEMS.filter((item) => item.section === 'apps').map((item) => item.id),
  },
  {
    key: 'games',
    title: 'Games & launchers',
    titleVi: 'Trò chơi / launcher',
    ids: TOOL_PERMISSION_ITEMS.filter((item) => item.section === 'games').map((item) => item.id),
  },
  {
    key: 'tools',
    title: 'Teaching tools',
    titleVi: 'Công cụ dạy học',
    ids: TOOL_PERMISSION_ITEMS.filter((item) => item.section === 'tools').map((item) => item.id),
  },
];

function expandLegacyAttendancePermissions(allowed = []) {
  const source = Array.isArray(allowed) ? allowed : [];
  if (!source.includes(ROUTE_PERMISSION_IDS.attendance)) return source;
  return [
    ...source.filter((id) => id !== ROUTE_PERMISSION_IDS.attendance),
    ...ATTENDANCE_PERMISSION_GROUP.ids,
  ];
}

function cleanPermissionIds(allowed = []) {
  return [...new Set(expandLegacyAttendancePermissions(allowed).filter((id) => ALL_PERMISSION_IDS.includes(id)))];
}

function cleanExplicitPermissionIds(allowed = []) {
  return [...new Set(expandLegacyAttendancePermissions(allowed).filter((id) => EXPLICIT_PERMISSION_SET.has(id)))];
}

export function createAllAccessPermissions(explicitAllowed = []) {
  return { mode: PERMISSION_MODE_ALL, allowed: cleanExplicitPermissionIds(explicitAllowed) };
}

export function createCustomPermissions(allowed = []) {
  return { mode: PERMISSION_MODE_CUSTOM, allowed: cleanPermissionIds(allowed) };
}

export function normalizePermissions(raw) {
  if (!raw || typeof raw !== 'object') return createAllAccessPermissions();
  const mode = raw.mode === PERMISSION_MODE_CUSTOM ? PERMISSION_MODE_CUSTOM : PERMISSION_MODE_ALL;
  const allowed = Array.isArray(raw.allowed) ? raw.allowed : [];
  if (mode === PERMISSION_MODE_ALL) return createAllAccessPermissions(allowed);
  return createCustomPermissions(allowed);
}

export function getAllowedIdsFromPermissions(raw) {
  const permissions = normalizePermissions(raw);
  if (permissions.mode !== PERMISSION_MODE_ALL) return permissions.allowed;
  const normalIds = ALL_PERMISSION_IDS.filter((id) => !EXPLICIT_PERMISSION_SET.has(id));
  return [...normalIds, ...permissions.allowed];
}

export function getPermissionItem(id) {
  const item = PERMISSION_ITEMS.find((entry) => entry.id === id);
  if (item) return item;
  if (id === ROUTE_PERMISSION_IDS.attendance) {
    return {
      id,
      type: 'attendance',
      section: 'attendance',
      title: 'Attendance (legacy)',
      titleVi: 'Điểm danh (quyền cũ)',
      desc: 'Legacy attendance grant; migrated to all five attendance tabs.',
      descVi: 'Quyền Điểm danh cũ; hệ thống tự chuyển thành đủ 5 quyền thẻ Điểm danh.',
    };
  }
  return null;
}

export function getToolPermissionId(slug) {
  return `tool:${slug}`;
}

export function getToolSection(slug) {
  return SECTION_BY_SLUG.get(slug) || '';
}

export function hasExplicitPermissionId(user, permissionId) {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  const permissions = normalizePermissions(user.permissions);
  return Array.isArray(permissions.allowed) && permissions.allowed.includes(permissionId);
}

export function hasAttendanceTabAccess(user, tab) {
  const permissionId = ATTENDANCE_PERMISSION_IDS[tab];
  return Boolean(permissionId && hasExplicitPermissionId(user, permissionId));
}

export function hasAnyAttendanceAccess(user) {
  return ATTENDANCE_PERMISSION_ITEMS.some((item) => hasAttendanceTabAccess(user, item.tab));
}

export function getFirstAllowedAttendanceTab(user) {
  return ATTENDANCE_PERMISSION_ITEMS.find((item) => hasAttendanceTabAccess(user, item.tab))?.tab || '';
}

export function hasPermissionId(user, permissionId) {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  if (permissionId === ROUTE_PERMISSION_IDS.attendance) return hasAnyAttendanceAccess(user);
  const permissions = normalizePermissions(user.permissions);
  if (EXPLICIT_PERMISSION_SET.has(permissionId)) return permissions.allowed.includes(permissionId);
  if (permissions.mode === PERMISSION_MODE_ALL) return true;
  return permissions.allowed.includes(permissionId);
}

export function hasToolAccess(user, slug) {
  if (!slug) return false;
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  const tool = TOOL_BY_SLUG.get(slug);
  if (!tool) return false;
  return hasPermissionId(user, getToolPermissionId(slug));
}

export function filterToolsForUser(user, tools = []) {
  if (!user) return [];
  if (isAdminRole(user.role)) return tools;
  return tools.filter((item) => hasToolAccess(user, item.slug));
}

export function hasAnyToolInSection(user, section) {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  return TOOL_PERMISSION_ITEMS.some((item) => item.section === section && hasPermissionId(user, item.id));
}

export function getRoutePermissionId(route) {
  if (RETIRED_ROUTES.has(route)) return '';
  if (route === 'news') return getToolPermissionId('news-reader');
  if (route === 'homeroom') return HOMEROOM_PERMISSION_ID;
  if (route === 'attendance') return ATTENDANCE_PERMISSION_IDS.quick;
  if (route === 'dashboard' || route === 'resource-library' || route === 'knowledge-hub' || route === 'work-hub' || route === 'assessment-core' || route === 'platform-readiness' || route === 'automation-center' || route === 'cloud-operations' || route === 'collaboration-hub' || route === 'data-governance' || route === 'app-vault' || route === 'qa' || route === 'attendance' || route === 'settings') return ROUTE_PERMISSION_IDS[route];
  if (route === 'games') return getToolPermissionId('game-hub');
  return '';
}

export function hasRouteAccess(user, route, selectedTool = null) {
  if (RETIRED_ROUTES.has(route)) return false;
  if (PUBLIC_ROUTES.has(route)) return true;
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  if (route === 'admin' || route === 'app-vault') return false;
  if (route === 'production-hardening') return isDepartmentLeaderRole(user.role);
  if (route === 'trash') return Boolean(user);
  if (route === 'tool') return hasToolAccess(user, selectedTool?.slug);
  if (route === 'news') return Boolean(user);
  if (route === 'dashboard') return Boolean(user);
  if (route === 'homeroom') return hasPermissionId(user, HOMEROOM_PERMISSION_ID);
  if (route === 'attendance') return hasAnyAttendanceAccess(user);
  if (route === 'apps' || route === 'games' || route === 'tools') return true;
  if (route === 'resource-library' || route === 'knowledge-hub' || route === 'work-hub' || route === 'assessment-core' || route === 'platform-readiness' || route === 'automation-center' || route === 'cloud-operations' || route === 'collaboration-hub' || route === 'data-governance' || route === 'qa' || route === 'attendance' || route === 'settings') return hasPermissionId(user, ROUTE_PERMISSION_IDS[route]);
  return false;
}

export function getFirstAllowedRoute(user) {
  if (!user) return 'login';
  return 'dashboard';
}

export function summarizePermissions(user, language = 'vi') {
  if (!user) return '';
  if (isAdminRole(user.role)) return language === 'vi' ? 'Toàn quyền quản trị' : 'Full admin access';
  const permissions = normalizePermissions(user.permissions);
  if (permissions.mode === PERMISSION_MODE_ALL) {
    const attendanceCount = ATTENDANCE_PERMISSION_GROUP.ids.filter((id) => permissions.allowed.includes(id)).length;
    if (!attendanceCount) return language === 'vi' ? 'Toàn quyền giáo viên · chưa cấp Điểm danh' : 'Full teacher access · no Attendance grant';
    return language === 'vi'
      ? `Toàn quyền giáo viên · ${attendanceCount}/${ATTENDANCE_PERMISSION_GROUP.ids.length} quyền Điểm danh`
      : `Full teacher access · ${attendanceCount}/${ATTENDANCE_PERMISSION_GROUP.ids.length} Attendance permissions`;
  }
  const count = permissions.allowed.length;
  return language === 'vi' ? `${count}/${ALL_PERMISSION_IDS.length} quyền được cấp` : `${count}/${ALL_PERMISSION_IDS.length} permissions granted`;
}

// Compatibility helper for shared publishing features. It no longer grants access
// to a Department workspace; it only checks the retained leader/admin role.
export function canPublishDepartment(user) {
  return Boolean(user && (isAdminRole(user.role) || isDepartmentLeaderRole(user.role)));
}