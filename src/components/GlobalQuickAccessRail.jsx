import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AppWindow,
  Bell,
  BookOpenCheck,
  Boxes,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Command,
  ClipboardCheck,
  FileText,
  Gauge,
  GripVertical,
  EyeOff,
  LayoutGrid,
  MoreHorizontal,
  Search,
  Pin,
  PinOff,
  Plus,
  Settings,
  ShieldCheck,
  Star,
  UsersRound,
  Zap,
  X,
} from 'lucide-react';
import { APPS } from '../data/apps.js';
import { visibilityIdForRoute } from '../data/appVisibilityRegistry.js';
import { isAppHiddenForUser } from '../utils/appVisibility.js';
import { hasRouteAccess, hasToolAccess } from '../utils/permissions.js';
import { isAdminRole, isDepartmentLeaderRole } from '../utils/roles.js';
import { launchRoute } from '../utils/navigation.js';
import {
  QUICK_ACCESS_MAX_ITEMS,
  QUICK_ACCESS_RECENT_MAX,
  QUICK_ACCESS_WORKSPACES,
  QUICK_ACCESS_SIZES,
  QUICK_ACCESS_MOTIONS,
  QUICK_ACCESS_DENSITIES,
  QUICK_ACCESS_SIDES,
  QUICK_ACCESS_WORKFLOW_MAX,
  QUICK_ACCESS_WORKFLOW_STEPS_MAX,
  createDefaultQuickAccessConfig,
  loadQuickAccessConfig,
  loadQuickAccessConfigFromCloud,
  saveQuickAccessConfigToCloud,
  subscribeQuickAccessConfig,
} from '../utils/quickAccessPreferences.js';
import './GlobalQuickAccessRail.css';

const STATIC_ITEMS = [
  {
    id: 'route:dashboard',
    label: 'Dashboard',
    labelVi: 'Dashboard',
    target: '#/dashboard',
    route: 'dashboard',
    icon: Gauge,
    accent: '#1a73e8',
  },
  {
    id: 'route:apps',
    label: 'Applications',
    labelVi: 'Ứng dụng',
    target: '#/apps',
    route: 'apps',
    icon: LayoutGrid,
    accent: '#16a765',
  },
  {
    id: 'route:homeroom',
    label: 'Homeroom',
    labelVi: 'Chủ nhiệm',
    target: '#/homeroom',
    route: 'homeroom',
    icon: UsersRound,
    accent: '#d14f92',
  },
  {
    id: 'tool:gradebook-studio',
    label: 'Gradebook',
    labelVi: 'Sổ điểm',
    target: '#/tool/gradebook-studio',
    tool: 'gradebook-studio',
    icon: BookOpenCheck,
    accent: '#d06d4e',
  },
  {
    id: 'action:reports',
    label: 'Reports',
    labelVi: 'Báo cáo',
    target: '#/tool/brian-team',
    tool: 'brian-team',
    icon: FileText,
    accent: '#d99611',
    access: 'reports',
  },
  {
    id: 'action:ttcm',
    label: 'Department workspace',
    labelVi: 'TTCM',
    action: 'ttcm',
    icon: ShieldCheck,
    accent: '#6f50d9',
    access: 'department',
  },
  {
    id: 'action:attendance',
    label: 'Attendance',
    labelVi: 'Điểm danh',
    action: 'attendance',
    icon: ClipboardCheck,
    accent: '#168db1',
    access: 'authenticated',
  },
  {
    id: 'action:schedule',
    label: 'Work schedule',
    labelVi: 'Kế hoạch',
    action: 'schedule',
    icon: CalendarDays,
    accent: '#e68a00',
    access: 'department',
  },
  {
    id: 'route:assessment-core',
    label: 'Question Bank',
    labelVi: 'Ngân hàng câu hỏi',
    target: '#/assessment-core',
    route: 'assessment-core',
    icon: Star,
    accent: '#6647df',
  },
  {
    id: 'route:resource-library',
    label: 'Documents',
    labelVi: 'Tài liệu',
    target: '#/resource-library',
    route: 'resource-library',
    icon: AppWindow,
    accent: '#e67a42',
  },
];

function labelFor(item, language) {
  return language === 'vi' ? (item.labelVi || item.label) : (item.label || item.labelVi);
}

function descriptionFor(item, language) {
  if (!item) return '';
  if (language === 'vi') {
    return item.descriptionVi
      || item.app?.descriptionVi
      || item.app?.description
      || 'Mở nhanh ứng dụng hoặc tính năng này.';
  }
  return item.description
    || item.app?.description
    || item.app?.descriptionVi
    || 'Open this app or feature quickly.';
}

function contextIdsFor(currentRoute, selectedTool) {
  if (currentRoute === 'homeroom') return ['action:attendance', 'tool:gradebook-studio', 'route:resource-library'];
  if (currentRoute === 'assessment-core') return ['route:resource-library', 'route:apps', 'route:dashboard'];
  if (currentRoute === 'resource-library') return ['route:assessment-core', 'route:apps', 'route:dashboard'];
  if (currentRoute === 'tool' && selectedTool?.slug === 'brian-team') return ['action:ttcm', 'action:schedule', 'route:resource-library'];
  if (currentRoute === 'tool' && selectedTool?.slug === 'gradebook-studio') return ['route:homeroom', 'action:attendance', 'route:dashboard'];
  if (currentRoute === 'apps') return ['route:dashboard', 'route:assessment-core', 'route:resource-library'];
  return ['route:apps', 'route:homeroom', 'action:attendance'];
}

function contextCopyFor(currentRoute, selectedTool, language) {
  const vi = language === 'vi';
  if (currentRoute === 'homeroom') {
    return {
      kicker: vi ? 'CHỦ NHIỆM' : 'HOMEROOM',
      title: vi ? 'Không gian lớp chủ nhiệm' : 'Homeroom workspace',
      description: vi ? 'Điểm danh, sổ điểm và tài liệu lớp luôn ở ngay bên cạnh.' : 'Attendance, gradebook and class resources stay one step away.',
    };
  }
  if (currentRoute === 'assessment-core') {
    return {
      kicker: vi ? 'NGÂN HÀNG CÂU HỎI' : 'QUESTION BANK',
      title: vi ? 'Không gian ra đề' : 'Assessment workspace',
      description: vi ? 'Tập trung tài liệu, ứng dụng và lối tắt phục vụ tạo đề.' : 'Keep authoring resources and related apps close at hand.',
    };
  }
  if (currentRoute === 'resource-library') {
    return {
      kicker: vi ? 'TÀI LIỆU' : 'RESOURCES',
      title: vi ? 'Không gian học liệu' : 'Resource workspace',
      description: vi ? 'Đi nhanh giữa học liệu, ngân hàng câu hỏi và ứng dụng.' : 'Move quickly between resources, question bank and apps.',
    };
  }
  if (currentRoute === 'tool' && selectedTool?.slug === 'brian-team') {
    return {
      kicker: vi ? 'BÁO CÁO · TTCM' : 'REPORTS · DEPARTMENT',
      title: vi ? 'Không gian điều hành tổ' : 'Department workspace',
      description: vi ? 'Kế hoạch, kênh TTCM và tài liệu quản lí theo đúng ngữ cảnh.' : 'Schedule, department feed and management resources in context.',
    };
  }
  if (currentRoute === 'tool' && selectedTool?.slug === 'gradebook-studio') {
    return {
      kicker: vi ? 'SỔ ĐIỂM' : 'GRADEBOOK',
      title: vi ? 'Không gian theo dõi học tập' : 'Learning progress workspace',
      description: vi ? 'Chuyển nhanh tới chủ nhiệm, điểm danh và dashboard.' : 'Jump to homeroom, attendance and dashboard without losing flow.',
    };
  }
  if (currentRoute === 'apps') {
    return {
      kicker: vi ? 'ỨNG DỤNG' : 'APPS',
      title: vi ? 'Trung tâm ứng dụng Brian' : 'Brian app center',
      description: vi ? 'Các lối tắt được ưu tiên theo ứng dụng bạn đang cần.' : 'Shortcuts are prioritized around the apps you need now.',
    };
  }
  return {
    kicker: vi ? 'BỐI CẢNH HIỆN TẠI' : 'CURRENT CONTEXT',
    title: vi ? 'Không gian làm việc Brian' : 'Brian workspace',
    description: vi ? 'Thanh bên tự thay đổi theo trang đang mở mà không làm dịch nội dung.' : 'The sidebar adapts to the current page without shifting content.',
  };
}

function workspaceAllowsItem(workspace, item) {
  if (!item || workspace === 'all') return Boolean(item);
  const id = String(item.id || '');
  if (workspace === 'teaching') {
    return ['route:assessment-core', 'route:resource-library', 'tool:gradebook-studio', 'route:apps', 'route:dashboard'].includes(id)
      || id.startsWith('tool:');
  }
  if (workspace === 'homeroom') {
    return ['route:homeroom', 'action:attendance', 'tool:gradebook-studio', 'route:resource-library', 'route:dashboard'].includes(id);
  }
  if (workspace === 'department') {
    return ['action:ttcm', 'action:schedule', 'action:reports', 'route:resource-library', 'route:dashboard'].includes(id);
  }
  return true;
}

function quickCreateDescriptors(language) {
  const vi = language === 'vi';
  return [
    {
      id: 'create-exam',
      label: vi ? 'Tạo đề mới' : 'Create exam',
      description: vi ? 'Mở ngân hàng câu hỏi và bắt đầu đề mới.' : 'Open Question Bank and start a new exam.',
      itemId: 'route:assessment-core',
      event: 'bes-assessment-quick-create',
      detail: { type: 'exam' },
      keywords: 'tạo đề new exam assessment đề thi',
    },
    {
      id: 'add-question',
      label: vi ? 'Thêm câu hỏi' : 'Add question',
      description: vi ? 'Đi thẳng tới quy trình thêm câu hỏi.' : 'Jump into the question-authoring flow.',
      itemId: 'route:assessment-core',
      event: 'bes-assessment-quick-create',
      detail: { type: 'question' },
      keywords: 'thêm câu hỏi question bank add question',
    },
    {
      id: 'create-report',
      label: vi ? 'Tạo báo cáo' : 'Create report',
      description: vi ? 'Mở khu vực báo cáo Brian Team.' : 'Open the Brian Team reporting area.',
      itemId: 'action:reports',
      keywords: 'báo cáo report thống kê',
    },
    {
      id: 'attendance-now',
      label: vi ? 'Điểm danh ngay' : 'Take attendance',
      description: vi ? 'Mở nhanh công cụ điểm danh.' : 'Open attendance immediately.',
      itemId: 'action:attendance',
      keywords: 'điểm danh attendance lớp class',
    },
    {
      id: 'work-schedule',
      label: vi ? 'Mở lịch làm việc' : 'Open work schedule',
      description: vi ? 'Mở kế hoạch làm việc TTCM.' : 'Open the department work schedule.',
      itemId: 'action:schedule',
      keywords: 'lịch kế hoạch schedule work plan ttcm',
    },
  ];
}

function quickActionDescriptors(item, language) {
  const vi = language === 'vi';
  if (!item) return [];
  if (item.id === 'action:ttcm') {
    return [
      { id: 'ttcm-feed', label: vi ? 'Mở kênh TTCM' : 'Open TTCM feed', action: 'ttcm-feed' },
      { id: 'ttcm-schedule', label: vi ? 'Mở kế hoạch' : 'Open schedule', action: 'ttcm-schedule' },
      { id: 'ttcm-personnel', label: vi ? 'Nhân sự tổ' : 'Department people', action: 'ttcm-personnel' },
    ];
  }
  if (item.id === 'action:schedule') {
    return [
      { id: 'ttcm-schedule', label: vi ? 'Mở lịch làm việc' : 'Open work schedule', action: 'ttcm-schedule' },
      { id: 'ttcm-feed', label: vi ? 'Kênh TTCM' : 'TTCM feed', action: 'ttcm-feed' },
    ];
  }
  if (item.id === 'action:attendance') {
    return [{ id: 'attendance', label: vi ? 'Điểm danh ngay' : 'Open attendance', action: 'attendance' }];
  }
  return [{ id: 'open', label: vi ? 'Mở ứng dụng' : 'Open app', action: 'open' }];
}

function readBadgeSnapshot() {
  if (typeof document === 'undefined') return {};
  const next = {};
  const ttcmBadge = document.querySelector('.brian-nav__ttcm-badge');
  if (ttcmBadge) next['action:ttcm'] = String(ttcmBadge.textContent || '').trim();
  const reportCountdown = document.querySelector('.brian-nav__reports-countdown');
  if (reportCountdown) next['action:reports'] = 'dot';
  return next;
}

function dynamicAppItem(app) {
  const route = String(app?.route || '').trim();
  const slug = String(app?.slug || '').trim();
  if (!route && !slug) return null;
  return {
    id: route ? `route:${route}` : `tool:${slug}`,
    label: app.title || app.titleVi || slug || route,
    labelVi: app.titleVi || app.title || slug || route,
    target: route ? `#/${route}` : `#/tool/${slug}`,
    route: route || '',
    tool: route ? '' : slug,
    app,
    icon: Boxes,
    accent: app.tone === 'mint' ? '#188b68' : app.tone === 'orange' ? '#d97706' : app.tone === 'red' ? '#cf4563' : '#315fc4',
  };
}

function itemAllowed(item, currentUser, appVisibility) {
  if (!currentUser || !item) return false;
  if (item.access === 'authenticated') return true;
  if (item.access === 'department') return isAdminRole(currentUser.role) || isDepartmentLeaderRole(currentUser.role);
  if (item.access === 'reports') {
    return isAdminRole(currentUser.role)
      || isDepartmentLeaderRole(currentUser.role)
      || hasToolAccess(currentUser, 'brian-team');
  }

  if (item.route && !hasRouteAccess(currentUser, item.route, item.app || null)) return false;
  if (item.tool && !hasToolAccess(currentUser, item.tool)) return false;

  if (!isAdminRole(currentUser.role)) {
    if (!appVisibility?.ready) return false;
    const visibilityId = item.route
      ? visibilityIdForRoute(item.route, null)
      : visibilityIdForRoute('tool', item.app || { slug: item.tool });
    if (visibilityId && isAppHiddenForUser(appVisibility.snapshot, currentUser, visibilityId)) return false;
  }

  return true;
}

function activeItem(item, currentRoute, selectedTool) {
  if (item.id === 'action:ttcm' || item.id === 'action:schedule' || item.id === 'action:attendance') return false;
  if (item.route) return currentRoute === item.route;
  if (item.tool) return currentRoute === 'tool' && selectedTool?.slug === item.tool;
  return false;
}

function openTtcm(view = 'feed') {
  try { window.sessionStorage.setItem('bes-ttcm-open-on-load', view); } catch { /* optional */ }
  const button = document.querySelector('.brian-nav__ttcm-tab');
  if (button) {
    button.click();
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('bes-ttcm-open', { detail: { view } }));
    }, 80);
    return;
  }

  if (window.location.hash !== '#/dashboard') {
    window.location.hash = '#/dashboard';
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('bes-ttcm-open', { detail: { view } }));
    }, 360);
  } else {
    window.dispatchEvent(new CustomEvent('bes-ttcm-open', { detail: { view } }));
  }
}

function runAction(item, sourceEl) {
  if (item.action === 'ttcm') {
    openTtcm('feed');
    return;
  }
  if (item.action === 'schedule') {
    openTtcm('schedule');
    return;
  }
  if (item.action === 'attendance') {
    const attendanceButton = document.querySelector('.brian-nav__attendance-tab');
    if (attendanceButton) attendanceButton.click();
    return;
  }
  if (item.target) {
    launchRoute({
      target: item.target,
      label: String(item.labelVi || item.label || 'GO').slice(0, 2).toUpperCase(),
      color: item.accent,
      sourceEl,
      meta: { source: 'quick-access-rail' },
    });
  }
}

const QUICK_ACCESS_HISTORY_MAX = 6;
const QUICK_ACCESS_RESUME_MAX = 4;

function quickAccessWorkflowRunStorageKey(user) {
  return `bes-quick-access-workflow-run:${quickAccessHistoryUserKey(user)}`;
}

function loadQuickAccessWorkflowRun(user) {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.sessionStorage?.getItem(quickAccessWorkflowRunStorageKey(user)) || 'null');
    if (!value || typeof value !== 'object') return null;
    const workflowId = String(value.workflowId || '').trim();
    const nextIndex = Math.max(0, Number(value.nextIndex) || 0);
    return workflowId ? { workflowId, nextIndex } : null;
  } catch {
    return null;
  }
}

function saveQuickAccessWorkflowRun(user, value) {
  if (typeof window === 'undefined') return;
  try {
    if (!value?.workflowId) {
      window.sessionStorage?.removeItem(quickAccessWorkflowRunStorageKey(user));
      return;
    }
    window.sessionStorage?.setItem(
      quickAccessWorkflowRunStorageKey(user),
      JSON.stringify({ workflowId: String(value.workflowId), nextIndex: Math.max(0, Number(value.nextIndex) || 0) }),
    );
  } catch {
    // Workflow run state is best effort.
  }
}

function quickAccessHistoryUserKey(user) {
  return String(user?.id || user?.authId || user?.email || 'guest').trim().toLowerCase();
}

function quickAccessHistoryStorageKey(user) {
  return `bes-quick-access-history:${quickAccessHistoryUserKey(user)}`;
}

function loadQuickAccessHistory(user) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(window.sessionStorage?.getItem(quickAccessHistoryStorageKey(user)) || '[]');
    return (Array.isArray(raw) ? raw : [])
      .filter((entry) => entry && typeof entry.target === 'string' && entry.target.startsWith('#/'))
      .slice(0, QUICK_ACCESS_HISTORY_MAX);
  } catch {
    return [];
  }
}

function saveQuickAccessHistory(user, entries) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage?.setItem(
      quickAccessHistoryStorageKey(user),
      JSON.stringify((Array.isArray(entries) ? entries : []).slice(0, QUICK_ACCESS_HISTORY_MAX)),
    );
  } catch {
    // Session history is best effort.
  }
}

function quickAccessResumeStorageKey(user) {
  return `bes-quick-access-resume:${quickAccessHistoryUserKey(user)}`;
}

function loadQuickAccessResume(user) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(window.localStorage?.getItem(quickAccessResumeStorageKey(user)) || '[]');
    return (Array.isArray(raw) ? raw : [])
      .filter((entry) => entry && typeof entry.id === 'string' && typeof entry.itemId === 'string')
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
      .slice(0, QUICK_ACCESS_RESUME_MAX);
  } catch {
    return [];
  }
}

function saveQuickAccessResume(user, entries) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(
      quickAccessResumeStorageKey(user),
      JSON.stringify((Array.isArray(entries) ? entries : []).slice(0, QUICK_ACCESS_RESUME_MAX)),
    );
  } catch {
    // Resume persistence is best effort.
  }
}

function navigationLabelForTarget(target, catalog, language) {
  const normalized = String(target || '').split('?')[0];
  const item = (Array.isArray(catalog) ? catalog : []).find((candidate) => candidate?.target === normalized);
  if (item) return labelFor(item, language);

  const segments = normalized.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (segments[0] === 'tool' && segments[1]) {
    return segments[1]
      .split('-')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  const route = segments[0] || (language === 'vi' ? 'Trang trước' : 'Previous page');
  return route
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const QUICK_ACCESS_SAFE_AREA_MIN_WIDTH = 1024;
const QUICK_ACCESS_SAFE_GAP = 12;
const QUICK_ACCESS_SAFE_MAX_COLLAPSED = 320;
const QUICK_ACCESS_SAFE_MAX_PINNED = 720;
const QUICK_ACCESS_COLLISION_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="tab"]',
  '[role="gridcell"]',
  '[role="columnheader"]',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'label',
  'th',
  'td',
].join(',');

function parseCssPixels(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value || '').trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isQuickAccessCollisionCandidate(element) {
  if (!element || typeof window === 'undefined') return false;
  if (element.closest?.('[aria-hidden="true"]')) return false;
  const style = window.getComputedStyle(element);
  if (!style || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) <= 0.01) return false;
  if (style.position === 'fixed') return false;
  const rect = element.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  if (rect.right <= 0 || rect.left >= window.innerWidth) return false;
  return true;
}

function measureQuickAccessContentBaseline(container) {
  if (!container) return Number.POSITIVE_INFINITY;
  const candidates = [...container.querySelectorAll(QUICK_ACCESS_COLLISION_SELECTOR)];
  let minLeft = Number.POSITIVE_INFINITY;

  candidates.forEach((element) => {
    if (!isQuickAccessCollisionCandidate(element)) return;
    const rect = element.getBoundingClientRect();
    if (Number.isFinite(rect.left)) minLeft = Math.min(minLeft, rect.left);
  });

  return minLeft;
}

export default function GlobalQuickAccessRail({
  currentUser,
  currentRoute = 'home',
  selectedTool = null,
  language = 'vi',
  appVisibility,
}) {
  const [hovered, setHovered] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [customizerQuery, setCustomizerQuery] = useState('');
  const [commandQuery, setCommandQuery] = useState('');
  const [commandActiveIndex, setCommandActiveIndex] = useState(0);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState('');
  const [commandPaletteIndex, setCommandPaletteIndex] = useState(0);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [workflowCenterOpen, setWorkflowCenterOpen] = useState(false);
  const [workflowDraftName, setWorkflowDraftName] = useState('');
  const [workflowDraftIds, setWorkflowDraftIds] = useState([]);
  const [activeWorkflowRun, setActiveWorkflowRun] = useState(() => loadQuickAccessWorkflowRun(currentUser));
  const [backStack, setBackStack] = useState(() => loadQuickAccessHistory(currentUser));
  const [backStackOpen, setBackStackOpen] = useState(false);
  const [resumeItems, setResumeItems] = useState(() => loadQuickAccessResume(currentUser));
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);
  const [appSwitcherIndex, setAppSwitcherIndex] = useState(0);
  const [magneticStrength, setMagneticStrength] = useState(0);
  const [dockHoverIndex, setDockHoverIndex] = useState(-1);
  const [peekItemId, setPeekItemId] = useState('');
  const [peekTop, setPeekTop] = useState(92);
  const [actionItemId, setActionItemId] = useState('');
  const [actionTop, setActionTop] = useState(118);
  const [badges, setBadges] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [capsules, setCapsules] = useState({});
  const [capsuleItemId, setCapsuleItemId] = useState('');
  const [capsuleTop, setCapsuleTop] = useState(120);
  const [liveActivities, setLiveActivities] = useState([]);
  const [dragId, setDragId] = useState('');
  const [collapsing, setCollapsing] = useState(false);
  const closeTimerRef = useRef(0);
  const collapseMotionTimerRef = useRef(0);
  const peekTimerRef = useRef(0);
  const capsuleTimerRef = useRef(0);
  const magneticTimerRef = useRef(0);
  const badgeFrameRef = useRef(0);
  const commandInputRef = useRef(null);
  const commandPaletteInputRef = useRef(null);
  const layoutFrameRef = useRef(0);
  const layoutSettleTimerRef = useRef(0);
  const layoutVerifyTimerRef = useRef(0);
  const rootRef = useRef(null);
  const railRef = useRef(null);
  const panelRef = useRef(null);
  const selectedItemsRef = useRef([]);
  const switcherItemsRef = useRef([]);
  const suppressHistoryRef = useRef(false);
  const activateItemRef = useRef(null);

  const catalog = useMemo(() => {
    const byId = new Map();
    STATIC_ITEMS.forEach((item) => byId.set(item.id, item));
    APPS.map(dynamicAppItem).filter(Boolean).forEach((item) => {
      if (!byId.has(item.id)) byId.set(item.id, item);
    });
    return [...byId.values()].filter((item) => itemAllowed(item, currentUser, appVisibility));
  }, [
    currentUser?.id,
    currentUser?.authId,
    currentUser?.email,
    currentUser?.role,
    JSON.stringify(currentUser?.permissions || null),
    appVisibility?.ready,
    appVisibility?.snapshot,
  ]);

  const allowedIds = useMemo(() => catalog.map((item) => item.id), [catalog]);
  const allowedKey = allowedIds.join('|');
  const [config, setConfig] = useState(() => loadQuickAccessConfig(currentUser, allowedIds));

  const sidebarMode = config.mode || (config.pinned ? 'pin' : 'auto');
  const workspace = QUICK_ACCESS_WORKSPACES.includes(config.workspace) ? config.workspace : 'all';
  const railSize = QUICK_ACCESS_SIZES.includes(config.size) ? config.size : 'm';
  const motionMode = QUICK_ACCESS_MOTIONS.includes(config.motion) ? config.motion : 'fluid';
  const density = QUICK_ACCESS_DENSITIES.includes(config.density) ? config.density : 'comfortable';
  const railSide = QUICK_ACCESS_SIDES.includes(config.side) ? config.side : 'left';
  const hoverDelay = Math.max(80, Math.min(700, Number(config.hoverDelay) || 220));
  const showLabels = config.labels !== false;
  const pinned = sidebarMode === 'pin';
  const focusMode = sidebarMode === 'focus';
  const expanded = hovered || pinned || customizing || notificationCenterOpen || workflowCenterOpen;

  const openRail = useCallback(() => {
    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(collapseMotionTimerRef.current);
    setCollapsing(false);
    setHovered(true);
  }, []);

  const focusCommandInput = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    let attempts = 0;
    const tryFocus = () => {
      attempts += 1;
      const input = commandInputRef.current;
      const inertAncestor = input?.closest?.('[inert]');
      if (input && !inertAncestor) {
        try { input.focus({ preventScroll: true }); } catch { input.focus?.(); }
      }
      if (attempts < 12) window.setTimeout(tryFocus, 80);
    };
    window.requestAnimationFrame(tryFocus);
  }, []);

  const focusCommandPaletteInput = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    let attempts = 0;
    const tryFocus = () => {
      attempts += 1;
      const input = commandPaletteInputRef.current;
      const inertAncestor = input?.closest?.('[inert]');
      if (input && !inertAncestor) {
        input.tabIndex = 0;
        try { input.focus({ preventScroll: true }); } catch { input.focus?.(); }
      }
      if (attempts < 14) window.setTimeout(tryFocus, 70);
    };
    window.requestAnimationFrame(tryFocus);
  }, []);

  const collapseRail = useCallback((force = false) => {
    if (!force && (pinned || customizing || notificationCenterOpen || workflowCenterOpen)) return;
    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(collapseMotionTimerRef.current);

    if (hovered || pinned || customizing || notificationCenterOpen || workflowCenterOpen) {
      setCollapsing(true);
      setHovered(false);
      collapseMotionTimerRef.current = window.setTimeout(() => {
        setCollapsing(false);
      }, 290);
      return;
    }

    setHovered(false);
    setBackStackOpen(false);
  }, [pinned, customizing, notificationCenterOpen, workflowCenterOpen, hovered]);

  useEffect(() => {
    if ((!notificationCenterOpen && !workflowCenterOpen) || typeof window === 'undefined') return;
    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(collapseMotionTimerRef.current);
    setCollapsing(false);
    setHovered(true);
  }, [notificationCenterOpen, workflowCenterOpen]);

  useEffect(() => {
    if (!currentUser || !allowedIds.length) return undefined;
    let alive = true;

    const local = loadQuickAccessConfig(currentUser, allowedIds);
    setConfig(local);

    loadQuickAccessConfigFromCloud(currentUser, allowedIds).then((result) => {
      if (alive && result?.config) setConfig(result.config);
    });

    const unsubscribe = subscribeQuickAccessConfig(currentUser, allowedIds, (next) => {
      if (alive) setConfig(next);
    });

    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, [currentUser?.id, currentUser?.authId, currentUser?.email, allowedKey]);

  useEffect(() => {
    setActiveWorkflowRun(loadQuickAccessWorkflowRun(currentUser));
    setWorkflowCenterOpen(false);
    setWorkflowDraftName('');
    setWorkflowDraftIds([]);
  }, [currentUser?.id, currentUser?.authId, currentUser?.email]);

  useEffect(() => () => {
    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(collapseMotionTimerRef.current);
    window.clearTimeout(peekTimerRef.current);
    window.clearTimeout(capsuleTimerRef.current);
    window.clearTimeout(magneticTimerRef.current);
    window.cancelAnimationFrame(badgeFrameRef.current);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const syncBadges = () => {
      window.cancelAnimationFrame(badgeFrameRef.current);
      badgeFrameRef.current = window.requestAnimationFrame(() => {
        const dom = readBadgeSnapshot();
        setBadges((current) => {
          const next = { ...current };
          delete next['action:ttcm'];
          delete next['action:reports'];
          Object.assign(next, dom);
          const currentKeys = Object.keys(current);
          const nextKeys = Object.keys(next);
          if (currentKeys.length === nextKeys.length && nextKeys.every((key) => current[key] === next[key])) return current;
          return next;
        });
      });
    };
    const onBadgeEvent = (event) => {
      const detail = event?.detail && typeof event.detail === 'object' ? event.detail : {};
      setBadges((current) => ({ ...current, ...detail }));
    };
    syncBadges();
    const observer = new MutationObserver(syncBadges);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('bes-quick-access-badges', onBadgeEvent);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(badgeFrameRef.current);
      window.removeEventListener('bes-quick-access-badges', onBadgeEvent);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const normalizeNotification = (detail = {}) => {
      const id = String(detail.notificationId || detail.id || '').trim();
      if (!id) return null;
      const itemId = String(detail.itemId || '').trim();
      return {
        id,
        itemId,
        title: String(detail.title || (language === 'vi' ? 'Cập nhật mới' : 'New update')).trim(),
        text: String(detail.text || detail.message || detail.status || '').trim(),
        tone: ['info', 'success', 'warning', 'danger'].includes(String(detail.tone || '').toLowerCase())
          ? String(detail.tone).toLowerCase()
          : 'info',
        updatedAt: Number(detail.updatedAt) || Date.now(),
        source: 'custom',
      };
    };

    const applyNotification = (detail = {}) => {
      const id = String(detail.notificationId || detail.id || '').trim();
      if (!id) return;
      if (detail.clear === true || detail.state === 'clear') {
        setNotifications((current) => current.filter((entry) => entry.id !== id));
        return;
      }
      const next = normalizeNotification(detail);
      if (!next) return;
      setNotifications((current) => [
        next,
        ...current.filter((entry) => entry.id !== next.id),
      ].sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0)).slice(0, 20));
    };

    const onNotification = (event) => applyNotification(event?.detail || {});
    const previousApi = window.BrianQuickAccessNotifications;
    window.BrianQuickAccessNotifications = {
      push: (detail = {}) => window.dispatchEvent(new CustomEvent('bes-quick-access-notification', { detail })),
      clear: (id) => window.dispatchEvent(new CustomEvent('bes-quick-access-notification', { detail: { id, clear: true } })),
      clearAll: () => setNotifications([]),
    };

    window.addEventListener('bes-quick-access-notification', onNotification);
    return () => {
      window.removeEventListener('bes-quick-access-notification', onNotification);
      if (window.BrianQuickAccessNotifications === previousApi) return;
      if (previousApi) window.BrianQuickAccessNotifications = previousApi;
      else delete window.BrianQuickAccessNotifications;
    };
  }, [language]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const normalizeCapsule = (detail = {}) => {
      const itemId = String(detail.itemId || detail.id || '').trim();
      if (!itemId) return null;
      return {
        itemId,
        label: String(detail.label || detail.title || '').trim(),
        text: String(detail.text || detail.status || '').trim(),
        tone: ['info', 'success', 'warning', 'danger'].includes(String(detail.tone || '').toLowerCase())
          ? String(detail.tone).toLowerCase()
          : 'info',
        progress: Number.isFinite(Number(detail.progress))
          ? Math.max(0, Math.min(100, Number(detail.progress)))
          : null,
        updatedAt: Date.now(),
      };
    };

    const applyCapsule = (detail = {}) => {
      const itemId = String(detail.itemId || detail.id || '').trim();
      if (!itemId) return;
      if (detail.clear === true || detail.state === 'clear') {
        setCapsules((current) => {
          const next = { ...current };
          delete next[itemId];
          return next;
        });
        return;
      }
      const next = normalizeCapsule(detail);
      if (!next) return;
      setCapsules((current) => ({ ...current, [itemId]: next }));
    };

    const onCapsule = (event) => applyCapsule(event?.detail || {});
    const previousApi = window.BrianQuickAccessCapsules;
    window.BrianQuickAccessCapsules = {
      set: (detail = {}) => window.dispatchEvent(new CustomEvent('bes-quick-access-capsule', { detail })),
      clear: (itemId) => window.dispatchEvent(new CustomEvent('bes-quick-access-capsule', { detail: { itemId, clear: true } })),
    };

    window.addEventListener('bes-quick-access-capsule', onCapsule);
    return () => {
      window.removeEventListener('bes-quick-access-capsule', onCapsule);
      if (window.BrianQuickAccessCapsules === previousApi) return;
      if (previousApi) window.BrianQuickAccessCapsules = previousApi;
      else delete window.BrianQuickAccessCapsules;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const normalizeActivity = (detail = {}) => {
      const id = String(detail.id || 'primary').trim();
      if (!id) return null;
      const numericProgress = Number(detail.progress);
      return {
        id,
        itemId: String(detail.itemId || '').trim(),
        title: String(detail.title || (language === 'vi' ? 'Đang xử lí' : 'Working')).trim(),
        status: String(detail.status || '').trim(),
        state: ['running', 'complete', 'error'].includes(String(detail.state || '').toLowerCase())
          ? String(detail.state).toLowerCase()
          : 'running',
        progress: Number.isFinite(numericProgress) ? Math.max(0, Math.min(100, numericProgress)) : null,
        updatedAt: Date.now(),
      };
    };

    const applyActivity = (detail = {}) => {
      const id = String(detail.id || 'primary').trim();
      if (detail.clear === true || detail.state === 'clear') {
        setLiveActivities((current) => current.filter((activity) => activity.id !== id));
        return;
      }
      const next = normalizeActivity(detail);
      if (!next) return;
      setLiveActivities((current) => [
        next,
        ...current.filter((activity) => activity.id !== next.id),
      ].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3));
    };

    const onActivity = (event) => {
      const detail = event?.detail && typeof event.detail === 'object' ? event.detail : {};
      applyActivity(detail);
    };

    const emitActivity = (detail) => {
      window.dispatchEvent(new CustomEvent('bes-quick-access-activity', { detail }));
    };
    const previousApi = window.BrianQuickAccessActivity;
    window.BrianQuickAccessActivity = {
      start: (detail = {}) => emitActivity({ ...detail, state: 'running' }),
      update: (detail = {}) => emitActivity({ ...detail, state: detail.state || 'running' }),
      complete: (detail = {}) => emitActivity({ ...detail, progress: detail.progress ?? 100, state: 'complete' }),
      error: (detail = {}) => emitActivity({ ...detail, state: 'error' }),
      clear: (id = 'primary') => emitActivity({ id, state: 'clear', clear: true }),
    };

    window.addEventListener('bes-quick-access-activity', onActivity);
    return () => {
      window.removeEventListener('bes-quick-access-activity', onActivity);
      if (window.BrianQuickAccessActivity && window.BrianQuickAccessActivity !== previousApi) {
        if (previousApi) window.BrianQuickAccessActivity = previousApi;
        else delete window.BrianQuickAccessActivity;
      }
    };
  }, [language]);

  useEffect(() => {
    setBackStack(loadQuickAccessHistory(currentUser));
    setBackStackOpen(false);
    setResumeItems(loadQuickAccessResume(currentUser));
  }, [currentUser?.id, currentUser?.authId, currentUser?.email]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const normalizeResume = (detail = {}) => {
      const id = String(detail.resumeId || detail.id || detail.itemId || '').trim();
      const itemId = String(detail.itemId || '').trim();
      if (!id || !itemId) return null;
      const numericProgress = Number(detail.progress);
      const rawEvent = String(detail.event || detail.resumeEvent || '').trim();
      const rawDetail = detail.resumeDetail && typeof detail.resumeDetail === 'object'
        ? detail.resumeDetail
        : (detail.detail && typeof detail.detail === 'object' ? detail.detail : {});
      return {
        id,
        itemId,
        title: String(detail.title || (language === 'vi' ? 'Tiếp tục công việc' : 'Resume work')).trim(),
        subtitle: String(detail.subtitle || detail.status || '').trim(),
        progress: Number.isFinite(numericProgress) ? Math.max(0, Math.min(100, numericProgress)) : null,
        event: rawEvent,
        detail: rawDetail,
        updatedAt: Number(detail.updatedAt) || Date.now(),
      };
    };

    const commitResume = (updater) => {
      setResumeItems((current) => {
        const next = typeof updater === 'function' ? updater(current) : updater;
        const normalized = (Array.isArray(next) ? next : [])
          .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
          .slice(0, QUICK_ACCESS_RESUME_MAX);
        saveQuickAccessResume(currentUser, normalized);
        return normalized;
      });
    };

    const applyResume = (detail = {}) => {
      const id = String(detail.resumeId || detail.id || detail.itemId || '').trim();
      if (!id) return;
      if (detail.clear === true || detail.state === 'clear') {
        commitResume((current) => current.filter((entry) => entry.id !== id));
        return;
      }
      const next = normalizeResume(detail);
      if (!next) return;
      commitResume((current) => [
        next,
        ...current.filter((entry) => entry.id !== next.id),
      ]);
    };

    const onResume = (event) => applyResume(event?.detail || {});
    const onActivityResume = (event) => {
      const detail = event?.detail && typeof event.detail === 'object' ? event.detail : {};
      const itemId = String(detail.itemId || '').trim();
      if (!itemId) return;
      const activityId = `activity:${String(detail.id || itemId)}`;
      const state = String(detail.state || 'running').toLowerCase();
      if (detail.clear === true || ['clear', 'complete'].includes(state)) {
        applyResume({ id: activityId, clear: true });
        return;
      }
      if (state !== 'running') return;
      applyResume({
        id: activityId,
        itemId,
        title: detail.title,
        subtitle: detail.status,
        progress: detail.progress,
      });
    };

    const previousApi = window.BrianQuickAccessResume;
    window.BrianQuickAccessResume = {
      set: (detail = {}) => window.dispatchEvent(new CustomEvent('bes-quick-access-resume', { detail })),
      clear: (id) => window.dispatchEvent(new CustomEvent('bes-quick-access-resume', { detail: { id, clear: true } })),
      list: () => loadQuickAccessResume(currentUser),
    };

    window.addEventListener('bes-quick-access-resume', onResume);
    window.addEventListener('bes-quick-access-activity', onActivityResume);
    return () => {
      window.removeEventListener('bes-quick-access-resume', onResume);
      window.removeEventListener('bes-quick-access-activity', onActivityResume);
      if (window.BrianQuickAccessResume === previousApi) return;
      if (previousApi) window.BrianQuickAccessResume = previousApi;
      else delete window.BrianQuickAccessResume;
    };
  }, [
    currentUser?.id,
    currentUser?.authId,
    currentUser?.email,
    language,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onHashChange = (event) => {
      let previousTarget = '';
      let nextTarget = '';
      try {
        previousTarget = new URL(event.oldURL).hash || '#/home';
        nextTarget = new URL(event.newURL).hash || '#/home';
      } catch {
        previousTarget = '';
        nextTarget = window.location.hash || '#/home';
      }

      if (suppressHistoryRef.current) {
        suppressHistoryRef.current = false;
        return;
      }
      if (!previousTarget || previousTarget === nextTarget || previousTarget === '#/home') return;

      const entry = {
        target: previousTarget,
        label: navigationLabelForTarget(previousTarget, catalog, language),
        at: Date.now(),
      };
      setBackStack((current) => {
        const next = [
          entry,
          ...current.filter((candidate) => candidate.target !== entry.target),
        ].slice(0, QUICK_ACCESS_HISTORY_MAX);
        saveQuickAccessHistory(currentUser, next);
        return next;
      });
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [
    currentUser?.id,
    currentUser?.authId,
    currentUser?.email,
    catalog,
    language,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const maxDistance = 34;
    const openDistance = 9;
    const onPointerMove = (event) => {
      if (customizing || pinned) return;
      const distance = railSide === 'right'
        ? Math.max(0, window.innerWidth - Number(event.clientX || 0))
        : Math.max(0, Number(event.clientX || 0));
      if (distance > maxDistance) {
        setMagneticStrength((current) => current === 0 ? current : 0);
        window.clearTimeout(magneticTimerRef.current);
        return;
      }
      const strength = Math.max(0, Math.min(1, (maxDistance - distance) / maxDistance));
      setMagneticStrength(strength);
      if (distance <= openDistance) {
        window.clearTimeout(magneticTimerRef.current);
        magneticTimerRef.current = window.setTimeout(() => openRail(), Math.min(hoverDelay, 180));
      }
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.clearTimeout(magneticTimerRef.current);
    };
  }, [railSide, hoverDelay, customizing, pinned, openRail]);

  useEffect(() => {
    if (!customizing) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setCustomizerQuery('');
        setCustomizing(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [customizing]);

  useEffect(() => {
    if (!hovered || pinned || customizing || typeof document === 'undefined') return undefined;

    const onOutsidePointerDown = (event) => {
      if (event.target?.closest?.('.bqa-root')) return;
      collapseRail(false);
    };
    const onEscape = (event) => {
      if (event.key === 'Escape') collapseRail(false);
    };

    document.addEventListener('pointerdown', onOutsidePointerDown, true);
    window.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onOutsidePointerDown, true);
      window.removeEventListener('keydown', onEscape);
    };
  }, [hovered, pinned, customizing, collapseRail]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onNavigationStart = () => {
      if (!pinned && !customizing) collapseRail(false);
    };
    const onShortcut = (event) => {
      const tag = String(event.target?.tagName || '').toLowerCase();
      const editable = event.target?.isContentEditable || ['input', 'textarea', 'select'].includes(tag);
      if (event.repeat && !(event.altKey && event.code === 'Backquote')) return;

      if ((event.metaKey || event.ctrlKey) && !event.altKey && String(event.key || '').toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteQuery('');
        setCommandPaletteIndex(0);
        setCommandPaletteOpen(true);
        focusCommandPaletteInput();
        return;
      }

      if (!editable && event.altKey && !event.ctrlKey && !event.metaKey && event.code === 'Backquote') {
        const items = switcherItemsRef.current || [];
        if (!items.length) return;
        event.preventDefault();
        setAppSwitcherOpen(true);
        setAppSwitcherIndex((index) => (index + 1) % items.length);
        return;
      }

      if (!editable && event.altKey && !event.ctrlKey && !event.metaKey && /^[1-9]$/.test(String(event.key || ''))) {
        const item = selectedItemsRef.current?.[Number(event.key) - 1];
        if (item) {
          event.preventDefault();
          activateItemRef.current?.(item, null);
        }
        return;
      }

      if (editable) return;
      if (event.altKey && !event.ctrlKey && !event.metaKey && String(event.key || '').toLowerCase() === 'q') {
        event.preventDefault();
        if (expanded && !pinned && !customizing) collapseRail(false);
        else openRail();
      }
    };

    const onShortcutUp = (event) => {
      if (event.key !== 'Alt') return;
      setAppSwitcherOpen((open) => {
        if (open) {
          const items = switcherItemsRef.current || [];
          const target = items[appSwitcherIndex % Math.max(items.length, 1)];
          if (target) window.setTimeout(() => activateItemRef.current?.(target, null), 0);
        }
        return false;
      });
    };

    window.addEventListener('bes-navigation-start', onNavigationStart);
    window.addEventListener('keydown', onShortcut);
    window.addEventListener('keyup', onShortcutUp);
    return () => {
      window.removeEventListener('bes-navigation-start', onNavigationStart);
      window.removeEventListener('keydown', onShortcut);
      window.removeEventListener('keyup', onShortcutUp);
    };
  }, [pinned, customizing, expanded, collapseRail, openRail, focusCommandPaletteInput, appSwitcherIndex]);

  useEffect(() => {
    if (!commandPaletteOpen || typeof window === 'undefined') return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setCommandPaletteOpen(false);
      setCommandPaletteQuery('');
      setCommandPaletteIndex(0);
    };
    window.addEventListener('keydown', onKeyDown);
    focusCommandPaletteInput();
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [commandPaletteOpen, focusCommandPaletteInput]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    const root = rootRef.current;
    const shell = document.querySelector('.app-shell');
    const main = shell?.querySelector?.(':scope > #bes-main-content');
    const safeFrame = main?.querySelector?.(':scope > .bqa-content-safe-frame');
    const footer = shell?.querySelector?.(':scope > footer[data-app-shell-footer="true"]');
    if (!root || !shell || !main || !safeFrame) return undefined;

    shell.dataset.quickAccessState = pinned ? 'pinned' : 'rest';

    const clearSafeArea = () => {
      shell.style.removeProperty('--bqa-content-safe-shift');
      shell.dataset.quickAccessSafeShift = '0';
    };

    const measureAndApply = () => {
      window.cancelAnimationFrame(layoutFrameRef.current);
      layoutFrameRef.current = window.requestAnimationFrame(() => {
        const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches === true;
        const rightSide = railSide === 'right';
        const reserveMode = !rightSide && window.innerWidth >= QUICK_ACCESS_SAFE_AREA_MIN_WIDTH && !coarsePointer;
        shell.dataset.quickAccessSafeMode = reserveMode ? 'reserve' : 'overlay';

        // The existing shell safe-frame contract reserves space from the left.
        // Right-side Quick Access is intentionally overlay-only so switching sides
        // can never shove Dashboard/heroes horizontally or create a false left gap.
        if (!reserveMode) {
          clearSafeArea();
          return;
        }

        const currentShift = parseCssPixels(shell.dataset.quickAccessSafeShift, 0);
        const actualMinLeft = measureQuickAccessContentBaseline(safeFrame);
        if (!Number.isFinite(actualMinLeft)) {
          clearSafeArea();
          return;
        }

        const shellStyle = window.getComputedStyle(shell);
        if (shellStyle?.fontFamily) root.style.fontFamily = shellStyle.fontFamily;

        const rail = railRef.current;
        const panel = panelRef.current;
        const railRect = rail?.getBoundingClientRect?.();
        const rootRect = root.getBoundingClientRect();
        const rootStyle = window.getComputedStyle(root);
        const railWidth = parseCssPixels(rootStyle.getPropertyValue('--bqa-rail-width'), 56);
        const panelWidth = parseCssPixels(rootStyle.getPropertyValue('--bqa-panel-width'), 318);

        const collapsedBoundary = Number.isFinite(railRect?.right)
          ? railRect.right
          : rootRect.left + railWidth;

        const pinnedBoundary = pinned
          ? rootRect.left + railWidth + 8 + panelWidth
          : collapsedBoundary;

        const safeBoundary = (pinned ? pinnedBoundary : collapsedBoundary) + QUICK_ACCESS_SAFE_GAP;
        const maxShift = pinned ? QUICK_ACCESS_SAFE_MAX_PINNED : QUICK_ACCESS_SAFE_MAX_COLLAPSED;
        const delta = safeBoundary - actualMinLeft;
        const nextShift = Math.max(0, Math.min(maxShift, Math.ceil(currentShift + delta)));

        shell.style.setProperty('--bqa-content-safe-shift', `${nextShift}px`);
        shell.dataset.quickAccessSafeShift = String(nextShift);

        if (Math.abs(nextShift - currentShift) >= 1) {
          window.clearTimeout(layoutSettleTimerRef.current);
          layoutSettleTimerRef.current = window.setTimeout(measureAndApply, 290);
        }

        window.clearTimeout(layoutVerifyTimerRef.current);
        layoutVerifyTimerRef.current = window.setTimeout(() => {
          const verifiedMinLeft = measureQuickAccessContentBaseline(safeFrame);
          const stillOccluded = Number.isFinite(verifiedMinLeft) && verifiedMinLeft < safeBoundary - 0.5;

          if (stillOccluded && !pinned) {
            shell.dataset.quickAccessSafeMode = 'overlay';
            clearSafeArea();
          } else {
            shell.dataset.quickAccessSafeMode = 'reserve';
          }
        }, 330);

        shell.dataset.quickAccessState = pinned ? 'pinned' : 'rest';

        if (footer) footer.dataset.quickAccessOcclusionGuard = 'true';
        if (panel) panel.dataset.safeBoundary = String(Math.round(safeBoundary));
      });
    };

    const onResize = () => measureAndApply();
    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(measureAndApply)
      : null;
    const mutationObserver = typeof MutationObserver === 'function'
      ? new MutationObserver(measureAndApply)
      : null;

    resizeObserver?.observe(safeFrame);
    mutationObserver?.observe(safeFrame, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('bes-font-settings-updated', measureAndApply);
    window.addEventListener('bes-regional-font-updated', measureAndApply);

    measureAndApply();
    const settleA = window.setTimeout(measureAndApply, 120);
    const settleB = window.setTimeout(measureAndApply, 420);

    return () => {
      window.clearTimeout(settleA);
      window.clearTimeout(settleB);
      window.clearTimeout(layoutSettleTimerRef.current);
      window.clearTimeout(layoutVerifyTimerRef.current);
      window.cancelAnimationFrame(layoutFrameRef.current);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('bes-font-settings-updated', measureAndApply);
      window.removeEventListener('bes-regional-font-updated', measureAndApply);
      shell.style.removeProperty('--bqa-content-safe-shift');
      delete shell.dataset.quickAccessSafeShift;
      delete shell.dataset.quickAccessState;
      delete shell.dataset.quickAccessSafeMode;
      if (footer) delete footer.dataset.quickAccessOcclusionGuard;
      root.style.removeProperty('font-family');
    };
  }, [
    currentRoute,
    selectedTool?.slug,
    pinned,
    railSide,
    allowedKey,
    appVisibility?.ready,
  ]);

  if (!currentUser || currentRoute === 'home' || !catalog.length) return null;

  const selectedItems = config.items
    .map((id) => catalog.find((item) => item.id === id))
    .filter(Boolean)
    .slice(0, QUICK_ACCESS_MAX_ITEMS);

  const workspaceItems = selectedItems.filter((item) => workspaceAllowsItem(workspace, item));

  const recentItems = (config.recent || [])
    .map((id) => catalog.find((item) => item.id === id))
    .filter(Boolean)
    .filter((item) => workspaceAllowsItem(workspace, item))
    .slice(0, QUICK_ACCESS_RECENT_MAX);

  const contextItems = contextIdsFor(currentRoute, selectedTool)
    .map((id) => catalog.find((item) => item.id === id))
    .filter(Boolean)
    .filter((item) => workspaceAllowsItem(workspace, item))
    .filter((item) => !recentItems.some((recent) => recent.id === item.id))
    .slice(0, 3);

  const contextCopy = contextCopyFor(currentRoute, selectedTool, language);
  const workingItem = workspaceItems.find((item) => activeItem(item, currentRoute, selectedTool))
    || contextItems[0]
    || recentItems[0]
    || workspaceItems[0]
    || null;
  const pinnedSmartItems = workspaceItems
    .filter((item) => item.id !== workingItem?.id)
    .filter((item) => !recentItems.some((recent) => recent.id === item.id))
    .slice(0, 3);
  const primaryActivity = liveActivities[0] || null;
  const resumableItems = resumeItems
    .map((resume) => ({ resume, item: catalog.find((item) => item.id === resume.itemId) }))
    .filter((entry) => Boolean(entry.item))
    .slice(0, QUICK_ACCESS_RESUME_MAX);
  const primaryResume = resumableItems[0] || null;
  const workflowBundles = (Array.isArray(config.workflows) ? config.workflows : [])
    .map((workflow) => ({
      ...workflow,
      items: workflow.itemIds
        .map((id) => catalog.find((item) => item.id === id))
        .filter(Boolean),
    }))
    .filter((workflow) => workflow.items.length)
    .slice(0, QUICK_ACCESS_WORKFLOW_MAX);
  const activeWorkflow = activeWorkflowRun
    ? workflowBundles.find((workflow) => workflow.id === activeWorkflowRun.workflowId) || null
    : null;
  const activeWorkflowNextIndex = activeWorkflow
    ? Math.min(activeWorkflow.items.length, Math.max(0, Number(activeWorkflowRun?.nextIndex) || 0))
    : 0;
  const activeWorkflowNextItem = activeWorkflow?.items?.[activeWorkflowNextIndex] || null;
  const workflowCandidateItems = [
    ...selectedItems,
    ...catalog.filter((item) => !selectedItems.some((selected) => selected.id === item.id)),
  ].slice(0, 18);

  const notificationItems = (() => {
    const byId = new Map();
    notifications.forEach((entry) => byId.set(`custom:${entry.id}`, entry));

    liveActivities.forEach((activity) => {
      if (!['complete', 'error'].includes(activity.state)) return;
      const item = catalog.find((candidate) => candidate.id === activity.itemId);
      byId.set(`activity:${activity.id}`, {
        id: `activity:${activity.id}`,
        itemId: activity.itemId,
        title: activity.title || labelFor(item, language),
        text: activity.status || (activity.state === 'complete'
          ? (language === 'vi' ? 'Đã hoàn tất' : 'Completed')
          : (language === 'vi' ? 'Có lỗi cần kiểm tra' : 'Needs attention')),
        tone: activity.state === 'error' ? 'danger' : 'success',
        updatedAt: activity.updatedAt,
        source: 'activity',
      });
    });

    Object.values(capsules).forEach((capsule) => {
      byId.set(`capsule:${capsule.itemId}`, {
        id: `capsule:${capsule.itemId}`,
        itemId: capsule.itemId,
        title: capsule.label || labelFor(catalog.find((item) => item.id === capsule.itemId), language),
        text: capsule.text,
        tone: capsule.tone || 'info',
        updatedAt: capsule.updatedAt,
        source: 'capsule',
      });
    });

    Object.entries(badges).forEach(([itemId, value]) => {
      const item = catalog.find((candidate) => candidate.id === itemId);
      if (!item) return;
      byId.set(`badge:${itemId}`, {
        id: `badge:${itemId}`,
        itemId,
        title: labelFor(item, language),
        text: value === 'dot'
          ? (language === 'vi' ? 'Có cập nhật mới' : 'New update available')
          : (language === 'vi' ? `${value} mục cần chú ý` : `${value} items need attention`),
        tone: 'warning',
        updatedAt: 0,
        source: 'badge',
      });
    });

    return [...byId.values()]
      .filter((entry) => !entry.itemId || catalog.some((item) => item.id === entry.itemId))
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
      .slice(0, 8);
  })();
  const notificationCount = notificationItems.length;

  const capsuleSnapshotFor = (item) => {
    if (!item) return null;
    const activity = liveActivities.find((entry) => entry.itemId === item.id);
    if (activity) {
      return {
        itemId: item.id,
        label: activity.title || labelFor(item, language),
        text: activity.status || (activity.progress == null ? (language === 'vi' ? 'Đang xử lí…' : 'Working…') : `${Math.round(activity.progress)}%`),
        tone: activity.state === 'error' ? 'danger' : activity.state === 'complete' ? 'success' : 'info',
        progress: activity.progress,
      };
    }
    if (capsules[item.id]) return capsules[item.id];
    if (badges[item.id]) {
      return {
        itemId: item.id,
        label: labelFor(item, language),
        text: badges[item.id] === 'dot'
          ? (language === 'vi' ? 'Có cập nhật mới' : 'New update available')
          : (language === 'vi' ? `${badges[item.id]} mục cần chú ý` : `${badges[item.id]} items need attention`),
        tone: 'warning',
        progress: null,
      };
    }
    return null;
  };
  const activeCapsuleItem = catalog.find((item) => item.id === capsuleItemId) || null;
  const activeCapsule = capsuleSnapshotFor(activeCapsuleItem);

  const switcherItems = [
    ...recentItems,
    ...workspaceItems.filter((item) => !recentItems.some((recent) => recent.id === item.id)),
  ].slice(0, 6);

  const workspaceOptions = [
    { id: 'all', label: language === 'vi' ? 'Tất cả' : 'All' },
    { id: 'teaching', label: language === 'vi' ? 'Giảng dạy' : 'Teaching' },
    { id: 'homeroom', label: language === 'vi' ? 'Chủ nhiệm' : 'Homeroom' },
    { id: 'department', label: 'TTCM' },
  ].filter((option) => option.id !== 'department' || catalog.some((item) => workspaceAllowsItem('department', item)));

  const quickCreateItems = quickCreateDescriptors(language)
    .map((descriptor) => ({ descriptor, item: catalog.find((item) => item.id === descriptor.itemId) }))
    .filter((entry) => Boolean(entry.item));

  const commandNeedle = commandQuery.trim().toLocaleLowerCase(language === 'vi' ? 'vi-VN' : 'en-US');
  const commandEntries = [
    ...quickCreateItems.map((entry) => ({
      id: `action:${entry.descriptor.id}`,
      kind: 'action',
      label: entry.descriptor.label,
      description: entry.descriptor.description,
      keywords: entry.descriptor.keywords,
      item: entry.item,
      payload: entry,
    })),
    ...catalog.map((item) => ({
      id: `app:${item.id}`,
      kind: 'app',
      label: labelFor(item, language),
      description: descriptionFor(item, language),
      keywords: `${item.label || ''} ${item.labelVi || ''}`,
      item,
    })),
  ];
  const commandResults = commandNeedle
    ? commandEntries.filter((entry) => {
      const haystack = `${entry.label} ${entry.description} ${entry.keywords || ''}`
        .toLocaleLowerCase(language === 'vi' ? 'vi-VN' : 'en-US');
      return haystack.includes(commandNeedle);
    }).slice(0, 10)
    : [];

  const commandPaletteNeedle = commandPaletteQuery.trim().toLocaleLowerCase(language === 'vi' ? 'vi-VN' : 'en-US');
  const defaultPaletteEntries = [];
  const paletteSeen = new Set();
  [
    ...commandEntries.filter((entry) => entry.kind === 'action'),
    ...recentItems.map((item) => commandEntries.find((entry) => entry.id === `app:${item.id}`)).filter(Boolean),
    ...workspaceItems.map((item) => commandEntries.find((entry) => entry.id === `app:${item.id}`)).filter(Boolean),
  ].forEach((entry) => {
    if (!entry || paletteSeen.has(entry.id)) return;
    paletteSeen.add(entry.id);
    defaultPaletteEntries.push(entry);
  });
  const commandPaletteResults = (commandPaletteNeedle
    ? commandEntries.filter((entry) => {
      const haystack = `${entry.label} ${entry.description} ${entry.keywords || ''}`
        .toLocaleLowerCase(language === 'vi' ? 'vi-VN' : 'en-US');
      return haystack.includes(commandPaletteNeedle);
    })
    : defaultPaletteEntries
  ).slice(0, 12);

  const peekItem = catalog.find((item) => item.id === peekItemId) || null;
  const peekActions = peekItem
    ? quickActionDescriptors(peekItem, language).filter((descriptor) => descriptor.id !== 'open').slice(0, 3)
    : [];
  const actionItem = catalog.find((item) => item.id === actionItemId) || null;

  const availableItems = catalog.filter((item) => !config.items.includes(item.id));
  const customizerNeedle = customizerQuery.trim().toLocaleLowerCase(language === 'vi' ? 'vi-VN' : 'en-US');
  const filteredAvailableItems = customizerNeedle
    ? availableItems.filter((item) => {
      const haystack = `${item.label || ''} ${item.labelVi || ''}`.toLocaleLowerCase(language === 'vi' ? 'vi-VN' : 'en-US');
      return haystack.includes(customizerNeedle);
    })
    : availableItems;
  const persist = (next) => {
    setConfig(next);
    saveQuickAccessConfigToCloud(currentUser, next, allowedIds).then((result) => {
      if (result?.config) setConfig(result.config);
    });
  };

  const setWorkspace = (nextWorkspace) => {
    const safeWorkspace = QUICK_ACCESS_WORKSPACES.includes(nextWorkspace) ? nextWorkspace : 'all';
    persist({ ...config, workspace: safeWorkspace });
    setQuickCreateOpen(false);
    setWorkflowCenterOpen(false);
    setCommandQuery('');
    setCommandActiveIndex(0);
  };

  const enter = () => {
    openRail();
  };

  const leave = () => {
    window.clearTimeout(closeTimerRef.current);
    if (pinned || customizing || notificationCenterOpen || workflowCenterOpen) return;
    closeTimerRef.current = window.setTimeout(() => collapseRail(false), 340);
  };

  const activateItem = (item, sourceEl) => {
    if (!item) return;
    const recent = [item.id, ...(config.recent || []).filter((id) => id !== item.id)].slice(0, QUICK_ACCESS_RECENT_MAX);
    const nextConfig = { ...config, recent };
    setConfig(nextConfig);
    saveQuickAccessConfigToCloud(currentUser, nextConfig, allowedIds).then((result) => {
      if (result?.config) setConfig(result.config);
    });
    setCommandQuery('');
    setPeekItemId('');
    setActionItemId('');
    runAction(item, sourceEl);
    if (!pinned) collapseRail(false);
  };

  selectedItemsRef.current = workspaceItems;
  switcherItemsRef.current = switcherItems;
  activateItemRef.current = activateItem;

  const setSidebarMode = (mode) => {
    const nextMode = ['auto', 'pin', 'focus'].includes(mode) ? mode : 'auto';
    persist({ ...config, mode: nextMode, pinned: nextMode === 'pin' });
    if (nextMode === 'pin') openRail();
    else if (nextMode === 'focus') collapseRail(true);
  };

  const updatePersonalization = (patch) => persist({ ...config, ...patch });

  const togglePinned = () => setSidebarMode(pinned ? 'auto' : 'pin');

  const showCapsule = (item, sourceEl) => {
    window.clearTimeout(capsuleTimerRef.current);
    const snapshot = capsuleSnapshotFor(item);
    if (!snapshot) {
      setCapsuleItemId('');
      return;
    }
    capsuleTimerRef.current = window.setTimeout(() => {
      const rect = sourceEl?.getBoundingClientRect?.();
      if (rect) setCapsuleTop(Math.max(86, Math.min(window.innerHeight - 96, rect.top - 4)));
      setCapsuleItemId(item.id);
    }, 110);
  };

  const hideCapsule = () => {
    window.clearTimeout(capsuleTimerRef.current);
    capsuleTimerRef.current = window.setTimeout(() => setCapsuleItemId(''), 90);
  };

  const showPeek = (item, sourceEl) => {
    window.clearTimeout(peekTimerRef.current);
    if (!item || actionItemId || capsuleSnapshotFor(item)) return;
    peekTimerRef.current = window.setTimeout(() => {
      const rect = sourceEl?.getBoundingClientRect?.();
      if (rect) setPeekTop(Math.max(86, Math.min(window.innerHeight - 210, rect.top - 8)));
      setPeekItemId(item.id);
    }, 360);
  };

  const hidePeek = () => {
    window.clearTimeout(peekTimerRef.current);
    peekTimerRef.current = window.setTimeout(() => setPeekItemId(''), 110);
  };

  const runQuickAction = (item, descriptor, sourceEl = null) => {
    if (!item || !descriptor) return;
    if (descriptor.action === 'ttcm-feed') openTtcm('feed');
    else if (descriptor.action === 'ttcm-schedule') openTtcm('schedule');
    else if (descriptor.action === 'ttcm-personnel') openTtcm('personnel');
    else if (descriptor.action === 'attendance') runAction({ action: 'attendance' }, sourceEl);
    else activateItem(item, sourceEl);
    setActionItemId('');
    setPeekItemId('');
  };

  const runQuickCreate = (entry, sourceEl = null) => {
    if (!entry?.descriptor || !entry?.item) return;
    setQuickCreateOpen(false);
    setCommandQuery('');
    setCommandActiveIndex(0);
    activateItem(entry.item, sourceEl);
    if (entry.descriptor.event && typeof window !== 'undefined') {
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent(entry.descriptor.event, { detail: entry.descriptor.detail || {} }));
      }, 320);
    }
  };

  const executeCommand = (entry, sourceEl = null) => {
    if (!entry) return;
    if (entry.kind === 'action') runQuickCreate(entry.payload, sourceEl);
    else activateItem(entry.item, sourceEl);
  };

  const executePaletteCommand = (entry, sourceEl = null) => {
    if (!entry) return;
    setCommandPaletteOpen(false);
    setCommandPaletteQuery('');
    setCommandPaletteIndex(0);
    executeCommand(entry, sourceEl);
  };

  const openNotification = (entry, sourceEl = null) => {
    if (!entry) return;
    const item = catalog.find((candidate) => candidate.id === entry.itemId);
    if (item) activateItem(item, sourceEl);
    setNotificationCenterOpen(false);
  };

  const navigateBackEntry = (entry, index = 0, sourceEl = null) => {
    if (!entry?.target) return;
    const remaining = backStack.slice(Math.max(0, Number(index) + 1));
    setBackStack(remaining);
    saveQuickAccessHistory(currentUser, remaining);
    setBackStackOpen(false);
    suppressHistoryRef.current = true;
    launchRoute({
      target: entry.target,
      label: '←',
      color: '#2b76c7',
      sourceEl,
      meta: { source: 'quick-access-back-stack' },
    });
  };

  const dismissResume = (id) => {
    const next = resumeItems.filter((entry) => entry.id !== id);
    setResumeItems(next);
    saveQuickAccessResume(currentUser, next);
  };

  const resumeTask = (entry, sourceEl = null) => {
    if (!entry?.resume || !entry?.item) return;
    const { resume, item } = entry;
    activateItem(item, sourceEl);
    if (resume.event && typeof window !== 'undefined') {
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent(resume.event, { detail: resume.detail || {} }));
      }, 360);
    }
  };

  const toggleWorkflowDraftItem = (itemId) => {
    setWorkflowDraftIds((current) => {
      if (current.includes(itemId)) return current.filter((id) => id !== itemId);
      if (current.length >= QUICK_ACCESS_WORKFLOW_STEPS_MAX) return current;
      return [...current, itemId];
    });
  };

  const saveWorkflowBundle = () => {
    if (!workflowDraftIds.length || workflowBundles.length >= QUICK_ACCESS_WORKFLOW_MAX) return;
    const workflow = {
      id: `workflow-${Date.now().toString(36)}`,
      name: workflowDraftName.trim() || (language === 'vi' ? `Quy trình ${workflowBundles.length + 1}` : `Workflow ${workflowBundles.length + 1}`),
      itemIds: workflowDraftIds.slice(0, QUICK_ACCESS_WORKFLOW_STEPS_MAX),
    };
    persist({ ...config, workflows: [...workflowBundles.map(({ id, name, itemIds }) => ({ id, name, itemIds })), workflow] });
    setWorkflowDraftName('');
    setWorkflowDraftIds([]);
  };

  const deleteWorkflowBundle = (workflowId) => {
    const next = workflowBundles
      .filter((workflow) => workflow.id !== workflowId)
      .map(({ id, name, itemIds }) => ({ id, name, itemIds }));
    persist({ ...config, workflows: next });
    if (activeWorkflowRun?.workflowId === workflowId) {
      setActiveWorkflowRun(null);
      saveQuickAccessWorkflowRun(currentUser, null);
    }
  };

  const runWorkflowStep = (workflow, index, sourceEl = null) => {
    const item = workflow?.items?.[index];
    if (!item) return;
    const nextRun = { workflowId: workflow.id, nextIndex: index + 1 };
    setActiveWorkflowRun(nextRun);
    saveQuickAccessWorkflowRun(currentUser, nextRun);
    setWorkflowCenterOpen(false);
    collapseRail(true);
    activateItem(item, sourceEl);
  };

  const startWorkflowBundle = (workflow, sourceEl = null) => {
    if (!workflow?.items?.length) return;
    runWorkflowStep(workflow, 0, sourceEl);
  };

  const continueWorkflowBundle = (sourceEl = null) => {
    if (!activeWorkflow) return;
    if (activeWorkflowNextIndex >= activeWorkflow.items.length) {
      setActiveWorkflowRun(null);
      saveQuickAccessWorkflowRun(currentUser, null);
      return;
    }
    runWorkflowStep(activeWorkflow, activeWorkflowNextIndex, sourceEl);
  };

  const finishWorkflowBundle = () => {
    setActiveWorkflowRun(null);
    saveQuickAccessWorkflowRun(currentUser, null);
  };

  const removeItem = (id) => {
    const next = config.items.filter((itemId) => itemId !== id);
    persist({ ...config, items: next });
  };

  const addItem = (id) => {
    if (config.items.length >= QUICK_ACCESS_MAX_ITEMS || config.items.includes(id)) return;
    persist({ ...config, items: [...config.items, id] });
  };

  const reset = () => persist(createDefaultQuickAccessConfig(allowedIds));

  const moveDraggedBefore = (targetId) => {
    if (!dragId || dragId === targetId) return;
    const next = config.items.filter((id) => id !== dragId);
    const targetIndex = next.indexOf(targetId);
    next.splice(targetIndex < 0 ? next.length : targetIndex, 0, dragId);
    persist({ ...config, items: next });
    setDragId('');
  };

  const dropToFavorites = () => {
    if (!dragId) return;
    if (!config.items.includes(dragId)) {
      if (config.items.length >= QUICK_ACCESS_MAX_ITEMS) {
        setDragId('');
        return;
      }
      persist({ ...config, items: [...config.items, dragId] });
    }
    setDragId('');
  };

  const quickAccessUi = (
    <>
      {commandPaletteOpen ? (
        <div
          className="bqa-command-palette-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target !== event.currentTarget) return;
            setCommandPaletteOpen(false);
            setCommandPaletteQuery('');
            setCommandPaletteIndex(0);
          }}
        >
          <section className="bqa-command-palette" role="dialog" aria-modal="true" aria-label={language === 'vi' ? 'Bảng lệnh Brian' : 'Brian Command Palette'}>
            <header className="bqa-command-palette-search" data-bes-keep-search="true">
              <span className="bqa-command-palette-logo" aria-hidden="true"><Command size={19} /></span>
              <input
                ref={commandPaletteInputRef}
                type="search"
                autoFocus
                tabIndex={0}
                data-bes-keep-search="true"
                value={commandPaletteQuery}
                onChange={(event) => {
                  setCommandPaletteQuery(event.target.value);
                  setCommandPaletteIndex(0);
                }}
                onKeyDown={(event) => {
                  if (!commandPaletteResults.length) return;
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setCommandPaletteIndex((index) => (index + 1) % commandPaletteResults.length);
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setCommandPaletteIndex((index) => (index - 1 + commandPaletteResults.length) % commandPaletteResults.length);
                  } else if (event.key === 'Enter') {
                    event.preventDefault();
                    executePaletteCommand(
                      commandPaletteResults[Math.min(commandPaletteIndex, commandPaletteResults.length - 1)],
                      event.currentTarget,
                    );
                  }
                }}
                placeholder={language === 'vi' ? 'Tìm ứng dụng hoặc hành động…' : 'Search apps or actions…'}
                aria-label={language === 'vi' ? 'Tìm ứng dụng hoặc hành động' : 'Search apps or actions'}
              />
              <span className="bqa-command-palette-esc">Esc</span>
            </header>

            <div className="bqa-command-palette-meta">
              <span>{commandPaletteNeedle ? (language === 'vi' ? 'Kết quả tìm kiếm' : 'Search results') : (language === 'vi' ? 'Gợi ý nhanh' : 'Quick suggestions')}</span>
              <b>{commandPaletteResults.length}</b>
            </div>

            <div className="bqa-command-palette-results" role="listbox">
              {commandPaletteResults.map((entry, index) => {
                const item = entry.item;
                const Icon = entry.kind === 'action' ? Zap : (item?.icon || Boxes);
                const active = index === commandPaletteIndex;
                return (
                  <button
                    type="button"
                    key={entry.id}
                    role="option"
                    aria-selected={active}
                    className={`bqa-command-palette-result ${active ? 'is-active' : ''}`}
                    onMouseEnter={() => setCommandPaletteIndex(index)}
                    onClick={(event) => executePaletteCommand(entry, event.currentTarget)}
                  >
                    <span className="bqa-command-palette-icon" style={{ '--bqa-accent': item?.accent || '#2e6fae' }}><Icon size={19} aria-hidden="true" /></span>
                    <span className="bqa-command-palette-copy">
                      <strong>{entry.label}</strong>
                      <small>{entry.description}</small>
                    </span>
                    <span className={`bqa-command-palette-kind is-${entry.kind}`}>
                      {entry.kind === 'action' ? (language === 'vi' ? 'Lệnh' : 'Action') : 'App'}
                    </span>
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                );
              })}
              {!commandPaletteResults.length ? (
                <div className="bqa-command-palette-empty">
                  <Search size={22} aria-hidden="true" />
                  <strong>{language === 'vi' ? 'Không tìm thấy kết quả' : 'No results found'}</strong>
                  <span>{language === 'vi' ? 'Thử từ khóa khác hoặc tên ứng dụng.' : 'Try another keyword or app name.'}</span>
                </div>
              ) : null}
            </div>

            <footer className="bqa-command-palette-footer">
              <span><kbd>↑</kbd><kbd>↓</kbd>{language === 'vi' ? 'Di chuyển' : 'Navigate'}</span>
              <span><kbd>Enter</kbd>{language === 'vi' ? 'Mở' : 'Open'}</span>
              <span><kbd>Esc</kbd>{language === 'vi' ? 'Đóng' : 'Close'}</span>
            </footer>
          </section>
        </div>
      ) : null}

      <div
        ref={rootRef}
        className={`bqa-root ${expanded ? 'is-open' : 'is-collapsed'} ${collapsing ? 'is-collapsing' : ''} ${pinned ? 'is-pinned' : ''} ${focusMode ? 'is-focus' : ''} ${customizing ? 'is-customizing' : ''} ${notificationCenterOpen ? 'is-alerts-open' : ''} ${workflowCenterOpen ? 'is-workflow-open' : ''}`}
        data-quick-access="true"
        data-sidebar-mode={sidebarMode}
        data-workspace={workspace}
        data-size={railSize}
        data-motion-mode={motionMode}
        data-density={density}
        data-side={railSide}
        data-labels={showLabels ? 'show' : 'hide'}
        style={{ '--bqa-magnet': magneticStrength }}
        data-motion={collapsing ? 'collapsing' : (expanded ? 'open' : 'rest')}
        data-route={currentRoute}
        onPointerEnter={enter}
        onPointerLeave={leave}
        onFocusCapture={enter}
      >
        <div
          className="bqa-edge-trigger"
          aria-hidden="true"
          onPointerEnter={() => {
            window.clearTimeout(magneticTimerRef.current);
            magneticTimerRef.current = window.setTimeout(openRail, hoverDelay);
          }}
          onMouseEnter={() => {
            window.clearTimeout(magneticTimerRef.current);
            magneticTimerRef.current = window.setTimeout(openRail, hoverDelay);
          }}
          onPointerDown={(event) => {
            if (event.pointerType === 'touch' || event.pointerType === 'pen') openRail();
          }}
        />
        <div className="bqa-hover-bridge" aria-hidden="true" onPointerEnter={enter} />

        <aside
          ref={railRef}
          className="bqa-rail"
          aria-label={language === 'vi' ? 'Thanh truy cập nhanh' : 'Quick access'}
          onPointerEnter={openRail}
          onMouseEnter={openRail}
          onFocusCapture={openRail}
        >
          <button
            type="button"
            className="bqa-brand"
            aria-label={expanded ? (language === 'vi' ? 'Thu gọn thanh truy cập nhanh' : 'Collapse quick access') : (language === 'vi' ? 'Mở thanh truy cập nhanh' : 'Open quick access')}
            aria-expanded={expanded}
            onClick={() => {
              if (expanded && !pinned && !customizing) collapseRail(false);
              else openRail();
            }}
          >
            <span aria-hidden="true">B</span>
          </button>

          {backStack.length ? (
            <button
              type="button"
              className={`bqa-rail-back ${backStackOpen ? 'is-active' : ''}`}
              title={language === 'vi' ? 'Quay lại' : 'Go back'}
              aria-label={language === 'vi' ? 'Quay lại trang trước' : 'Go back to previous page'}
              aria-expanded={backStackOpen}
              onPointerEnter={() => {
                openRail();
                setBackStackOpen(true);
              }}
              onFocus={() => {
                openRail();
                setBackStackOpen(true);
              }}
              onClick={(event) => navigateBackEntry(backStack[0], 0, event.currentTarget)}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
          ) : null}

          <div
            className="bqa-rail-items"
            data-adaptive-dock="true"
            onPointerLeave={() => setDockHoverIndex(-1)}
          >
            {workspaceItems.map((item, index) => {
              const Icon = item.icon || Boxes;
              const active = activeItem(item, currentRoute, selectedTool);
              const dockDistance = dockHoverIndex < 0
                ? (active ? 'active' : 'rest')
                : String(Math.min(3, Math.abs(index - dockHoverIndex)));
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`bqa-rail-button ${active ? 'is-active' : ''}`}
                  style={{ '--bqa-accent': item.accent }}
                  title={labelFor(item, language)}
                  aria-label={labelFor(item, language)}
                  aria-current={active ? 'page' : undefined}
                  data-dock-distance={dockDistance}
                  onPointerEnter={(event) => {
                    setDockHoverIndex(index);
                    showCapsule(item, event.currentTarget);
                    showPeek(item, event.currentTarget);
                  }}
                  onPointerLeave={() => {
                    hideCapsule();
                    hidePeek();
                  }}
                  onFocus={(event) => {
                    setDockHoverIndex(index);
                    showCapsule(item, event.currentTarget);
                    showPeek(item, event.currentTarget);
                  }}
                  onBlur={() => {
                    setDockHoverIndex(-1);
                    hideCapsule();
                    hidePeek();
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setPeekItemId('');
                    setActionItemId(item.id);
                  }}
                  onClick={(event) => activateItem(item, event.currentTarget)}
                >
                  <Icon size={20} strokeWidth={2} aria-hidden="true" />
                  {badges[item.id] ? (
                    <span className={`bqa-rail-badge ${badges[item.id] === 'dot' ? 'is-dot' : ''}`}>
                      {badges[item.id] === 'dot' ? '' : badges[item.id]}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={`bqa-rail-workflows ${workflowCenterOpen ? 'is-active' : ''} ${activeWorkflow ? 'has-active' : ''}`}
            title={language === 'vi' ? 'Quy trình nhanh' : 'Workflow bundles'}
            aria-label={language === 'vi' ? 'Mở quy trình nhanh' : 'Open workflow bundles'}
            aria-expanded={workflowCenterOpen}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              window.clearTimeout(closeTimerRef.current);
              setHovered(true);
              setQuickCreateOpen(false);
              setNotificationCenterOpen(false);
              setBackStackOpen(false);
              setWorkflowCenterOpen((value) => !value);
            }}
          >
            <Boxes size={17} aria-hidden="true" />
            {workflowBundles.length ? <span>{workflowBundles.length}</span> : null}
          </button>

          <button
            type="button"
            className={`bqa-rail-create ${quickCreateOpen ? 'is-active' : ''}`}
            title={language === 'vi' ? 'Tạo nhanh' : 'Quick create'}
            aria-label={language === 'vi' ? 'Tạo nhanh' : 'Quick create'}
            aria-expanded={quickCreateOpen}
            onClick={() => {
              openRail();
              setCommandQuery('');
              setWorkflowCenterOpen(false);
              setNotificationCenterOpen(false);
              setQuickCreateOpen((value) => !value);
            }}
          >
            <Plus size={18} aria-hidden="true" />
          </button>

          {primaryActivity ? (
            <button
              type="button"
              className={`bqa-rail-activity is-${primaryActivity.state}`}
              style={{ '--bqa-progress': `${primaryActivity.progress ?? 0}` }}
              title={primaryActivity.title}
              aria-label={primaryActivity.title}
              onClick={openRail}
            >
              <span aria-hidden="true"><Zap size={15} /></span>
            </button>
          ) : null}

          {notificationCount ? (
            <button
              type="button"
              className={`bqa-rail-notifications ${notificationCenterOpen ? 'is-active' : ''}`}
              title={language === 'vi' ? 'Thông báo' : 'Notifications'}
              aria-label={language === 'vi' ? `Thông báo: ${notificationCount}` : `Notifications: ${notificationCount}`}
              aria-expanded={notificationCenterOpen}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                window.clearTimeout(closeTimerRef.current);
                window.clearTimeout(collapseMotionTimerRef.current);
                setCollapsing(false);
                setHovered(true);
                setQuickCreateOpen(false);
                setWorkflowCenterOpen(false);
                setBackStackOpen(false);
                setNotificationCenterOpen(true);
              }}
            >
              <Bell size={17} aria-hidden="true" />
              <span>{notificationCount > 9 ? '9+' : notificationCount}</span>
            </button>
          ) : null}

          <button
            type="button"
            className="bqa-rail-settings"
            title={language === 'vi' ? 'Tùy chỉnh lối tắt' : 'Customize shortcuts'}
            aria-label={language === 'vi' ? 'Tùy chỉnh lối tắt' : 'Customize shortcuts'}
            onClick={() => {
              setHovered(true);
              setWorkflowCenterOpen(false);
              setNotificationCenterOpen(false);
              setCustomizerQuery('');
              setCustomizing(true);
            }}
          >
            <Settings size={19} aria-hidden="true" />
          </button>
        </aside>

        {notificationCenterOpen ? (
          <section
          className="bqa-notification-center bqa-notification-surface"
          data-global-motion-isolate="true"
          aria-label={language === 'vi' ? 'Trung tâm thông báo' : 'Notification center'}
        >
            <header>
              <span><Bell size={14} aria-hidden="true" />{language === 'vi' ? 'Thông báo' : 'Notifications'}</span>
              <div>
                <b>{notificationCount}</b>
                <button type="button" onClick={() => setNotificationCenterOpen(false)} aria-label={language === 'vi' ? 'Đóng thông báo' : 'Close notifications'}><X size={14} aria-hidden="true" /></button>
              </div>
            </header>
            <div className="bqa-notification-list">
              {notificationItems.map((entry) => {
                const item = catalog.find((candidate) => candidate.id === entry.itemId);
                const Icon = item?.icon || Bell;
                return (
                  <button
                    type="button"
                    key={entry.id}
                    className={`bqa-notification-row is-${entry.tone || 'info'}`}
                    onClick={(event) => openNotification(entry, event.currentTarget)}
                  >
                    <span className="bqa-notification-icon" style={{ '--bqa-accent': item?.accent || '#2e6fae' }}><Icon size={16} aria-hidden="true" /></span>
                    <span className="bqa-notification-copy">
                      <strong>{entry.title}</strong>
                      <small>{entry.text || (language === 'vi' ? 'Mở để xem chi tiết' : 'Open for details')}</small>
                    </span>
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            <footer>{language === 'vi' ? 'Chỉ hiển thị các cập nhật bạn có quyền truy cập.' : 'Only updates you are allowed to access are shown.'}</footer>
          </section>
        ) : null}


        {activeCapsule ? (
          <aside
            className={`bqa-status-capsule is-${activeCapsule.tone || 'info'}`}
            style={{ top: capsuleTop }}
            aria-live="polite"
            onPointerEnter={() => window.clearTimeout(capsuleTimerRef.current)}
            onPointerLeave={hideCapsule}
          >
            <span className="bqa-status-capsule-dot" aria-hidden="true" />
            <span className="bqa-status-capsule-copy">
              <strong>{activeCapsule.label || labelFor(activeCapsuleItem, language)}</strong>
              <small>{activeCapsule.text}</small>
            </span>
            {activeCapsule.progress != null ? (
              <span className="bqa-status-capsule-progress" aria-label={`${Math.round(activeCapsule.progress)}%`}>
                <i style={{ width: `${activeCapsule.progress}%` }} />
              </span>
            ) : null}
          </aside>
        ) : null}

        <section
          ref={panelRef}
          className="bqa-panel"
          onPointerEnter={openRail}
          onMouseEnter={openRail}
          aria-hidden={!expanded}
          inert={expanded ? undefined : true}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && collapsing) setCollapsing(false);
          }}
        >
          <header className="bqa-panel-header">
            <div>
              <strong>{language === 'vi' ? 'Brian Quick Access' : 'Brian Quick Access'}</strong>
              <span>{language === 'vi' ? 'Gần đây · gợi ý ngữ cảnh · lệnh nhanh' : 'Recents · contextual suggestions · quick commands'}</span>
            </div>
            <div className="bqa-mode-switch" role="group" aria-label={language === 'vi' ? 'Chế độ thanh bên' : 'Sidebar mode'}>
              <button
                type="button"
                className={sidebarMode === 'auto' ? 'is-active' : ''}
                onClick={() => setSidebarMode('auto')}
                title={language === 'vi' ? 'Tự động thu gọn' : 'Auto hide'}
                aria-label={language === 'vi' ? 'Tự động thu gọn' : 'Auto hide'}
              >
                <Zap size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={sidebarMode === 'pin' ? 'is-active' : ''}
                onClick={() => setSidebarMode(sidebarMode === 'pin' ? 'auto' : 'pin')}
                title={language === 'vi' ? 'Ghim luôn mở' : 'Keep pinned'}
                aria-label={language === 'vi' ? 'Ghim luôn mở' : 'Keep pinned'}
              >
                {pinned ? <PinOff size={16} aria-hidden="true" /> : <Pin size={16} aria-hidden="true" />}
              </button>
              <button
                type="button"
                className={sidebarMode === 'focus' ? 'is-active' : ''}
                onClick={() => setSidebarMode('focus')}
                title={language === 'vi' ? 'Focus: ẩn tối đa' : 'Focus: hide rail'}
                aria-label={language === 'vi' ? 'Focus: ẩn tối đa' : 'Focus: hide rail'}
              >
                <EyeOff size={16} aria-hidden="true" />
              </button>
            </div>
          </header>

          {workflowCenterOpen ? (
            <section className="bqa-workflow-center" data-workflow-center="true" aria-label={language === 'vi' ? 'Quy trình nhanh' : 'Workflow bundles'}>
              <header className="bqa-workflow-header">
                <span><Boxes size={14} aria-hidden="true" />{language === 'vi' ? 'Quy trình nhanh' : 'Workflow bundles'}</span>
                <div>
                  <b>{workflowBundles.length}/{QUICK_ACCESS_WORKFLOW_MAX}</b>
                  <button type="button" onClick={() => setWorkflowCenterOpen(false)} aria-label={language === 'vi' ? 'Đóng quy trình' : 'Close workflows'}>
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              </header>

              {activeWorkflow ? (
                <div className="bqa-workflow-active" data-workflow-active="true">
                  <div className="bqa-workflow-active-top">
                    <span>
                      <small>{language === 'vi' ? 'ĐANG CHẠY' : 'IN PROGRESS'}</small>
                      <strong>{activeWorkflow.name}</strong>
                    </span>
                    <b>{activeWorkflowNextIndex}/{activeWorkflow.items.length}</b>
                  </div>
                  <div className="bqa-workflow-progress" aria-label={`${activeWorkflowNextIndex}/${activeWorkflow.items.length}`}>
                    <i style={{ width: `${Math.round((activeWorkflowNextIndex / Math.max(activeWorkflow.items.length, 1)) * 100)}%` }} />
                  </div>
                  <div className="bqa-workflow-next">
                    {activeWorkflowNextItem ? (
                      <>
                        <span style={{ '--bqa-accent': activeWorkflowNextItem.accent }}>
                          {React.createElement(activeWorkflowNextItem.icon || Boxes, { size: 16, 'aria-hidden': true })}
                        </span>
                        <div>
                          <small>{language === 'vi' ? 'BƯỚC TIẾP THEO' : 'NEXT STEP'}</small>
                          <strong>{labelFor(activeWorkflowNextItem, language)}</strong>
                        </div>
                        <button type="button" onClick={(event) => continueWorkflowBundle(event.currentTarget)}>
                          {language === 'vi' ? 'Mở' : 'Open'} <ChevronRight size={13} aria-hidden="true" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="is-done"><Check size={16} aria-hidden="true" /></span>
                        <div>
                          <small>{language === 'vi' ? 'HOÀN TẤT' : 'COMPLETE'}</small>
                          <strong>{language === 'vi' ? 'Đã đi hết quy trình' : 'Workflow completed'}</strong>
                        </div>
                        <button type="button" onClick={finishWorkflowBundle}>{language === 'vi' ? 'Xong' : 'Done'}</button>
                      </>
                    )}
                  </div>
                </div>
              ) : null}

              {workflowBundles.length ? (
                <div className="bqa-workflow-list">
                  {workflowBundles.map((workflow) => (
                    <article className="bqa-workflow-card" key={workflow.id}>
                      <div className="bqa-workflow-card-copy">
                        <strong>{workflow.name}</strong>
                        <small>{language === 'vi' ? `${workflow.items.length} bước` : `${workflow.items.length} steps`}</small>
                      </div>
                      <div className="bqa-workflow-sequence" aria-label={workflow.name}>
                        {workflow.items.map((item, index) => (
                          <span key={item.id} style={{ '--bqa-accent': item.accent }} title={labelFor(item, language)}>
                            {React.createElement(item.icon || Boxes, { size: 14, 'aria-hidden': true })}
                            <i>{index + 1}</i>
                          </span>
                        ))}
                      </div>
                      <div className="bqa-workflow-actions">
                        <button type="button" className="is-start" onClick={(event) => startWorkflowBundle(workflow, event.currentTarget)}>
                          <Zap size={13} aria-hidden="true" />{language === 'vi' ? 'Bắt đầu' : 'Start'}
                        </button>
                        <button type="button" onClick={() => deleteWorkflowBundle(workflow.id)} aria-label={language === 'vi' ? `Xóa ${workflow.name}` : `Delete ${workflow.name}`}>
                          <X size={13} aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="bqa-workflow-empty">
                  <Boxes size={22} aria-hidden="true" />
                  <strong>{language === 'vi' ? 'Chưa có quy trình nào' : 'No workflow bundles yet'}</strong>
                  <span>{language === 'vi' ? 'Chọn nhiều công cụ bên dưới để tạo một luồng làm việc dùng lại.' : 'Select multiple tools below to create a reusable flow.'}</span>
                </div>
              )}

              {workflowBundles.length < QUICK_ACCESS_WORKFLOW_MAX ? (
                <div className="bqa-workflow-builder">
                  <label>
                    <span>{language === 'vi' ? 'Tên quy trình' : 'Workflow name'}</span>
                    <input
                      type="text"
                      value={workflowDraftName}
                      maxLength={42}
                      onChange={(event) => setWorkflowDraftName(event.target.value)}
                      placeholder={language === 'vi' ? 'Ví dụ: Buổi sáng' : 'Example: Morning routine'}
                    />
                  </label>
                  <div className="bqa-workflow-builder-head">
                    <span>{language === 'vi' ? 'Chọn các bước' : 'Choose steps'}</span>
                    <b>{workflowDraftIds.length}/{QUICK_ACCESS_WORKFLOW_STEPS_MAX}</b>
                  </div>
                  <div className="bqa-workflow-picker">
                    {workflowCandidateItems.map((item) => {
                      const selected = workflowDraftIds.includes(item.id);
                      const Icon = item.icon || Boxes;
                      return (
                        <button
                          type="button"
                          key={item.id}
                          className={selected ? 'is-selected' : ''}
                          aria-pressed={selected}
                          onClick={() => toggleWorkflowDraftItem(item.id)}
                        >
                          <span style={{ '--bqa-accent': item.accent }}><Icon size={15} aria-hidden="true" /></span>
                          <strong>{labelFor(item, language)}</strong>
                          {selected ? <Check size={13} aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="bqa-workflow-save"
                    disabled={!workflowDraftIds.length}
                    onClick={saveWorkflowBundle}
                  >
                    <Plus size={14} aria-hidden="true" />
                    {language === 'vi' ? 'Lưu quy trình' : 'Save workflow'}
                  </button>
                </div>
              ) : (
                <div className="bqa-workflow-limit">
                  {language === 'vi' ? `Đã đạt giới hạn ${QUICK_ACCESS_WORKFLOW_MAX} quy trình.` : `You reached the ${QUICK_ACCESS_WORKFLOW_MAX}-workflow limit.`}
                </div>
              )}
            </section>
          ) : null}

          {backStackOpen && backStack.length ? (
            <section className="bqa-back-stack" aria-label={language === 'vi' ? 'Lịch sử điều hướng' : 'Navigation history'}>
              <header>
                <span><ChevronLeft size={14} aria-hidden="true" />{language === 'vi' ? 'Vừa đi qua' : 'Recent places'}</span>
                <button type="button" onClick={() => setBackStackOpen(false)} aria-label={language === 'vi' ? 'Đóng lịch sử' : 'Close history'}>
                  <X size={13} aria-hidden="true" />
                </button>
              </header>
              <div>
                {backStack.slice(0, 5).map((entry, index) => (
                  <button
                    type="button"
                    key={`${entry.target}-${entry.at || index}`}
                    onClick={(event) => navigateBackEntry(entry, index, event.currentTarget)}
                  >
                    <span>{index + 1}</span>
                    <strong>{entry.label || navigationLabelForTarget(entry.target, catalog, language)}</strong>
                    <small>{entry.target.replace(/^#\//, '')}</small>
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <nav className="bqa-workspace-tabs" aria-label={language === 'vi' ? 'Không gian làm việc' : 'Workspace'}>
            {workspaceOptions.map((option) => (
              <button
                type="button"
                key={option.id}
                className={workspace === option.id ? 'is-active' : ''}
                aria-current={workspace === option.id ? 'true' : undefined}
                onClick={() => setWorkspace(option.id)}
              >
                {option.label}
              </button>
            ))}
          </nav>

          <label className="bqa-command-search" data-bes-keep-search="true">
            <Search size={17} aria-hidden="true" />
            <input
              ref={commandInputRef}
              type="search"
              value={commandQuery}
              onChange={(event) => {
                setCommandQuery(event.target.value);
                setCommandActiveIndex(0);
                setQuickCreateOpen(false);
              }}
              onKeyDown={(event) => {
                if (!commandResults.length) return;
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setCommandActiveIndex((index) => (index + 1) % commandResults.length);
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setCommandActiveIndex((index) => (index - 1 + commandResults.length) % commandResults.length);
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  executeCommand(commandResults[Math.min(commandActiveIndex, commandResults.length - 1)], event.currentTarget);
                }
              }}
              placeholder={language === 'vi' ? 'Tìm ứng dụng, hành động…' : 'Search apps and actions…'}
              aria-label={language === 'vi' ? 'Tìm lệnh và ứng dụng' : 'Search commands and apps'}
            />
            <span className="bqa-command-kbd"><Command size={12} aria-hidden="true" />K</span>
            {commandQuery ? (
              <button type="button" onClick={() => setCommandQuery('')} aria-label={language === 'vi' ? 'Xóa tìm kiếm' : 'Clear search'}>
                <X size={14} aria-hidden="true" />
              </button>
            ) : null}
          </label>

          {quickCreateOpen && !commandNeedle ? (
            <section className="bqa-quick-create-sheet" aria-label={language === 'vi' ? 'Tạo nhanh' : 'Quick create'}>
              <header>
                <span><Plus size={14} aria-hidden="true" />{language === 'vi' ? 'Tạo nhanh' : 'Quick create'}</span>
                <button type="button" onClick={() => setQuickCreateOpen(false)} aria-label={language === 'vi' ? 'Đóng tạo nhanh' : 'Close quick create'}><X size={14} aria-hidden="true" /></button>
              </header>
              <div>
                {quickCreateItems.map((entry) => {
                  const Icon = entry.item.icon || Boxes;
                  return (
                    <button type="button" key={entry.descriptor.id} onClick={(event) => runQuickCreate(entry, event.currentTarget)}>
                      <span style={{ '--bqa-accent': entry.item.accent }}><Icon size={17} aria-hidden="true" /></span>
                      <span><strong>{entry.descriptor.label}</strong><small>{entry.descriptor.description}</small></span>
                      <ChevronRight size={15} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {commandNeedle ? (
            <div className="bqa-command-results" role="listbox" aria-label={language === 'vi' ? 'Kết quả tìm nhanh' : 'Quick search results'}>
              {commandResults.map((entry, index) => {
                const item = entry.item;
                const Icon = entry.kind === 'action' ? Zap : (item?.icon || Boxes);
                return (
                  <button
                    type="button"
                    key={entry.id}
                    role="option"
                    aria-selected={index === commandActiveIndex}
                    className={`bqa-command-result ${index === commandActiveIndex ? 'is-active' : ''}`}
                    onMouseEnter={() => setCommandActiveIndex(index)}
                    onClick={(event) => executeCommand(entry, event.currentTarget)}
                  >
                    <span className="bqa-item-icon" style={{ '--bqa-accent': item?.accent || '#2e6fae' }}><Icon size={18} aria-hidden="true" /></span>
                    <span>
                      <strong>{entry.label}</strong>
                      <small>{entry.description}</small>
                    </span>
                    <span className={`bqa-command-kind is-${entry.kind}`}>{entry.kind === 'action' ? (language === 'vi' ? 'Lệnh' : 'Action') : (language === 'vi' ? 'App' : 'App')}</span>
                  </button>
                );
              })}
              {!commandResults.length ? <div className="bqa-command-empty">{language === 'vi' ? 'Không tìm thấy lệnh phù hợp.' : 'No matching command.'}</div> : null}
            </div>
          ) : (
            <>
              <div className="bqa-context-banner" data-context-route={currentRoute}>
                <span className="bqa-context-mark" aria-hidden="true"><Zap size={16} /></span>
                <span className="bqa-context-copy">
                  <small>{contextCopy.kicker}</small>
                  <strong>{contextCopy.title}</strong>
                  <span>{contextCopy.description}</span>
                </span>
              </div>

              {primaryResume ? (
                <section className="bqa-resume-card" data-session-resume="true">
                  <span className="bqa-resume-icon" style={{ '--bqa-accent': primaryResume.item.accent }}>
                    {React.createElement(primaryResume.item.icon || Boxes, { size: 18, 'aria-hidden': true })}
                  </span>
                  <span className="bqa-resume-copy">
                    <small>{language === 'vi' ? 'TIẾP TỤC' : 'RESUME'}</small>
                    <strong>{primaryResume.resume.title}</strong>
                    <span>{primaryResume.resume.subtitle || labelFor(primaryResume.item, language)}</span>
                  </span>
                  {primaryResume.resume.progress != null ? (
                    <span className="bqa-resume-progress">
                      <i style={{ width: `${primaryResume.resume.progress}%` }} />
                      <b>{Math.round(primaryResume.resume.progress)}%</b>
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="bqa-resume-go"
                    onClick={(event) => resumeTask(primaryResume, event.currentTarget)}
                  >
                    {language === 'vi' ? 'Tiếp tục' : 'Resume'} <ChevronRight size={13} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="bqa-resume-dismiss"
                    onClick={() => dismissResume(primaryResume.resume.id)}
                    aria-label={language === 'vi' ? 'Ẩn công việc này' : 'Dismiss this task'}
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </section>
              ) : null}

              <div className="bqa-smart-stack" data-smart-stack="true">
                {workingItem ? (
                  <section className="bqa-smart-section is-working">
                    <header><Zap size={14} aria-hidden="true" /><span>{language === 'vi' ? 'Đang làm' : 'Working now'}</span></header>
                    <div>
                      {[workingItem].map((item) => {
                        const Icon = item.icon || Boxes;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            draggable
                            onDragStart={(event) => {
                              setDragId(item.id);
                              event.dataTransfer.effectAllowed = 'copyMove';
                              event.dataTransfer.setData('text/plain', item.id);
                            }}
                            onDragEnd={() => setDragId('')}
                            onClick={(event) => activateItem(item, event.currentTarget)}
                          >
                            <span style={{ '--bqa-accent': item.accent }}><Icon size={16} aria-hidden="true" /></span>
                            <b>{labelFor(item, language)}</b>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {recentItems.length ? (
                  <section className="bqa-smart-section is-recent">
                    <header><Clock3 size={14} aria-hidden="true" /><span>{language === 'vi' ? 'Vừa dùng' : 'Recent'}</span></header>
                    <div>
                      {recentItems.map((item) => {
                        const Icon = item.icon || Boxes;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            draggable
                            onDragStart={(event) => {
                              setDragId(item.id);
                              event.dataTransfer.effectAllowed = 'copyMove';
                              event.dataTransfer.setData('text/plain', item.id);
                            }}
                            onDragEnd={() => setDragId('')}
                            onClick={(event) => activateItem(item, event.currentTarget)}
                          >
                            <span style={{ '--bqa-accent': item.accent }}><Icon size={16} aria-hidden="true" /></span>
                            <b>{labelFor(item, language)}</b>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {pinnedSmartItems.length ? (
                  <section className="bqa-smart-section is-pinned-smart">
                    <header><Star size={14} aria-hidden="true" /><span>{language === 'vi' ? 'Đã ghim' : 'Pinned'}</span></header>
                    <div>
                      {pinnedSmartItems.map((item) => {
                        const Icon = item.icon || Boxes;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            draggable
                            onDragStart={(event) => {
                              setDragId(item.id);
                              event.dataTransfer.effectAllowed = 'move';
                              event.dataTransfer.setData('text/plain', item.id);
                            }}
                            onDragEnd={() => setDragId('')}
                            onClick={(event) => activateItem(item, event.currentTarget)}
                          >
                            <span style={{ '--bqa-accent': item.accent }}><Icon size={16} aria-hidden="true" /></span>
                            <b>{labelFor(item, language)}</b>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ) : null}
              </div>

              {primaryActivity ? (
                <section className={`bqa-live-activity is-${primaryActivity.state}`} aria-live="polite">
                  <div className="bqa-live-activity-ring" style={{ '--bqa-progress': `${primaryActivity.progress ?? 0}` }}>
                    <Zap size={15} aria-hidden="true" />
                  </div>
                  <div>
                    <small>{language === 'vi' ? 'HOẠT ĐỘNG ĐANG CHẠY' : 'LIVE ACTIVITY'}</small>
                    <strong>{primaryActivity.title}</strong>
                    <span>{primaryActivity.status || (primaryActivity.progress == null ? (language === 'vi' ? 'Đang xử lí…' : 'Working…') : `${Math.round(primaryActivity.progress)}%`)}</span>
                  </div>
                  {primaryActivity.progress != null ? <b>{Math.round(primaryActivity.progress)}%</b> : null}
                </section>
              ) : null}

              <div
                className={`bqa-panel-list ${dragId ? 'is-drop-ready' : ''}`}
                role="list"
                data-favorites-dropzone="true"
                onDragOver={(event) => {
                  if (!dragId) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = config.items.includes(dragId) ? 'move' : 'copy';
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  dropToFavorites();
                }}
              >
                {workspaceItems.map((item, index) => {
                  const Icon = item.icon || Boxes;
                  const active = activeItem(item, currentRoute, selectedTool);
                  return (
                    <div
                      role="listitem"
                      key={item.id}
                      draggable
                      className={`bqa-panel-item ${active ? 'is-active' : ''}`}
                      style={{ '--bqa-accent': item.accent }}
                      onDragStart={(event) => {
                        setDragId(item.id);
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', item.id);
                      }}
                      onDragEnd={() => setDragId('')}
                      onDragOver={(event) => {
                        if (!dragId) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        moveDraggedBefore(item.id);
                      }}
                    >
                      <button type="button" className="bqa-panel-item-main" onClick={(event) => activateItem(item, event.currentTarget)}>
                        <span className="bqa-item-icon"><Icon size={20} strokeWidth={2} aria-hidden="true" /></span>
                        <span className="bqa-item-copy">
                          <span className="bqa-item-label">{labelFor(item, language)}</span>
                          <small>{language === 'vi' ? `Alt+${index + 1}` : `Alt+${index + 1}`}</small>
                        </span>
                        {badges[item.id] ? (
                          <span className={`bqa-panel-badge ${badges[item.id] === 'dot' ? 'is-dot' : ''}`}>
                            {badges[item.id] === 'dot' ? '' : badges[item.id]}
                          </span>
                        ) : null}
                        {active ? <Check className="bqa-item-check" size={17} aria-hidden="true" /> : null}
                      </button>
                      <button
                        type="button"
                        className="bqa-item-more"
                        aria-label={language === 'vi' ? `Thao tác nhanh cho ${labelFor(item, language)}` : `Quick actions for ${labelFor(item, language)}`}
                        aria-haspopup="menu"
                        aria-expanded={actionItemId === item.id}
                        onClick={(event) => {
                          setPeekItemId('');
                          const rect = event.currentTarget.getBoundingClientRect();
                          const rootRect = rootRef.current?.getBoundingClientRect?.();
                          if (rootRect) setActionTop(Math.max(76, Math.min(rootRect.height - 170, rect.top - rootRect.top - 8)));
                          setActionItemId((value) => value === item.id ? '' : item.id);
                        }}
                      >
                        <MoreHorizontal size={17} aria-hidden="true" />
                      </button>
                      <GripVertical className="bqa-item-grip" size={16} aria-hidden="true" />
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <footer className="bqa-panel-footer">
            <button type="button" onClick={() => { setCustomizerQuery(''); setCustomizing(true); }}>
              <Settings size={18} aria-hidden="true" />
              <span><strong>{language === 'vi' ? 'Tùy chỉnh lối tắt' : 'Customize shortcuts'}</strong><small>{language === 'vi' ? 'Sắp xếp, ẩn/hiện ứng dụng' : 'Reorder and choose apps'}</small></span>
            </button>
            <div className="bqa-account-note">
              <span className="bqa-sync-note"><Check size={15} aria-hidden="true" />{language === 'vi' ? 'Lưu theo tài khoản' : 'Saved to your account'}</span>
              <span className="bqa-shortcut-hint"><kbd>Alt</kbd><b>Q</b></span>
            </div>
          </footer>
        </section>

        {peekItem ? (
          <aside
            className="bqa-peek-card"
            style={{ top: peekTop }}
            onPointerEnter={() => window.clearTimeout(peekTimerRef.current)}
            onPointerLeave={hidePeek}
            aria-label={language === 'vi' ? `Xem nhanh ${labelFor(peekItem, language)}` : `Quick peek ${labelFor(peekItem, language)}`}
          >
            <div className="bqa-peek-top">
              <span className="bqa-peek-icon" style={{ '--bqa-accent': peekItem.accent }}>
                {React.createElement(peekItem.icon || Boxes, { size: 20, 'aria-hidden': true })}
              </span>
              <div><strong>{labelFor(peekItem, language)}</strong><small>{descriptionFor(peekItem, language)}</small></div>
            </div>
            {badges[peekItem.id] ? (
              <div className="bqa-peek-status">
                <span className="bqa-peek-status-dot" />
                {badges[peekItem.id] === 'dot'
                  ? (language === 'vi' ? 'Có cập nhật mới' : 'New update available')
                  : (language === 'vi' ? `${badges[peekItem.id]} mục cần chú ý` : `${badges[peekItem.id]} items need attention`)}
              </div>
            ) : null}
            {peekActions.length ? (
              <div className="bqa-peek-actions" role="group" aria-label={language === 'vi' ? 'Thao tác ngay' : 'Quick actions'}>
                {peekActions.map((descriptor) => (
                  <button
                    type="button"
                    key={descriptor.id}
                    onClick={(event) => runQuickAction(peekItem, descriptor, event.currentTarget)}
                  >
                    <Zap size={13} aria-hidden="true" />
                    <span>{descriptor.label}</span>
                    <ChevronRight size={13} aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : null}
            <button type="button" className="bqa-peek-open" onClick={(event) => activateItem(peekItem, event.currentTarget)}>
              {language === 'vi' ? 'Mở' : 'Open'} <ChevronRight size={15} aria-hidden="true" />
            </button>
          </aside>
        ) : null}

        {actionItem ? (
          <div className="bqa-action-sheet" style={{ top: actionTop }} role="menu" aria-label={language === 'vi' ? 'Thao tác nhanh' : 'Quick actions'}>
            <header>
              <strong>{labelFor(actionItem, language)}</strong>
              <button type="button" onClick={() => setActionItemId('')} aria-label={language === 'vi' ? 'Đóng' : 'Close'}><X size={14} aria-hidden="true" /></button>
            </header>
            {quickActionDescriptors(actionItem, language).map((descriptor) => (
              <button
                type="button"
                role="menuitem"
                key={descriptor.id}
                onClick={(event) => runQuickAction(actionItem, descriptor, event.currentTarget)}
              >
                <Zap size={14} aria-hidden="true" />
                <span>{descriptor.label}</span>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {appSwitcherOpen && switcherItems.length ? (
        <div className="bqa-app-switcher" role="dialog" aria-label={language === 'vi' ? 'Chuyển ứng dụng nhanh' : 'Quick app switcher'}>
          <div className="bqa-app-switcher-track">
            {switcherItems.map((item, index) => {
              const Icon = item.icon || Boxes;
              const selected = index === (appSwitcherIndex % switcherItems.length);
              return (
                <div className={`bqa-app-switcher-item ${selected ? 'is-selected' : ''}`} key={item.id}>
                  <span style={{ '--bqa-accent': item.accent }}><Icon size={23} aria-hidden="true" /></span>
                  <strong>{labelFor(item, language)}</strong>
                </div>
              );
            })}
          </div>
          <small>{language === 'vi' ? 'Giữ Alt + phím huyền để chuyển · thả Alt để mở' : 'Hold Alt + grave key to cycle · release Alt to open'}</small>
        </div>
      ) : null}

      {customizing ? (
        <div className="bqa-customizer-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) { setCustomizerQuery(''); setCustomizing(false); }
        }}>
          <section className="bqa-customizer" role="dialog" aria-modal="true" aria-labelledby="bqa-customizer-title">
            <header>
              <div>
                <span className="bqa-customizer-kicker">{language === 'vi' ? 'BRIAN QUICK ACCESS' : 'BRIAN QUICK ACCESS'}</span>
                <h2 id="bqa-customizer-title">{language === 'vi' ? 'Tùy chỉnh thanh truy cập nhanh' : 'Customize quick access'}</h2>
                <p>{language === 'vi' ? 'Chọn tối đa 10 ứng dụng hoặc tính năng. Thứ tự được đồng bộ theo tài khoản.' : 'Choose up to 10 apps or features. Order syncs with your account.'}</p>
              </div>
              <button type="button" className="bqa-customizer-close" onClick={() => { setCustomizerQuery(''); setCustomizing(false); }} aria-label={language === 'vi' ? 'Đóng' : 'Close'}>
                <X size={20} aria-hidden="true" />
              </button>
            </header>

            <div className="bqa-customizer-count">
              <strong>{language === 'vi' ? 'Đã chọn' : 'Selected'}</strong>
              <span>{config.items.length}/{QUICK_ACCESS_MAX_ITEMS}</span>
            </div>

            <section className="bqa-customizer-mode" aria-label={language === 'vi' ? 'Chế độ thanh bên' : 'Sidebar mode'}>
              <button type="button" className={sidebarMode === 'auto' ? 'is-active' : ''} onClick={() => setSidebarMode('auto')}>
                <Zap size={17} aria-hidden="true" /><span><strong>Auto</strong><small>{language === 'vi' ? 'Tự thu gọn' : 'Auto hide'}</small></span>
              </button>
              <button type="button" className={sidebarMode === 'pin' ? 'is-active' : ''} onClick={() => setSidebarMode('pin')}>
                <Pin size={17} aria-hidden="true" /><span><strong>Pin</strong><small>{language === 'vi' ? 'Luôn mở' : 'Always open'}</small></span>
              </button>
              <button type="button" className={sidebarMode === 'focus' ? 'is-active' : ''} onClick={() => setSidebarMode('focus')}>
                <EyeOff size={17} aria-hidden="true" /><span><strong>Focus</strong><small>{language === 'vi' ? 'Chỉ hiện ở mép' : 'Edge only'}</small></span>
              </button>
            </section>

            <section className="bqa-personalize-panel" aria-label={language === 'vi' ? 'Cá nhân hóa thanh bên' : 'Personalize sidebar'}>
              <header>
                <strong>{language === 'vi' ? 'Cá nhân hóa' : 'Personalize'}</strong>
                <span>{language === 'vi' ? 'Kích thước · chuyển động · vị trí · mật độ' : 'Size · motion · side · density'}</span>
              </header>

              <div className="bqa-personalize-row">
                <span>{language === 'vi' ? 'Kích thước' : 'Size'}</span>
                <div className="bqa-segmented">
                  {QUICK_ACCESS_SIZES.map((size) => (
                    <button type="button" key={size} className={railSize === size ? 'is-active' : ''} onClick={() => updatePersonalization({ size })}>{size.toUpperCase()}</button>
                  ))}
                </div>
              </div>

              <div className="bqa-personalize-row">
                <span>{language === 'vi' ? 'Chuyển động' : 'Motion'}</span>
                <div className="bqa-segmented">
                  {QUICK_ACCESS_MOTIONS.map((motion) => (
                    <button type="button" key={motion} className={motionMode === motion ? 'is-active' : ''} onClick={() => updatePersonalization({ motion })}>
                      {motion === 'reduced' ? (language === 'vi' ? 'Giảm' : 'Reduced') : motion === 'normal' ? (language === 'vi' ? 'Chuẩn' : 'Normal') : (language === 'vi' ? 'Mượt' : 'Fluid')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bqa-personalize-row">
                <span>{language === 'vi' ? 'Vị trí' : 'Side'}</span>
                <div className="bqa-segmented">
                  {QUICK_ACCESS_SIDES.map((side) => (
                    <button type="button" key={side} className={railSide === side ? 'is-active' : ''} onClick={() => updatePersonalization({ side })}>
                      {side === 'left' ? (language === 'vi' ? 'Trái' : 'Left') : (language === 'vi' ? 'Phải' : 'Right')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bqa-personalize-row">
                <span>{language === 'vi' ? 'Mật độ' : 'Density'}</span>
                <div className="bqa-segmented">
                  {QUICK_ACCESS_DENSITIES.map((value) => (
                    <button type="button" key={value} className={density === value ? 'is-active' : ''} onClick={() => updatePersonalization({ density: value })}>
                      {value === 'compact' ? (language === 'vi' ? 'Gọn' : 'Compact') : (language === 'vi' ? 'Thoáng' : 'Comfort')}
                    </button>
                  ))}
                </div>
              </div>

              <label className="bqa-personalize-slider">
                <span>{language === 'vi' ? 'Độ trễ mở mép' : 'Edge hover delay'} <b>{hoverDelay} ms</b></span>
                <input type="range" min="80" max="700" step="20" value={hoverDelay} onChange={(event) => updatePersonalization({ hoverDelay: Number(event.target.value) })} />
              </label>

              <label className="bqa-personalize-toggle">
                <span>{language === 'vi' ? 'Hiện nhãn hỗ trợ' : 'Show helper labels'}</span>
                <input type="checkbox" checked={showLabels} onChange={(event) => updatePersonalization({ labels: event.target.checked })} />
              </label>
            </section>

            <div className="bqa-customizer-selected">
              {selectedItems.map((item) => {
                const Icon = item.icon || Boxes;
                return (
                  <div
                    className="bqa-customizer-row is-selected"
                    key={item.id}
                    draggable
                    onDragStart={(event) => {
                      setDragId(item.id);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', item.id);
                    }}
                    onDragEnd={() => setDragId('')}
                    onDragOver={(event) => {
                      if (!dragId) return;
                      event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      moveDraggedBefore(item.id);
                    }}
                  >
                    <GripVertical size={18} className="bqa-customizer-grip" aria-hidden="true" />
                    <span className="bqa-customizer-icon" style={{ '--bqa-accent': item.accent }}><Icon size={19} aria-hidden="true" /></span>
                    <strong>{labelFor(item, language)}</strong>
                    <button type="button" onClick={() => removeItem(item.id)} aria-label={language === 'vi' ? `Bỏ ${labelFor(item, language)}` : `Remove ${labelFor(item, language)}`}>
                      <X size={17} aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="bqa-customizer-divider">
              <span>{language === 'vi' ? 'Ứng dụng & tính năng khác' : 'Other apps & features'}</span>
            </div>

            <label className="bqa-customizer-search">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={customizerQuery}
                onChange={(event) => setCustomizerQuery(event.target.value)}
                placeholder={language === 'vi' ? 'Tìm ứng dụng hoặc tính năng…' : 'Search apps or features…'}
                aria-label={language === 'vi' ? 'Tìm ứng dụng hoặc tính năng' : 'Search apps or features'}
              />
              {customizerQuery ? (
                <button type="button" onClick={() => setCustomizerQuery('')} aria-label={language === 'vi' ? 'Xóa tìm kiếm' : 'Clear search'}>
                  <X size={16} aria-hidden="true" />
                </button>
              ) : null}
            </label>

            <div className="bqa-customizer-available">
              {filteredAvailableItems.map((item) => {
                const Icon = item.icon || Boxes;
                const disabled = config.items.length >= QUICK_ACCESS_MAX_ITEMS;
                return (
                  <button
                    type="button"
                    className="bqa-customizer-row"
                    key={item.id}
                    disabled={disabled}
                    onClick={() => addItem(item.id)}
                  >
                    <span className="bqa-customizer-icon" style={{ '--bqa-accent': item.accent }}><Icon size={19} aria-hidden="true" /></span>
                    <strong>{labelFor(item, language)}</strong>
                    <span className="bqa-add-mark">+</span>
                  </button>
                );
              })}
              {!filteredAvailableItems.length ? (
                <div className="bqa-customizer-empty">
                  {customizerNeedle
                    ? (language === 'vi' ? 'Không tìm thấy ứng dụng hoặc tính năng phù hợp.' : 'No matching app or feature.')
                    : (language === 'vi' ? 'Bạn đã chọn toàn bộ mục hiện có.' : 'You selected every available item.')}
                </div>
              ) : null}
            </div>

            <footer>
              <button type="button" className="bqa-reset" onClick={reset}>{language === 'vi' ? 'Khôi phục mặc định' : 'Reset defaults'}</button>
              <button type="button" className="bqa-done" onClick={() => { setCustomizerQuery(''); setCustomizing(false); }}>{language === 'vi' ? 'Xong' : 'Done'}</button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );

  return typeof document !== 'undefined'
    ? createPortal(quickAccessUi, document.body)
    : quickAccessUi;
}
