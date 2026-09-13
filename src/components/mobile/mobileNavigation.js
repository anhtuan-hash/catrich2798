import { launchRoute } from '../../utils/navigation.js';

const COPY = {
  vi: {
    home: 'Trang chủ', apps: 'Ứng dụng', admin: 'Quản trị', practice: 'Bài tập', attendance: 'Điểm danh', notifications: 'Thông báo', account: 'Tài khoản',
    resources: 'Tài nguyên', search: 'Tìm kiếm', contact: 'Liên hệ', login: 'Đăng nhập',
  },
  en: {
    home: 'Home', apps: 'Apps', admin: 'Admin', practice: 'Practice', attendance: 'Attendance', notifications: 'Notifications', account: 'Account',
    resources: 'Resources', search: 'Search', contact: 'Contact', login: 'Sign in',
  },
};

function item(id, label, options = {}) {
  return { id, label, ...options };
}

export function buildMobileNavigationModel({
  authenticated,
  currentRoute = 'home',
  language = 'vi',
  canAccessRoute = () => false,
  canAccessAttendance = false,
  isAdminNavigation = false,
} = {}) {
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

  // The mobile drawer must mirror the original GlobalCompactNavigation primary
  // row. Dynamic tabs such as Dashboard, Homeroom, Gradebook, Reports, TTCM and
  // Attendance are supplied at runtime by the existing original navigation
  // bridge host, so they are intentionally not duplicated here.
  const drawerBaseItems = [routeItem('home', 'home')];
  if (authenticated && (isAdminNavigation || canAccessRoute('apps'))) {
    drawerBaseItems.push(routeItem('apps', 'apps'));
  }
  if (authenticated && isAdminNavigation) {
    drawerBaseItems.push(routeItem('admin', 'admin'));
  }

  return { bottomItems, drawerBaseItems };
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
