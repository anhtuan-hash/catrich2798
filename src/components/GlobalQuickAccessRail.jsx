import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AppWindow,
  BookOpenCheck,
  Boxes,
  CalendarDays,
  Check,
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
  QUICK_ACCESS_SIDES,
  QUICK_ACCESS_MOTIONS,
  QUICK_ACCESS_HOVER_DELAYS,
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

function measureQuickAccessContentRightEdge(container) {
  if (!container) return Number.NEGATIVE_INFINITY;
  const candidates = [...container.querySelectorAll(QUICK_ACCESS_COLLISION_SELECTOR)];
  let maxRight = Number.NEGATIVE_INFINITY;

  candidates.forEach((element) => {
    if (!isQuickAccessCollisionCandidate(element)) return;
    const rect = element.getBoundingClientRect();
    if (Number.isFinite(rect.right)) maxRight = Math.max(maxRight, rect.right);
  });

  return maxRight;
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
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherIndex, setSwitcherIndex] = useState(0);
  const [peekItemId, setPeekItemId] = useState('');
  const [peekTop, setPeekTop] = useState(92);
  const [actionItemId, setActionItemId] = useState('');
  const [actionTop, setActionTop] = useState(118);
  const [badges, setBadges] = useState({});
  const [liveActivities, setLiveActivities] = useState([]);
  const [dragId, setDragId] = useState('');
  const [collapsing, setCollapsing] = useState(false);
  const closeTimerRef = useRef(0);
  const collapseMotionTimerRef = useRef(0);
  const peekTimerRef = useRef(0);
  const badgeFrameRef = useRef(0);
  const magneticFrameRef = useRef(0);
  const commandInputRef = useRef(null);
  const layoutFrameRef = useRef(0);
  const layoutSettleTimerRef = useRef(0);
  const layoutVerifyTimerRef = useRef(0);
  const rootRef = useRef(null);
  const railRef = useRef(null);
  const panelRef = useRef(null);
  const selectedItemsRef = useRef([]);
  const switcherItemsRef = useRef([]);
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
  const appearance = config.appearance && typeof config.appearance === 'object' ? config.appearance : {};
  const railSize = QUICK_ACCESS_SIZES.includes(appearance.size) ? appearance.size : 'standard';
  const railSide = QUICK_ACCESS_SIDES.includes(appearance.side) ? appearance.side : 'left';
  const motionProfile = QUICK_ACCESS_MOTIONS.includes(appearance.motion) ? appearance.motion : 'standard';
  const hoverDelay = QUICK_ACCESS_HOVER_DELAYS.includes(Number(appearance.hoverDelay)) ? Number(appearance.hoverDelay) : 340;
  const pinned = sidebarMode === 'pin';
  const focusMode = sidebarMode === 'focus';
  const expanded = hovered || pinned || customizing;

  const openRail = useCallback(() => {
    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(collapseMotionTimerRef.current);
    setCollapsing(false);
    setHovered(true);
  }, []);

  const collapseRail = useCallback((force = false) => {
    if (!force && (pinned || customizing)) return;
    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(collapseMotionTimerRef.current);

    if (hovered || pinned || customizing) {
      setCollapsing(true);
      setHovered(false);
      collapseMotionTimerRef.current = window.setTimeout(() => {
        setCollapsing(false);
      }, 290);
      return;
    }

    setHovered(false);
  }, [pinned, customizing, hovered]);

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

  useEffect(() => () => {
    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(collapseMotionTimerRef.current);
    window.clearTimeout(peekTimerRef.current);
    window.cancelAnimationFrame(badgeFrameRef.current);
    window.cancelAnimationFrame(magneticFrameRef.current);
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
      setSwitcherOpen(false);
      if (!pinned && !customizing) collapseRail(false);
    };
    const onShortcut = (event) => {
      const tag = String(event.target?.tagName || '').toLowerCase();
      const editable = event.target?.isContentEditable || ['input', 'textarea', 'select'].includes(tag);
      if (event.repeat) return;

      const key = String(event.key || '').toLowerCase();
      if (switcherOpen) {
        const items = switcherItemsRef.current || [];
        if (event.key === 'Escape') {
          event.preventDefault();
          setSwitcherOpen(false);
          return;
        }
        if (items.length && ['ArrowRight', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          setSwitcherIndex((index) => (index + 1) % items.length);
          return;
        }
        if (items.length && ['ArrowLeft', 'ArrowUp'].includes(event.key)) {
          event.preventDefault();
          setSwitcherIndex((index) => (index - 1 + items.length) % items.length);
          return;
        }
        if (items.length && event.key === 'Enter') {
          event.preventDefault();
          const item = items[Math.min(switcherIndex, items.length - 1)];
          setSwitcherOpen(false);
          if (item) activateItemRef.current?.(item, null);
          return;
        }
      }

      if (!editable && event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && key === 'q') {
        const items = switcherItemsRef.current || [];
        if (items.length) {
          event.preventDefault();
          setSwitcherIndex(0);
          setSwitcherOpen(true);
          setQuickCreateOpen(false);
          setPeekItemId('');
          setActionItemId('');
        }
        return;
      }

      if (!editable && event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey && key === '`') {
        const items = switcherItemsRef.current || [];
        if (items.length) {
          event.preventDefault();
          setSwitcherOpen(true);
          setSwitcherIndex((index) => (index + 1) % items.length);
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && !event.altKey && key === 'k') {
        event.preventDefault();
        openRail();
        window.setTimeout(() => commandInputRef.current?.focus(), 40);
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
      if (event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey && key === 'q') {
        event.preventDefault();
        if (expanded && !pinned && !customizing) collapseRail(false);
        else openRail();
      }
    };

    window.addEventListener('bes-navigation-start', onNavigationStart);
    window.addEventListener('keydown', onShortcut);
    return () => {
      window.removeEventListener('bes-navigation-start', onNavigationStart);
      window.removeEventListener('keydown', onShortcut);
    };
  }, [pinned, customizing, expanded, switcherOpen, switcherIndex, collapseRail, openRail]);

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
        const reserveMode = window.innerWidth >= QUICK_ACCESS_SAFE_AREA_MIN_WIDTH && !coarsePointer;
        shell.dataset.quickAccessSafeMode = reserveMode ? 'reserve' : 'overlay';

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
  const switcherItems = [...new Map(
    [...recentItems, ...workspaceItems].map((item) => [item.id, item]),
  ).values()].slice(0, 6);

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

  const peekItem = catalog.find((item) => item.id === peekItemId) || null;
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

  const setAppearancePatch = (patch) => {
    persist({
      ...config,
      appearance: {
        size: railSize,
        side: railSide,
        motion: motionProfile,
        hoverDelay,
        ...patch,
      },
    });
  };

  const setWorkspace = (nextWorkspace) => {
    const safeWorkspace = QUICK_ACCESS_WORKSPACES.includes(nextWorkspace) ? nextWorkspace : 'all';
    persist({ ...config, workspace: safeWorkspace });
    setQuickCreateOpen(false);
    setCommandQuery('');
    setCommandActiveIndex(0);
  };

  const enter = () => {
    openRail();
  };

  const leave = () => {
    window.clearTimeout(closeTimerRef.current);
    if (pinned || customizing) return;
    closeTimerRef.current = window.setTimeout(() => collapseRail(false), hoverDelay);
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

  const togglePinned = () => setSidebarMode(pinned ? 'auto' : 'pin');

  const showPeek = (item, sourceEl) => {
    window.clearTimeout(peekTimerRef.current);
    if (!item || actionItemId) return;
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
      <div
        ref={rootRef}
        className={`bqa-root ${expanded ? 'is-open' : 'is-collapsed'} ${collapsing ? 'is-collapsing' : ''} ${pinned ? 'is-pinned' : ''} ${focusMode ? 'is-focus' : ''} ${customizing ? 'is-customizing' : ''}`}
        data-quick-access="true"
        data-sidebar-mode={sidebarMode}
        data-workspace={workspace}
        data-motion={collapsing ? 'collapsing' : (expanded ? 'open' : 'rest')}
        data-route={currentRoute}
        onPointerEnter={enter}
        onPointerLeave={leave}
        onFocusCapture={enter}
      >
        <div
          className="bqa-edge-trigger"
          aria-hidden="true"
          onPointerEnter={openRail}
          onMouseEnter={openRail}
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

          <div className="bqa-rail-items">
            {workspaceItems.map((item) => {
              const Icon = item.icon || Boxes;
              const active = activeItem(item, currentRoute, selectedTool);
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`bqa-rail-button ${active ? 'is-active' : ''}`}
                  style={{ '--bqa-accent': item.accent }}
                  title={labelFor(item, language)}
                  aria-label={labelFor(item, language)}
                  aria-current={active ? 'page' : undefined}
                  onPointerEnter={(event) => showPeek(item, event.currentTarget)}
                  onPointerLeave={hidePeek}
                  onFocus={(event) => showPeek(item, event.currentTarget)}
                  onBlur={hidePeek}
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
            className={`bqa-rail-create ${quickCreateOpen ? 'is-active' : ''}`}
            title={language === 'vi' ? 'Tạo nhanh' : 'Quick create'}
            aria-label={language === 'vi' ? 'Tạo nhanh' : 'Quick create'}
            aria-expanded={quickCreateOpen}
            onClick={() => {
              openRail();
              setCommandQuery('');
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

          <button
            type="button"
            className="bqa-rail-settings"
            title={language === 'vi' ? 'Tùy chỉnh lối tắt' : 'Customize shortcuts'}
            aria-label={language === 'vi' ? 'Tùy chỉnh lối tắt' : 'Customize shortcuts'}
            onClick={() => {
              setHovered(true);
              setCustomizerQuery('');
              setCustomizing(true);
            }}
          >
            <Settings size={19} aria-hidden="true" />
          </button>
        </aside>

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
