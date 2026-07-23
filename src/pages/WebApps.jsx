import React, { useEffect, useMemo, useRef, useState } from 'react';
import PermissionRequestButton from '../components/PermissionRequestButton.jsx';
import FlatAppIcon from '../components/FlatAppIcon.jsx';
import { getAppDesignProfile } from '../data/designProfiles.js';
import { getRoutePermissionId, getToolPermissionId, hasRouteAccess, hasToolAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import {
  DEFAULT_LAUNCHER_GROUPS,
  launcherItemId,
  launcherNavId,
  loadLauncherConfig,
  loadLauncherConfigFromCloud,
  normalizeLauncherConfig,
  resetLauncherConfigToCloud,
  saveLauncherConfigToCloud,
  subscribeLauncherConfig,
} from '../utils/launcherPreferences.js';
import { HIDDEN_APPS_FOLDER, ROUTE_APP_SHORTCUTS, appVisibilityId } from '../data/appVisibilityRegistry.js';
import { getHiddenAppIds } from '../utils/appVisibility.js';
import './WebAppsPremium.css';

const APP_ORDER = [
  'hidden-apps-vault', 'professional-hub', 'thpt-practice-hub', 'resource-library-hub',
  'lesson-plan-ai', 'textlab-activities', 'exam-studio', 'reading-studio', 'news-reader',
  'vietnam-tax', 'word2graph', 'textcare', 'student-practice', 'game-hub', 'homeroom-hub',
  'library-hub', 'practice-hub', 'games-hub', 'admin-hub',
];

const copy = {
  vi: {
    eyebrow: 'BRIAN APP LIBRARY',
    title: 'Mọi công cụ. Một không gian.',
    subtitle: 'Tìm, mở và tổ chức các ứng dụng phục vụ giảng dạy, quản lý và đánh giá trong một thư viện thống nhất.',
    search: 'Tìm ứng dụng',
    searchPlaceholder: 'Tìm theo tên, chức năng hoặc nhóm…',
    command: 'Tìm nhanh toàn hệ thống',
    all: 'Tất cả',
    open: 'Mở ứng dụng',
    locked: 'Chưa được cấp quyền',
    total: 'Ứng dụng',
    pinned: 'Đã ghim',
    nav: 'Trên thanh điều hướng',
    groups: 'Nhóm làm việc',
    featured: 'Truy cập nhanh',
    featuredSub: 'Các ứng dụng bạn đã ghim để sử dụng thường xuyên.',
    directory: 'Thư viện ứng dụng',
    directorySub: 'Duyệt theo nhóm hoặc tìm đúng công cụ bạn cần.',
    customize: 'Tùy chỉnh thư viện',
    finish: 'Thoát chỉnh sửa',
    save: 'Lưu thay đổi',
    reset: 'Khôi phục mặc định',
    saving: 'Đang lưu…',
    saved: 'Đã lưu và đồng bộ cấu hình launcher.',
    savedLocal: 'Đã lưu trên thiết bị. Cấu hình cloud hiện chưa khả dụng.',
    navLimit: 'Thanh điều hướng tối đa 12 mục.',
    createGroup: 'Tạo nhóm mới',
    groupName: 'Tên nhóm',
    create: 'Tạo nhóm',
    editorHint: 'Kéo thẻ để sắp xếp. Dùng các nút trên thẻ để ghim, ẩn, thêm vào navigation hoặc chuyển nhóm.',
    pin: 'Ghim',
    unpin: 'Bỏ ghim',
    hide: 'Ẩn',
    show: 'Hiện',
    navOn: 'Thêm vào navigation',
    navOff: 'Gỡ khỏi navigation',
    group: 'Nhóm',
    density: 'Mật độ',
    comfortable: 'Thoáng',
    compact: 'Gọn',
    noSearch: 'Không có ứng dụng phù hợp.',
    noPins: 'Chưa có ứng dụng được ghim.',
    empty: 'Nhóm này chưa có ứng dụng.',
    roleReady: 'Sẵn sàng theo quyền tài khoản',
  },
  en: {
    eyebrow: 'BRIAN APP LIBRARY',
    title: 'Every tool. One workspace.',
    subtitle: 'Find, launch and organise teaching, management and assessment applications in one coherent library.',
    search: 'Search apps',
    searchPlaceholder: 'Search by name, capability or group…',
    command: 'Search the whole system',
    all: 'All',
    open: 'Open app',
    locked: 'Permission required',
    total: 'Applications',
    pinned: 'Pinned',
    nav: 'In navigation',
    groups: 'Workflow groups',
    featured: 'Quick access',
    featuredSub: 'Applications you pinned for frequent use.',
    directory: 'Application library',
    directorySub: 'Browse by workflow or find the exact tool you need.',
    customize: 'Customise library',
    finish: 'Exit editor',
    save: 'Save changes',
    reset: 'Restore defaults',
    saving: 'Saving…',
    saved: 'Launcher settings saved and synced.',
    savedLocal: 'Saved on this device. Cloud settings are currently unavailable.',
    navLimit: 'Navigation supports up to 12 items.',
    createGroup: 'Create a group',
    groupName: 'Group name',
    create: 'Create group',
    editorHint: 'Drag cards to reorder. Use card controls to pin, hide, add to navigation or change groups.',
    pin: 'Pin',
    unpin: 'Unpin',
    hide: 'Hide',
    show: 'Show',
    navOn: 'Add to navigation',
    navOff: 'Remove from navigation',
    group: 'Group',
    density: 'Density',
    comfortable: 'Comfortable',
    compact: 'Compact',
    noSearch: 'No application matches this search.',
    noPins: 'No pinned applications yet.',
    empty: 'This group has no applications.',
    roleReady: 'Ready for your account role',
  },
};

function titleOf(item, language) {
  return language === 'vi' ? item.titleVi || item.title : item.title || item.titleVi;
}

function descriptionOf(item, language) {
  return language === 'vi' ? item.descVi || item.desc : item.desc || item.descVi;
}

function statusOf(item, language) {
  const profile = getAppDesignProfile(item.slug);
  return language === 'vi'
    ? profile.styleVi || item.statusVi || item.status || ''
    : profile.style || item.status || item.statusVi || '';
}

function targetFor(item) {
  return item.route ? `#/${item.route}` : `#/tool/${item.slug}`;
}

function launch(item, language, sourceEl) {
  const profile = getAppDesignProfile(item.slug);
  launchRoute({
    target: targetFor(item),
    label: item.icon || titleOf(item, language).slice(0, 2),
    color: profile.accent || '#1e5f3d',
    sourceEl,
  });
}

function defaultGroupOf(item) {
  if (['lesson-plan-ai', 'textcare', 'library-hub', 'resource-library-hub', 'knowledge-hub'].includes(item.slug)) return 'plan';
  if (['homeroom-hub', 'professional-hub', 'work-dashboard', 'work-hub'].includes(item.slug)) return 'manage';
  if (['textlab-activities', 'reading-studio', 'news-reader', 'vietnam-tax', 'word2graph', 'game-hub', 'games-hub'].includes(item.slug)) return 'create';
  if (['thpt-practice-hub', 'exam-studio', 'student-practice', 'practice-hub', 'assessment-core'].includes(item.slug)) return 'assess';
  return 'manage';
}

function permissionFor(item) {
  if (!item.route) return getToolPermissionId(item.slug);
  return getRoutePermissionId(item.route) || '';
}

function lockedFor(item, currentUser) {
  if (!currentUser || currentUser.role === 'admin') return false;
  if (item.adminOnly) return true;
  if (item.route) return !hasRouteAccess(currentUser, item.route, item);
  return !hasToolAccess(currentUser, item.slug);
}

function AppCard({
  item,
  language,
  currentUser,
  editMode,
  config,
  groupOptions,
  onTogglePin,
  onToggleHidden,
  onToggleNav,
  onAssignGroup,
  onDragStart,
  onDrop,
}) {
  const t = copy[language] || copy.vi;
  const profile = getAppDesignProfile(item.slug);
  const locked = lockedFor(item, currentUser);
  const permissionId = permissionFor(item);
  const itemId = launcherItemId(item);
  const navId = launcherNavId(item);
  const hidden = config.hidden.includes(itemId);
  const pinned = config.pinned.includes(itemId);
  const inNav = config.nav.includes(navId);
  const groupId = config.assignments[itemId] || defaultGroupOf(item);
  const group = groupOptions.find((entry) => entry.id === groupId);

  return (
    <article
      className={`bp-app-card ${locked ? 'is-locked' : ''} ${editMode ? 'is-editing' : ''} ${hidden ? 'is-hidden' : ''}`}
      style={{ '--app-accent': profile.accent, '--app-soft': profile.soft }}
      draggable={editMode}
      onDragStart={(event) => onDragStart?.(event, itemId)}
      onDragOver={(event) => { if (editMode) event.preventDefault(); }}
      onDrop={(event) => onDrop?.(event, itemId)}
      data-launcher-item={itemId}
    >
      {editMode ? <span className="bp-app-drag" title={language === 'vi' ? 'Kéo để sắp xếp' : 'Drag to reorder'}>⋮⋮</span> : null}

      <button
        type="button"
        className="bp-app-card-main"
        disabled={editMode}
        onClick={(event) => { if (!locked && !editMode) launch(item, language, event.currentTarget); }}
        aria-label={`${locked ? t.locked : t.open}: ${titleOf(item, language)}`}
      >
        <span className="bp-app-icon"><FlatAppIcon type={profile.icon} slug={item.slug} /></span>
        <span className="bp-app-copy">
          <small>{language === 'vi' ? group?.labelVi || group?.label : group?.label || group?.labelVi}</small>
          <strong>{titleOf(item, language)}</strong>
          <em>{descriptionOf(item, language)}</em>
        </span>
        <span className="bp-app-meta">
          <i>{statusOf(item, language)}</i>
          <b>{locked ? t.locked : t.open}<span>→</span></b>
        </span>
        <span className="bp-app-art" aria-hidden="true"><i /><i /><i /></span>
      </button>

      {editMode && !item.isHiddenFolder ? (
        <div className="bp-app-editor-controls" role="group" aria-label={`${t.customize}: ${titleOf(item, language)}`}>
          <button type="button" className={pinned ? 'active' : ''} onClick={() => onTogglePin(itemId)} title={pinned ? t.unpin : t.pin}>★</button>
          <button type="button" className={hidden ? 'active danger' : ''} onClick={() => onToggleHidden(itemId, navId)} title={hidden ? t.show : t.hide}>{hidden ? '◉' : '○'}</button>
          <button type="button" className={inNav ? 'active' : ''} onClick={() => onToggleNav(navId)} title={inNav ? t.navOff : t.navOn}>⌘</button>
          <select value={groupId} onChange={(event) => onAssignGroup(itemId, event.target.value)} aria-label={t.group}>
            {groupOptions.map((entry) => <option key={entry.id} value={entry.id}>{language === 'vi' ? entry.labelVi : entry.label}</option>)}
          </select>
        </div>
      ) : null}

      {locked && permissionId ? (
        <div className="bp-app-permission"><PermissionRequestButton currentUser={currentUser} permissionId={permissionId} item={item} language={language} /></div>
      ) : null}
    </article>
  );
}

function Stat({ value, label }) {
  return <article><strong>{value}</strong><small>{label}</small></article>;
}

export default function WebApps({ apps, language = 'vi', currentUser, appVisibility: externalAppVisibility }) {
  const t = copy[language] || copy.vi;
  const isAdmin = currentUser?.role === 'admin';
  const appVisibility = externalAppVisibility || { snapshot: {}, hiddenIds: [] };
  const globallyHiddenIds = useMemo(
    () => new Set(appVisibility?.hiddenIds || getHiddenAppIds(appVisibility?.snapshot)),
    [appVisibility?.hiddenIds?.join('|'), appVisibility?.snapshot],
  );

  const [editMode, setEditMode] = useState(false);
  const [activeGroup, setActiveGroup] = useState('all');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#1e5f3d');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [density, setDensity] = useState(() => {
    try { return localStorage.getItem('bes-launcher-density') === 'compact' ? 'compact' : 'comfortable'; }
    catch { return 'comfortable'; }
  });
  const dragItemRef = useRef('');
  const editModeRef = useRef(false);

  const safeApps = Array.isArray(apps) ? apps : [];
  const allBaseItems = useMemo(() => {
    const routeApps = ROUTE_APP_SHORTCUTS.filter((item) => !item.adminOnly || isAdmin);
    const hiddenCount = globallyHiddenIds.size;
    const folder = isAdmin ? [{
      ...HIDDEN_APPS_FOLDER,
      desc: `${hiddenCount} applications are hidden from teacher accounts.`,
      descVi: `${hiddenCount} ứng dụng đang được ẩn khỏi tài khoản giáo viên.`,
      status: `${hiddenCount} hidden`,
      statusVi: `${hiddenCount} đã ẩn`,
      isHiddenFolder: true,
    }] : [];
    const merged = [...folder, ...safeApps, ...routeApps];
    const seen = new Set();
    return merged.filter((item) => {
      const key = launcherItemId(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => {
      const ai = APP_ORDER.indexOf(a.slug);
      const bi = APP_ORDER.indexOf(b.slug);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [safeApps, isAdmin, globallyHiddenIds]);

  const baseItems = useMemo(
    () => allBaseItems.filter((item) => item.isHiddenFolder || !globallyHiddenIds.has(appVisibilityId(item))),
    [allBaseItems, globallyHiddenIds],
  );
  const itemIds = useMemo(() => allBaseItems.map(launcherItemId), [allBaseItems]);
  const [config, setConfig] = useState(() => loadLauncherConfig(itemIds));
  const [draftConfig, setDraftConfig] = useState(() => loadLauncherConfig(itemIds));

  useEffect(() => { editModeRef.current = editMode; }, [editMode]);
  useEffect(() => {
    try { localStorage.setItem('bes-launcher-density', density); } catch { /* optional */ }
  }, [density]);

  useEffect(() => {
    let active = true;
    const normalized = normalizeLauncherConfig(loadLauncherConfig(itemIds), itemIds);
    setConfig(normalized);
    setDraftConfig(normalized);
    loadLauncherConfigFromCloud(itemIds)
      .then(({ config: cloudConfig }) => {
        if (!active) return;
        const clean = normalizeLauncherConfig(cloudConfig, itemIds);
        setConfig(clean);
        if (!editModeRef.current) setDraftConfig(clean);
      })
      .catch((error) => console.warn('[Launcher] premium directory cloud fallback', error));
    const unsubscribe = subscribeLauncherConfig((next) => {
      const clean = normalizeLauncherConfig(next, itemIds);
      setConfig(clean);
      if (!editModeRef.current) setDraftConfig(clean);
    }, itemIds);
    return () => { active = false; unsubscribe(); };
  }, [itemIds.join('|')]);

  const workingConfig = normalizeLauncherConfig(editMode ? draftConfig : config, itemIds);
  const orderMap = useMemo(() => new Map(workingConfig.order.map((id, index) => [id, index])), [workingConfig.order]);
  const orderedItems = useMemo(
    () => [...baseItems].sort((a, b) => (orderMap.get(launcherItemId(a)) ?? 999) - (orderMap.get(launcherItemId(b)) ?? 999)),
    [baseItems, orderMap],
  );
  const visibleItems = orderedItems.filter((item) => editMode || !workingConfig.hidden.includes(launcherItemId(item)));
  const groupOptions = Array.isArray(workingConfig.groups) && workingConfig.groups.length ? workingConfig.groups : DEFAULT_LAUNCHER_GROUPS;
  const groupForItem = (item) => workingConfig.assignments[launcherItemId(item)] || defaultGroupOf(item);
  const groupCounts = groupOptions.reduce((acc, group) => {
    acc[group.id] = visibleItems.filter((item) => groupForItem(item) === group.id).length;
    return acc;
  }, {});

  const normalizedSearch = searchQuery.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const groupFilteredItems = activeGroup === 'all' ? visibleItems : visibleItems.filter((item) => groupForItem(item) === activeGroup);
  const filteredItems = groupFilteredItems.filter((item) => {
    if (!normalizedSearch) return true;
    const group = groupOptions.find((entry) => entry.id === groupForItem(item));
    const haystack = [titleOf(item, language), descriptionOf(item, language), item.slug, group?.label, group?.labelVi]
      .join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalizedSearch.split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
  });
  const pinnedItems = orderedItems.filter((item) => workingConfig.pinned.includes(launcherItemId(item)) && !workingConfig.hidden.includes(launcherItemId(item)));

  const patchDraft = (updater) => setDraftConfig((current) => normalizeLauncherConfig(
    typeof updater === 'function' ? updater(current) : { ...current, ...updater },
    itemIds,
  ));
  const togglePin = (id) => patchDraft((current) => ({
    ...current,
    pinned: current.pinned.includes(id) ? current.pinned.filter((value) => value !== id) : [...current.pinned, id].slice(-12),
  }));
  const toggleHidden = (id, navId) => patchDraft((current) => {
    const hiding = !current.hidden.includes(id);
    return {
      ...current,
      hidden: hiding ? [...current.hidden, id] : current.hidden.filter((value) => value !== id),
      pinned: hiding ? current.pinned.filter((value) => value !== id) : current.pinned,
      nav: hiding ? current.nav.filter((value) => value !== navId) : current.nav,
    };
  });
  const toggleNav = (navId) => patchDraft((current) => {
    if (current.nav.includes(navId)) return { ...current, nav: current.nav.filter((value) => value !== navId) };
    if (current.nav.length >= 12) { setNotice(t.navLimit); return current; }
    return { ...current, nav: [...current.nav, navId] };
  });
  const assignGroup = (id, groupId) => patchDraft((current) => ({
    ...current,
    assignments: { ...current.assignments, [id]: groupId },
  }));

  const onDragStart = (event, id) => {
    dragItemRef.current = id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  };
  const onDrop = (event, targetId) => {
    event.preventDefault();
    const sourceId = dragItemRef.current || event.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;
    patchDraft((current) => {
      const order = current.order.filter((id) => id !== sourceId);
      const targetIndex = Math.max(0, order.indexOf(targetId));
      order.splice(targetIndex, 0, sourceId);
      return { ...current, order };
    });
    dragItemRef.current = '';
  };

  const createGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    const baseId = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `group-${Date.now()}`;
    let id = baseId;
    let counter = 2;
    while (draftConfig.groups.some((group) => group.id === id)) { id = `${baseId}-${counter}`; counter += 1; }
    patchDraft((current) => ({ ...current, groups: [...current.groups, { id, label: name, labelVi: name, accent: newGroupColor }] }));
    setNewGroupName('');
    setActiveGroup(id);
  };

  const deleteGroup = (groupId) => {
    if (DEFAULT_LAUNCHER_GROUPS.some((group) => group.id === groupId)) return;
    patchDraft((current) => {
      const assignments = { ...current.assignments };
      Object.keys(assignments).forEach((itemId) => { if (assignments[itemId] === groupId) delete assignments[itemId]; });
      return { ...current, groups: current.groups.filter((group) => group.id !== groupId), assignments };
    });
    if (activeGroup === groupId) setActiveGroup('all');
  };

  const saveChanges = async () => {
    if (saving) return;
    setSaving(true);
    const result = await saveLauncherConfigToCloud(draftConfig, itemIds);
    const saved = result.config;
    setConfig(saved);
    setDraftConfig(saved);
    setEditMode(false);
    setNotice(result.cloud ? t.saved : t.savedLocal);
    setSaving(false);
    window.setTimeout(() => setNotice(''), 3200);
  };

  const restoreDefaults = async () => {
    if (saving) return;
    setSaving(true);
    const result = await resetLauncherConfigToCloud(itemIds);
    const next = result.config;
    setConfig(next);
    setDraftConfig(next);
    setActiveGroup('all');
    setNotice(result.cloud ? t.saved : t.savedLocal);
    setSaving(false);
  };

  const beginEdit = () => {
    setDraftConfig(normalizeLauncherConfig(config, itemIds));
    setEditMode(true);
    setActiveGroup('all');
    setNotice('');
  };
  const cancelEdit = () => {
    setDraftConfig(config);
    setEditMode(false);
    setNotice('');
  };

  useEffect(() => {
    const openEditor = () => { if (isAdmin) beginEdit(); };
    window.addEventListener('bes-launcher-edit', openEditor);
    return () => window.removeEventListener('bes-launcher-edit', openEditor);
  }, [isAdmin, config, itemIds.join('|')]);

  return (
    <div className={`bp-apps-page density-${density} ${editMode ? 'is-edit-mode' : ''}`} aria-label="Brian application library">
      <header className="bp-apps-hero">
        <div className="bp-apps-hero-copy">
          <span>{t.eyebrow}</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
          <small>● {t.roleReady}</small>
        </div>
        <div className="bp-apps-stats">
          <Stat value={visibleItems.length} label={t.total} />
          <Stat value={workingConfig.pinned.length} label={t.pinned} />
          <Stat value={workingConfig.nav.length} label={t.nav} />
          <Stat value={groupOptions.length} label={t.groups} />
        </div>
      </header>

      <section className="bp-apps-command-bar" aria-label={t.search}>
        <label className="bp-apps-search">
          <span aria-hidden="true">⌕</span>
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t.searchPlaceholder} aria-label={t.search} />
          {searchQuery ? <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search">×</button> : <kbd>⌘K</kbd>}
        </label>
        <button type="button" className="bp-apps-command" onClick={() => window.dispatchEvent(new CustomEvent('bes-command-palette-open'))}><span>⌘</span><b>{t.command}</b><small>⌘K</small></button>
        <div className="bp-apps-density" aria-label={t.density}>
          <span>{t.density}</span>
          <button type="button" className={density === 'comfortable' ? 'active' : ''} onClick={() => setDensity('comfortable')} title={t.comfortable}>▦</button>
          <button type="button" className={density === 'compact' ? 'active' : ''} onClick={() => setDensity('compact')} title={t.compact}>▦▦</button>
        </div>
        {isAdmin ? <button type="button" className={`bp-apps-edit-trigger ${editMode ? 'active' : ''}`} onClick={editMode ? cancelEdit : beginEdit}>{editMode ? t.finish : t.customize}</button> : null}
      </section>

      {editMode && isAdmin ? (
        <section className="bp-apps-editor">
          <div><strong>{t.customize}</strong><p>{t.editorHint}</p></div>
          <div className="bp-apps-create-group">
            <input value={newGroupName} onChange={(event) => setNewGroupName(event.target.value.slice(0, 40))} placeholder={t.groupName} onKeyDown={(event) => { if (event.key === 'Enter') createGroup(); }} />
            <input type="color" value={newGroupColor} onChange={(event) => setNewGroupColor(event.target.value)} aria-label="Group color" />
            <button type="button" onClick={createGroup} disabled={!newGroupName.trim()}>＋ {t.create}</button>
          </div>
          <div className="bp-apps-editor-actions">
            <button type="button" onClick={restoreDefaults} disabled={saving}>{t.reset}</button>
            <button type="button" className="primary" onClick={saveChanges} disabled={saving}>{saving ? t.saving : t.save}</button>
          </div>
          <div className="bp-apps-group-manager">
            {groupOptions.map((group) => (
              <span key={group.id} style={{ '--group-accent': group.accent }}><i /><b>{language === 'vi' ? group.labelVi : group.label}</b>{!DEFAULT_LAUNCHER_GROUPS.some((item) => item.id === group.id) ? <button type="button" onClick={() => deleteGroup(group.id)} aria-label="Delete group">×</button> : null}</span>
            ))}
          </div>
          {notice ? <div className="bp-apps-notice">{notice}</div> : null}
        </section>
      ) : null}

      {pinnedItems.length ? (
        <section className="bp-apps-featured">
          <header><div><span>PINNED</span><h2>{t.featured}</h2><p>{t.featuredSub}</p></div></header>
          <div className="bp-apps-featured-row">
            {pinnedItems.map((item) => {
              const profile = getAppDesignProfile(item.slug);
              return (
                <button key={`pin-${item.slug}`} type="button" style={{ '--pin-accent': profile.accent, '--pin-soft': profile.soft }} onClick={(event) => launch(item, language, event.currentTarget)}>
                  <span><FlatAppIcon type={profile.icon} slug={item.slug} /></span><strong>{titleOf(item, language)}</strong><b>→</b>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="bp-apps-directory">
        <header className="bp-apps-section-heading">
          <div><span>APP DIRECTORY</span><h2>{t.directory}</h2><p>{t.directorySub}</p></div>
        </header>

        <nav className="bp-apps-group-tabs" aria-label={t.groups}>
          <button type="button" className={activeGroup === 'all' ? 'active' : ''} onClick={() => setActiveGroup('all')}><b>{t.all}</b><small>{visibleItems.length}</small></button>
          {groupOptions.map((group) => (
            <button key={group.id} type="button" className={activeGroup === group.id ? 'active' : ''} style={{ '--group-accent': group.accent }} onClick={() => setActiveGroup(group.id)}><b>{language === 'vi' ? group.labelVi : group.label}</b><small>{groupCounts[group.id] || 0}</small></button>
          ))}
        </nav>

        <main className="bp-apps-grid" aria-label="Applications">
          {filteredItems.map((item) => (
            <AppCard
              key={`${item.route || 'tool'}-${item.slug}`}
              item={item}
              language={language}
              currentUser={currentUser}
              editMode={editMode}
              config={workingConfig}
              groupOptions={groupOptions}
              onTogglePin={togglePin}
              onToggleHidden={toggleHidden}
              onToggleNav={toggleNav}
              onAssignGroup={assignGroup}
              onDragStart={onDragStart}
              onDrop={onDrop}
            />
          ))}
          {!filteredItems.length ? <div className="bp-apps-empty"><span>⌕</span><strong>{searchQuery ? t.noSearch : t.empty}</strong></div> : null}
        </main>
      </section>

      {!pinnedItems.length ? <div className="bp-apps-no-pins">{t.noPins}</div> : null}
    </div>
  );
}
