import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AppWindow,
  BookOpenCheck,
  Boxes,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Command,
  Eye,
  MoreHorizontal,
  FileText,
  Gauge,
  GripVertical,
  LayoutGrid,
  Search,
  Pin,
  PinOff,
  Settings,
  ShieldCheck,
  Star,
  UsersRound,
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
  createDefaultQuickAccessConfig,
  loadQuickAccessConfig,
  loadQuickAccessConfigFromCloud,
  saveQuickAccessConfigToCloud,
  subscribeQuickAccessConfig,
  loadQuickAccessRecent,
  pushQuickAccessRecent,
} from '../utils/quickAccessPreferences.js';
import './GlobalQuickAccessRail.css';

const QUICK_ACCESS_BADGE_EVENT = 'bes-quick-access-badges';
const QUICK_ACCESS_PEEK_DELAY = 320;

function normalizeBadgeValue(value) {
  if (value === null || value === undefined || value === false || value === 0 || value === '0') return '';
  if (typeof value === 'number') return value > 99 ? '99+' : String(Math.max(0, Math.round(value)));
  const text = String(value).trim();
  return text.length > 3 ? text.slice(0, 3) : text;
}

function itemDescription(item, language) {
  const vi = {
    'route:dashboard': 'Tổng quan công việc và lịch trong ngày.',
    'route:apps': 'Mở kho ứng dụng dành cho giáo viên.',
    'route:homeroom': 'Hồ sơ lớp, học sinh và công tác chủ nhiệm.',
    'tool:gradebook-studio': 'Quản lý điểm và dữ liệu học tập.',
    'action:reports': 'Theo dõi và tổng hợp báo cáo chuyên môn.',
    'action:ttcm': 'Không gian làm việc của tổ chuyên môn.',
    'action:attendance': 'Mở công cụ điểm danh nhanh.',
    'action:schedule': 'Lịch và kế hoạch làm việc của tổ.',
    'route:assessment-core': 'Ngân hàng câu hỏi và cấu trúc đề.',
    'route:resource-library': 'Kho tài liệu và học liệu dùng chung.',
  };
  const en = {
    'route:dashboard': 'Daily work and schedule overview.',
    'route:apps': 'Open the teacher app directory.',
    'route:homeroom': 'Class records, students and homeroom tools.',
    'tool:gradebook-studio': 'Manage grades and learning records.',
    'action:reports': 'Professional reports and summaries.',
    'action:ttcm': 'Department workspace.',
    'action:attendance': 'Open fast attendance.',
    'action:schedule': 'Department work schedule.',
    'route:assessment-core': 'Question bank and exam structures.',
    'route:resource-library': 'Shared resources and documents.',
  };
  return (language === 'vi' ? vi : en)[item?.id]
    || (language === 'vi' ? 'Mở nhanh ứng dụng hoặc tính năng này.' : 'Quickly open this app or feature.');
}

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
  const [dragId, setDragId] = useState('');
  const [collapsing, setCollapsing] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [recentIds, setRecentIds] = useState([]);
  const [badges, setBadges] = useState({});
  const [peekItemId, setPeekItemId] = useState('');
  const [actionMenuItemId, setActionMenuItemId] = useState('');
  const closeTimerRef = useRef(0);
  const peekTimerRef = useRef(0);
  const collapseMotionTimerRef = useRef(0);
  const layoutFrameRef = useRef(0);
  const layoutSettleTimerRef = useRef(0);
  const layoutVerifyTimerRef = useRef(0);
  const rootRef = useRef(null);
  const railRef = useRef(null);
  const panelRef = useRef(null);
  const commandInputRef = useRef(null);

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
  const mode = ['auto', 'pin', 'focus'].includes(config.mode)
    ? config.mode
    : (config.pinned ? 'pin' : 'auto');
  const isPinned = mode === 'pin';
  const selectedItems = useMemo(() => config.items
    .map((id) => catalog.find((item) => item.id === id))
    .filter(Boolean)
    .slice(0, QUICK_ACCESS_MAX_ITEMS), [config.items, catalog]);
  const recentItems = useMemo(() => recentIds
    .map((id) => catalog.find((item) => item.id === id))
    .filter(Boolean)
    .slice(0, 3), [recentIds, catalog]);
  const commandNeedle = commandQuery.trim().toLocaleLowerCase(language === 'vi' ? 'vi-VN' : 'en-US');
  const commandResults = useMemo(() => {
    if (!commandNeedle) return [];
    return catalog
      .filter((item) => `${item.label || ''} ${item.labelVi || ''} ${item.id || ''}`
        .toLocaleLowerCase(language === 'vi' ? 'vi-VN' : 'en-US')
        .includes(commandNeedle))
      .slice(0, 8);
  }, [catalog, commandNeedle, language]);

  const expanded = hovered || isPinned || customizing;

  const openRail = useCallback(() => {
    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(collapseMotionTimerRef.current);
    setCollapsing(false);
    setHovered(true);
  }, []);

  const collapseRail = useCallback((force = false) => {
    if (!force && (isPinned || customizing)) return;
    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(collapseMotionTimerRef.current);

    if (hovered || isPinned || customizing) {
      setCollapsing(true);
      setHovered(false);
      collapseMotionTimerRef.current = window.setTimeout(() => {
        setCollapsing(false);
      }, 290);
      return;
    }

    setHovered(false);
  }, [isPinned, customizing, hovered]);

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
  }, []);

  useEffect(() => {
    setRecentIds(loadQuickAccessRecent(currentUser, allowedIds));
  }, [currentUser?.id, currentUser?.authId, currentUser?.email, allowedKey]);

  useEffect(() => {
    const currentItem = catalog.find((item) => activeItem(item, currentRoute, selectedTool));
    if (!currentItem) return;
    setRecentIds(pushQuickAccessRecent(currentUser, currentItem.id, allowedIds));
  }, [currentRoute, selectedTool?.slug, currentUser?.id, allowedKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const initial = window.__BRIAN_QUICK_ACCESS_BADGES__;
    if (initial && typeof initial === 'object') setBadges(initial);

    const onBadges = (event) => {
      const detail = event?.detail;
      if (!detail) return;
      if (detail.id) {
        setBadges((current) => ({ ...current, [String(detail.id)]: detail.value }));
        return;
      }
      const patch = detail.badges && typeof detail.badges === 'object' ? detail.badges : detail;
      if (patch && typeof patch === 'object') {
        setBadges((current) => ({ ...current, ...patch }));
      }
    };

    window.addEventListener(QUICK_ACCESS_BADGE_EVENT, onBadges);
    return () => window.removeEventListener(QUICK_ACCESS_BADGE_EVENT, onBadges);
  }, []);

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
    if (!hovered || isPinned || customizing || typeof document === 'undefined') return undefined;

    const onOutsidePointerDown = (event) => {
      if (event.target?.closest?.('.bqa-root')) return;
      collapseRail(false);
    };
    const onEscape = (event) => {
      if (event.key === 'Escape') {
        setActionMenuItemId('');
        setPeekItemId('');
        setCommandQuery('');
        collapseRail(false);
      }
    };

    document.addEventListener('pointerdown', onOutsidePointerDown, true);
    window.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onOutsidePointerDown, true);
      window.removeEventListener('keydown', onEscape);
    };
  }, [hovered, isPinned, customizing, collapseRail]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onNavigationStart = () => {
      if (!isPinned && !customizing) collapseRail(false);
    };
    const onShortcut = (event) => {
      const tag = String(event.target?.tagName || '').toLowerCase();
      const editable = event.target?.isContentEditable || ['input', 'textarea', 'select'].includes(tag);
      if (event.repeat) return;

      const key = String(event.key || '').toLowerCase();
      if ((event.metaKey || event.ctrlKey) && !event.altKey && key === 'k') {
        event.preventDefault();
        openRail();
        setCommandQuery('');
        window.setTimeout(() => commandInputRef.current?.focus(), 30);
        return;
      }

      if (!editable && event.altKey && !event.ctrlKey && !event.metaKey && key === 'q') {
        event.preventDefault();
        if (expanded && !isPinned && !customizing) collapseRail(false);
        else openRail();
        return;
      }

      if (!editable && event.altKey && !event.ctrlKey && !event.metaKey && /^[1-9]$/.test(key)) {
        const item = selectedItems[Number(key) - 1];
        if (!item) return;
        event.preventDefault();
        setRecentIds(pushQuickAccessRecent(currentUser, item.id, allowedIds));
        runAction(item, document.querySelector(`[data-bqa-item-id="${item.id}"]`));
      }
    };

    window.addEventListener('bes-navigation-start', onNavigationStart);
    window.addEventListener('keydown', onShortcut);
    return () => {
      window.removeEventListener('bes-navigation-start', onNavigationStart);
      window.removeEventListener('keydown', onShortcut);
    };
  }, [isPinned, customizing, expanded, collapseRail, openRail, selectedItems, currentUser?.id, allowedKey]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    const root = rootRef.current;
    const shell = document.querySelector('.app-shell');
    const main = shell?.querySelector?.(':scope > #bes-main-content');
    const safeFrame = main?.querySelector?.(':scope > .bqa-content-safe-frame');
    const footer = shell?.querySelector?.(':scope > footer[data-app-shell-footer="true"]');
    if (!root || !shell || !main || !safeFrame) return undefined;

    shell.dataset.quickAccessState = isPinned ? 'pinned' : 'rest';

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

        const pinnedBoundary = isPinned
          ? rootRect.left + railWidth + 8 + panelWidth
          : collapsedBoundary;

        const safeBoundary = (isPinned ? pinnedBoundary : collapsedBoundary) + QUICK_ACCESS_SAFE_GAP;
        const maxShift = isPinned ? QUICK_ACCESS_SAFE_MAX_PINNED : QUICK_ACCESS_SAFE_MAX_COLLAPSED;
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

          if (stillOccluded && !isPinned) {
            shell.dataset.quickAccessSafeMode = 'overlay';
            clearSafeArea();
          } else {
            shell.dataset.quickAccessSafeMode = 'reserve';
          }
        }, 330);

        shell.dataset.quickAccessState = isPinned ? 'pinned' : 'rest';

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
    isPinned,
    allowedKey,
    appVisibility?.ready,
  ]);

  if (!currentUser || currentRoute === 'home' || !catalog.length) return null;

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

  const enter = () => {
    openRail();
  };

  const leave = () => {
    window.clearTimeout(closeTimerRef.current);
    if (isPinned || customizing) return;
    closeTimerRef.current = window.setTimeout(() => collapseRail(false), 340);
  };

  const recordRecent = (item) => {
    if (!item?.id) return;
    setRecentIds(pushQuickAccessRecent(currentUser, item.id, allowedIds));
  };

  const activateItem = (item, sourceEl) => {
    recordRecent(item);
    setActionMenuItemId('');
    setPeekItemId('');
    runAction(item, sourceEl);
    if (!isPinned) collapseRail(false);
  };

  const setMode = (nextMode) => {
    const modeValue = ['auto', 'pin', 'focus'].includes(nextMode) ? nextMode : 'auto';
    persist({ ...config, mode: modeValue, pinned: modeValue === 'pin' });
    if (modeValue === 'pin') openRail();
    if (modeValue === 'focus') collapseRail(true);
  };

  const togglePinned = () => setMode(isPinned ? 'auto' : 'pin');

  const schedulePeek = (itemId) => {
    window.clearTimeout(peekTimerRef.current);
    peekTimerRef.current = window.setTimeout(() => {
      setPeekItemId(itemId);
    }, QUICK_ACCESS_PEEK_DELAY);
  };

  const cancelPeek = () => {
    window.clearTimeout(peekTimerRef.current);
    setPeekItemId('');
  };

  const promoteItem = (id) => {
    if (!id || config.items[0] === id) return;
    const next = [id, ...config.items.filter((itemId) => itemId !== id)];
    persist({ ...config, items: next.slice(0, QUICK_ACCESS_MAX_ITEMS) });
  };

  const runQuickAction = (item, action, sourceEl) => {
    if (!item || !action) return;
    if (action === 'open') {
      activateItem(item, sourceEl);
      return;
    }
    if (action === 'schedule') {
      recordRecent(item);
      openTtcm('schedule');
    } else if (action === 'attendance') {
      recordRecent(item);
      runAction({ action: 'attendance' }, sourceEl);
    } else if (action === 'promote') {
      promoteItem(item.id);
    } else if (action === 'remove') {
      removeItem(item.id);
    }
    setActionMenuItemId('');
  };

  const quickActionsFor = (item) => {
    const actions = [
      { id: 'open', label: language === 'vi' ? 'Mở ứng dụng' : 'Open app' },
    ];
    if (item?.id === 'action:ttcm' || item?.id === 'route:dashboard') {
      actions.push({ id: 'schedule', label: language === 'vi' ? 'Mở kế hoạch' : 'Open schedule' });
    }
    if (item?.id === 'route:homeroom') {
      actions.push({ id: 'attendance', label: language === 'vi' ? 'Điểm danh nhanh' : 'Quick attendance' });
    }
    if (config.items.includes(item?.id) && config.items[0] !== item?.id) {
      actions.push({ id: 'promote', label: language === 'vi' ? 'Đưa lên đầu' : 'Move to top' });
    }
    if (config.items.includes(item?.id)) {
      actions.push({ id: 'remove', label: language === 'vi' ? 'Bỏ khỏi thanh' : 'Remove from rail' });
    }
    return actions;
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

  const quickAccessUi = (
    <>
      <div
        ref={rootRef}
        className={`bqa-root ${expanded ? 'is-open' : 'is-collapsed'} ${collapsing ? 'is-collapsing' : ''} ${config.pinned ? 'is-pinned' : ''} ${customizing ? 'is-customizing' : ''}`}
        data-quick-access="true"
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
              if (expanded && !config.pinned && !customizing) collapseRail(false);
              else openRail();
            }}
          >
            <span aria-hidden="true">B</span>
          </button>

          <div className="bqa-rail-items">
            {selectedItems.map((item) => {
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
                  onClick={(event) => activateItem(item, event.currentTarget)}
                >
                  <Icon size={20} strokeWidth={2} aria-hidden="true" />
                </button>
              );
            })}
          </div>

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
              <strong>{language === 'vi' ? 'Thanh truy cập nhanh' : 'Quick access'}</strong>
              <span>{language === 'vi' ? `Tối đa ${QUICK_ACCESS_MAX_ITEMS} ứng dụng · Rê chuột để mở` : `Up to ${QUICK_ACCESS_MAX_ITEMS} apps · Hover to open`}</span>
            </div>
            <button
              type="button"
              className={`bqa-pin ${config.pinned ? 'is-active' : ''}`}
              aria-pressed={config.pinned}
              title={config.pinned ? (language === 'vi' ? 'Bỏ ghim' : 'Unpin') : (language === 'vi' ? 'Ghim thanh' : 'Pin rail')}
              onClick={togglePinned}
            >
              {config.pinned ? <PinOff size={18} aria-hidden="true" /> : <Pin size={18} aria-hidden="true" />}
            </button>
          </header>

          <div className="bqa-panel-list" role="list">
            {selectedItems.map((item) => {
              const Icon = item.icon || Boxes;
              const active = activeItem(item, currentRoute, selectedTool);
              return (
                <button
                  type="button"
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
                    moveDraggedBefore(item.id);
                  }}
                  onClick={(event) => activateItem(item, event.currentTarget)}
                >
                  <span className="bqa-item-icon"><Icon size={20} strokeWidth={2} aria-hidden="true" /></span>
                  <span className="bqa-item-label">{labelFor(item, language)}</span>
                  {active ? <Check className="bqa-item-check" size={17} aria-hidden="true" /> : null}
                  <GripVertical className="bqa-item-grip" size={17} aria-hidden="true" />
                </button>
              );
            })}
          </div>

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
