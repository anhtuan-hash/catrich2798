import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../data/apps.js';
import { HOMEROOM_PERMISSION_ID, HOMEROOM_PERMISSION_ITEM } from '../data/homeroom.js';
import { DEPARTMENT_MODULES, DEPARTMENT_PERMISSION_ITEMS, DEPARTMENT_PUBLISH_PERMISSION_ID, DEPARTMENT_WORKSPACE_PERMISSION_ID, DEPARTMENT_WORKSPACE_SLUG } from '../data/department.js';

export const PERMISSION_MODE_ALL = 'all';
export const PERMISSION_MODE_CUSTOM = 'custom';

export const ROUTE_PERMISSION_IDS = {
  apps: 'section:apps',
  news: 'tool:news-reader',
  games: 'section:games',
  tools: 'section:tools',
  library: 'route:library',
  'resource-library': 'route:resource-library',
  practice: 'route:practice',
  qa: 'route:qa',
  settings: 'route:settings',
  department: DEPARTMENT_WORKSPACE_PERMISSION_ID,
  homeroom: HOMEROOM_PERMISSION_ID,
};

const PUBLIC_ROUTES = new Set(['home', 'resources', 'contact', 'login', 'register', 'setup']);

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
    id: ROUTE_PERMISSION_IDS.library,
    type: 'content',
    section: 'content',
    title: 'Library',
    titleVi: 'Thư viện nội dung',
    desc: 'View and manage saved outputs, prompts, activities and local teaching content.',
    descVi: 'Xem và quản lí output, prompt, hoạt động và nội dung dạy học đã lưu.',
  },
  {
    id: ROUTE_PERMISSION_IDS.practice,
    type: 'content',
    section: 'content',
    title: 'Learner Practice',
    titleVi: 'Bài luyện tập học sinh',
    desc: 'Open the scored student practice module.',
    descVi: 'Mở module bài luyện tập có chấm điểm cho học sinh.',
  },
  {
    id: ROUTE_PERMISSION_IDS.qa,
    type: 'system',
    section: 'content',
    title: 'QA Health Check',
    titleVi: 'Kiểm tra chất lượng',
    desc: 'Run local quality checks for generated items and activities.',
    descVi: 'Kiểm tra chất lượng câu hỏi, hoạt động và nội dung đã tạo.',
  },
  {
    id: ROUTE_PERMISSION_IDS.settings,
    type: 'system',
    section: 'content',
    title: 'AI Settings',
    titleVi: 'Cài đặt AI',
    desc: 'Configure personal AI provider keys and app preferences.',
    descVi: 'Cấu hình khóa AI cá nhân và tuỳ chọn giao diện.',
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

export const PERMISSION_ITEMS = [...CORE_PERMISSION_ITEMS, ...TOOL_PERMISSION_ITEMS, ...DEPARTMENT_PERMISSION_ITEMS];
export const ALL_PERMISSION_IDS = PERMISSION_ITEMS.map((item) => item.id);

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
  {
    key: 'department',
    title: 'English department workspace',
    titleVi: 'Tổ chuyên môn',
    ids: DEPARTMENT_PERMISSION_ITEMS.map((item) => item.id),
  },
];

export function createAllAccessPermissions() {
  return { mode: PERMISSION_MODE_ALL, allowed: [] };
}

export function createCustomPermissions(allowed = []) {
  const clean = [...new Set((allowed || []).filter((id) => ALL_PERMISSION_IDS.includes(id)))];
  return { mode: PERMISSION_MODE_CUSTOM, allowed: clean };
}

export function normalizePermissions(raw) {
  if (!raw || typeof raw !== 'object') return createAllAccessPermissions();
  const mode = raw.mode === PERMISSION_MODE_CUSTOM ? PERMISSION_MODE_CUSTOM : PERMISSION_MODE_ALL;
  if (mode === PERMISSION_MODE_ALL) return createAllAccessPermissions();
  return createCustomPermissions(Array.isArray(raw.allowed) ? raw.allowed : []);
}

export function getAllowedIdsFromPermissions(raw) {
  const permissions = normalizePermissions(raw);
  return permissions.mode === PERMISSION_MODE_ALL ? ALL_PERMISSION_IDS : permissions.allowed;
}

export function getPermissionItem(id) {
  return PERMISSION_ITEMS.find((item) => item.id === id) || null;
}

export function getToolPermissionId(slug) {
  return `tool:${slug}`;
}

export function getToolSection(slug) {
  return SECTION_BY_SLUG.get(slug) || '';
}


export function hasExplicitPermissionId(user, permissionId) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const permissions = normalizePermissions(user.permissions);
  return Array.isArray(permissions.allowed) && permissions.allowed.includes(permissionId);
}

export function canPublishDepartment(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase().trim();
  if (role === 'admin') return true;

  // A real TTCM/department-leader account may be stored as a specific role.
  // This is intentionally separate from normal "teacher" so teachers with broad
  // app access still cannot see or use leader operation tools.
  const leaderRoles = new Set(['ttcm', 'to_truong', 'tổ trưởng', 'department_leader', 'department leader', 'subject_leader', 'subject leader', 'leader']);
  if (leaderRoles.has(role)) return true;

  // HARD GUARD: normal teacher accounts must never unlock TTCM operation tools,
  // even when they have broad tool access or an old publish permission in local/cloud data.
  // A department leader should be represented explicitly, not as a regular teacher.
  const leaderMarkers = [
    user.departmentRole,
    user.department_role,
    user.position,
    user.title,
    user.jobTitle,
    user.job_title,
  ].map((value) => String(value || '').toLowerCase());

  const isDepartmentLeader = leaderMarkers.some((value) => (
    value.includes('ttcm')
    || value.includes('tổ trưởng')
    || value.includes('to truong')
    || value.includes('department leader')
    || value.includes('department head')
    || value.includes('subject leader')
  ));

  if (!isDepartmentLeader) return false;

  // Only explicit department leaders may use the publish/assign/review permission.
  return hasExplicitPermissionId(user, DEPARTMENT_PUBLISH_PERMISSION_ID);
}

export function hasPermissionId(user, permissionId) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const permissions = normalizePermissions(user.permissions);
  if (permissions.mode === PERMISSION_MODE_ALL) return true;
  return permissions.allowed.includes(permissionId);
}

export function hasToolAccess(user, slug) {
  if (!slug) return false;
  if (!user) return false;
  if (user.role === 'admin') return true;
  const tool = TOOL_BY_SLUG.get(slug);
  if (!tool) return false;
  return hasPermissionId(user, getToolPermissionId(slug));
}

export function filterToolsForUser(user, tools = []) {
  if (!user) return [];
  if (user.role === 'admin') return tools;
  return tools.filter((item) => hasToolAccess(user, item.slug));
}

export function hasAnyToolInSection(user, section) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return TOOL_PERMISSION_ITEMS.some((item) => item.section === section && hasPermissionId(user, item.id));
}

export function hasDepartmentModuleAccess(user, moduleId) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (hasToolAccess(user, DEPARTMENT_WORKSPACE_SLUG)) return true;
  return hasPermissionId(user, moduleId);
}

export function hasAnyDepartmentAccess(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return hasToolAccess(user, DEPARTMENT_WORKSPACE_SLUG) || DEPARTMENT_MODULES.some((module) => hasPermissionId(user, module.id));
}

export function getRoutePermissionId(route) {
  if (route === 'news') return getToolPermissionId('news-reader');
  if (route === 'practice') return ROUTE_PERMISSION_IDS.practice;
  if (route === 'department') return DEPARTMENT_WORKSPACE_PERMISSION_ID;
  if (route === 'homeroom') return HOMEROOM_PERMISSION_ID;
  if (route === 'library' || route === 'resource-library' || route === 'qa' || route === 'settings') return ROUTE_PERMISSION_IDS[route];
  if (route === 'games') return getToolPermissionId('game-hub');
  return '';
}

export function hasRouteAccess(user, route, selectedTool = null) {
  if (PUBLIC_ROUTES.has(route)) return true;
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (route === 'admin') return false;
  if (route === 'tool') return hasToolAccess(user, selectedTool?.slug);
  if (route === 'news') return hasToolAccess(user, 'news-reader');
  if (route === 'department') return hasAnyDepartmentAccess(user);
  if (route === 'homeroom') return hasPermissionId(user, HOMEROOM_PERMISSION_ID);
  // Teachers can open these dashboards even when some cards are locked.
  // Locked cards stay visible and show a request-access button.
  if (route === 'apps' || route === 'games' || route === 'tools') return true;
  if (route === 'practice') return hasPermissionId(user, ROUTE_PERMISSION_IDS.practice) || hasToolAccess(user, 'student-practice');
  if (route === 'library' || route === 'resource-library' || route === 'qa' || route === 'settings') return hasPermissionId(user, ROUTE_PERMISSION_IDS[route]);
  return false;
}

export function getFirstAllowedRoute(user) {
  if (!user) return 'login';
  if (user.role === 'admin') return 'admin';
  return 'apps';
}

export function summarizePermissions(user, language = 'vi') {
  if (!user) return '';
  if (user.role === 'admin') return language === 'vi' ? 'Toàn quyền quản trị' : 'Full admin access';
  const permissions = normalizePermissions(user.permissions);
  if (permissions.mode === PERMISSION_MODE_ALL) return language === 'vi' ? 'Toàn quyền giáo viên' : 'Full teacher access';
  const count = permissions.allowed.length;
  return language === 'vi' ? `${count}/${ALL_PERMISSION_IDS.length} quyền được cấp` : `${count}/${ALL_PERMISSION_IDS.length} permissions granted`;
}
