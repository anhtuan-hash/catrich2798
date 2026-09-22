import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppWindow,
  BookOpenCheck,
  Boxes,
  CalendarDays,
  Check,
  ClipboardCheck,
  FileText,
  Gauge,
  GripVertical,
  LayoutGrid,
  PanelLeftClose,
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

export default function GlobalQuickAccessRail({
  currentUser,
  currentRoute = 'home',
  selectedTool = null,
  language = 'vi',
  appVisibility,
}) {
  const [hovered, setHovered] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [dragId, setDragId] = useState('');
  const closeTimerRef = useRef(0);

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

  useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);

  useEffect(() => {
    if (!customizing) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setCustomizing(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [customizing]);

  if (!currentUser || currentRoute === 'home' || !catalog.length) return null;

  const selectedItems = config.items
    .map((id) => catalog.find((item) => item.id === id))
    .filter(Boolean)
    .slice(0, QUICK_ACCESS_MAX_ITEMS);

  const availableItems = catalog.filter((item) => !config.items.includes(item.id));
  const expanded = hovered || config.pinned || customizing;

  const persist = (next) => {
    setConfig(next);
    saveQuickAccessConfigToCloud(currentUser, next, allowedIds).then((result) => {
      if (result?.config) setConfig(result.config);
    });
  };

  const enter = () => {
    window.clearTimeout(closeTimerRef.current);
    setHovered(true);
  };

  const leave = () => {
    window.clearTimeout(closeTimerRef.current);
    if (config.pinned || customizing) return;
    closeTimerRef.current = window.setTimeout(() => setHovered(false), 320);
  };

  const togglePinned = () => persist({ ...config, pinned: !config.pinned });

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

  return (
    <>
      <div
        className={`bqa-root ${expanded ? 'is-open' : 'is-collapsed'} ${config.pinned ? 'is-pinned' : ''}`}
        data-quick-access="true"
        onPointerEnter={enter}
        onPointerLeave={leave}
      >
        <div className="bqa-edge-trigger" aria-hidden="true" onPointerEnter={enter} />

        <aside className="bqa-rail" aria-label={language === 'vi' ? 'Thanh truy cập nhanh' : 'Quick access'}>
          <button
            type="button"
            className="bqa-brand"
            aria-label={expanded ? (language === 'vi' ? 'Thu gọn thanh truy cập nhanh' : 'Collapse quick access') : (language === 'vi' ? 'Mở thanh truy cập nhanh' : 'Open quick access')}
            onClick={() => setHovered((value) => !value)}
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
                  onClick={(event) => runAction(item, event.currentTarget)}
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
              setCustomizing(true);
            }}
          >
            <Settings size={19} aria-hidden="true" />
          </button>
        </aside>

        <section className="bqa-panel" aria-hidden={!expanded}>
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
                  onClick={(event) => runAction(item, event.currentTarget)}
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
            <button type="button" onClick={() => setCustomizing(true)}>
              <Settings size={18} aria-hidden="true" />
              <span><strong>{language === 'vi' ? 'Tùy chỉnh lối tắt' : 'Customize shortcuts'}</strong><small>{language === 'vi' ? 'Sắp xếp, ẩn/hiện ứng dụng' : 'Reorder and choose apps'}</small></span>
            </button>
            <div className="bqa-account-note">
              <Check size={15} aria-hidden="true" />
              <span>{language === 'vi' ? 'Lưu theo tài khoản' : 'Saved to your account'}</span>
            </div>
          </footer>
        </section>
      </div>

      {customizing ? (
        <div className="bqa-customizer-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setCustomizing(false);
        }}>
          <section className="bqa-customizer" role="dialog" aria-modal="true" aria-labelledby="bqa-customizer-title">
            <header>
              <div>
                <span className="bqa-customizer-kicker">{language === 'vi' ? 'BRIAN QUICK ACCESS' : 'BRIAN QUICK ACCESS'}</span>
                <h2 id="bqa-customizer-title">{language === 'vi' ? 'Tùy chỉnh thanh truy cập nhanh' : 'Customize quick access'}</h2>
                <p>{language === 'vi' ? 'Chọn tối đa 10 ứng dụng hoặc tính năng. Thứ tự được đồng bộ theo tài khoản.' : 'Choose up to 10 apps or features. Order syncs with your account.'}</p>
              </div>
              <button type="button" className="bqa-customizer-close" onClick={() => setCustomizing(false)} aria-label={language === 'vi' ? 'Đóng' : 'Close'}>
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

            <div className="bqa-customizer-available">
              {availableItems.map((item) => {
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
              {!availableItems.length ? <div className="bqa-customizer-empty">{language === 'vi' ? 'Bạn đã chọn toàn bộ mục hiện có.' : 'You selected every available item.'}</div> : null}
            </div>

            <footer>
              <button type="button" className="bqa-reset" onClick={reset}>{language === 'vi' ? 'Khôi phục mặc định' : 'Reset defaults'}</button>
              <button type="button" className="bqa-done" onClick={() => setCustomizing(false)}>{language === 'vi' ? 'Xong' : 'Done'}</button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
