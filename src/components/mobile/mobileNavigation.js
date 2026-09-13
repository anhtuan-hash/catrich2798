import { launchRoute } from '../../utils/navigation.js';

const COPY = {
  vi: {
    home: 'Trang chủ', apps: 'Ứng dụng', practice: 'Bài tập', attendance: 'Điểm danh', notifications: 'Thông báo', account: 'Tài khoản',
    resources: 'Tài nguyên', search: 'Tìm kiếm', contact: 'Liên hệ', login: 'Đăng nhập',
  },
  en: {
    home: 'Home', apps: 'Apps', practice: 'Practice', attendance: 'Attendance', notifications: 'Notifications', account: 'Account',
    resources: 'Resources', search: 'Search', contact: 'Contact', login: 'Sign in',
  },
};

const MORE_GROUPS = [
  { id: 'teaching', vi: 'Dạy & học', en: 'Teaching & learning', routes: ['apps', 'games', 'tools', 'resources', 'resource-library', 'knowledge-hub'] },
  { id: 'classes', vi: 'Lớp học', en: 'Classes', routes: ['homeroom'] },
  { id: 'work', vi: 'Công việc & báo cáo', en: 'Work & reports', routes: ['dashboard', 'work-hub', 'assessment-core'] },
  { id: 'operations', vi: 'Vận hành', en: 'Operations', routes: ['platform-readiness', 'automation-center', 'cloud-operations', 'collaboration-hub', 'data-governance', 'production-hardening', 'qa'] },
  { id: 'admin', vi: 'Quản trị & hệ thống', en: 'Administration & system', routes: ['app-vault', 'settings', 'trash', 'admin'] },
];

const ROUTE_LABELS = {
  home: ['Trang chủ', 'Home'], apps: ['Ứng dụng', 'Apps'], games: ['Trò chơi', 'Games'], tools: ['Công cụ', 'Tools'], resources: ['Tài nguyên', 'Resources'],
  'resource-library': ['Kho học liệu', 'Resource Library'], 'knowledge-hub': ['Kho học liệu thông minh', 'Smart Knowledge'],
  homeroom: ['Giáo viên chủ nhiệm', 'Homeroom'], dashboard: ['Bảng điều hành', 'Dashboard'], 'work-hub': ['Trung tâm công việc', 'Work Hub'],
  'assessment-core': ['Ngân hàng câu hỏi', 'Assessment Core'], 'platform-readiness': ['Sẵn sàng nền tảng', 'Platform Readiness'],
  'automation-center': ['Tự động hóa', 'Automation Center'], 'cloud-operations': ['Vận hành nền', 'Cloud Operations'],
  'collaboration-hub': ['Cộng tác', 'Collaboration Hub'], 'data-governance': ['Quản trị dữ liệu', 'Data Governance'],
  'production-hardening': ['Sẵn sàng Production', 'Production Hardening'], qa: ['Trạng thái hệ thống', 'System Health'],
  'app-vault': ['Ứng dụng đã ẩn', 'Hidden Apps'], settings: ['Cài đặt', 'Settings'], trash: ['Thùng rác', 'Trash'], admin: ['Quản trị', 'Admin'],
};

function item(id, label, options = {}) {
  return { id, label, ...options };
}

export function buildMobileNavigationModel({ authenticated, currentRoute = 'home', language = 'vi', canAccessRoute = () => false, canAccessAttendance = false } = {}) {
  const t = COPY[language] || COPY.vi;
  const routeItem = (id, route, label = t[id] || id) => item(id, label, { route, action: 'route', active: currentRoute === route });

  const bottomItems = authenticated
    ? [
        routeItem('home', 'home'),
        routeItem('apps', 'apps'),
        canAccessAttendance
          ? item('attendance', t.attendance, { action: 'attendance', active: false })
          : item('practice', t.practice, { action: 'practice', active: false }),
        item('notifications', t.notifications, { action: 'notifications', active: false }),
        routeItem('account', 'settings'),
      ]
    : [
        routeItem('home', 'home'),
        routeItem('resources', 'resources'),
        item('search', t.search, { action: 'search', active: false }),
        routeItem('contact', 'contact'),
        routeItem('login', 'login'),
      ];

  const moreGroups = authenticated
    ? MORE_GROUPS.map((group) => ({
        id: group.id,
        label: language === 'vi' ? group.vi : group.en,
        items: group.routes
          .filter((route) => canAccessRoute(route))
          .map((route) => ({
            id: `route:${route}`,
            route,
            action: 'route',
            label: ROUTE_LABELS[route]?.[language === 'vi' ? 0 : 1] || route,
            active: currentRoute === route,
          })),
      })).filter((group) => group.items.length)
    : [];

  return { bottomItems, moreGroups };
}

function openWeeklyPractice() {
  const scrollToPractice = (attempt = 0) => {
    const target = document.getElementById('bes-weekly-practice-root');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (attempt < 20) window.setTimeout(() => scrollToPractice(attempt + 1), 80);
  };

  if (window.location.hash !== '#/home') {
    launchRoute({ target: '#/home', label: 'WP' });
    window.setTimeout(() => scrollToPractice(), 140);
    return;
  }
  scrollToPractice();
}

export function runMobileNavigationItem(itemValue) {
  const selected = itemValue || {};
  if (selected.action === 'search') {
    window.dispatchEvent(new CustomEvent('bes-command-palette-open'));
    return;
  }
  if (selected.action === 'practice') {
    openWeeklyPractice();
    return;
  }
  if (selected.action === 'attendance') {
    window.dispatchEvent(new CustomEvent('bes-attendance-open'));
    return;
  }
  if (selected.action === 'notifications') {
    window.dispatchEvent(new CustomEvent('bes-mobile-notifications-open'));
    return;
  }
  if (selected.route) {
    launchRoute({ target: `#/${selected.route}`, label: selected.label || selected.route });
  }
}