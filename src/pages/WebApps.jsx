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
import { UILaunchGrid, UILaunchHero, UILaunchPage, UILaunchPinned, UILaunchToolbar } from '../ui-core/components/UILaunch.jsx';
import { getWorkspaceById, getWorkspaceFilterFromHash, workspaceMatchesItem } from '../ui-core/runtime/workspaceRegistry.js';

const APP_ORDER = [
  'hidden-apps-vault',   'resource-library-hub', 'lesson-plan-ai', 'worksheet-factory', 'textlab-activities', 'exam-studio', 'reading-studio',
  'news-reader', 'smart-id', 'vietnam-tax', 'speaking-studio', 'word2graph', 'textcare', 'student-practice', 'game-hub',
  'department-workspace', 'homeroom-hub', 'library-hub', 'practice-hub', 'games-hub', 'admin-hub',
];

const ROUTE_APPS = ROUTE_APP_SHORTCUTS;

const copy = {
  vi: {
    brand: 'Brian English', kicker: 'Creative App Directory', titleA: 'cửa sổ', titleB: 'ứng dụng', titleC: 'sáng tạo',
    subtitle: 'Kéo thả, ghim, nhóm và chọn ứng dụng xuất hiện trên thanh điều hướng. Mỗi thẻ vẫn giữ màu nhận diện riêng và không kéo sát hai viền màn hình.',
    open: 'Mở ứng dụng', locked: 'Cần quyền', aiOn: 'AI sẵn sàng', aiOff: 'Cài AI', role: 'Vai trò', total: 'Công cụ',
    pinned: 'Ứng dụng đã ghim', flow: 'Các ứng dụng yêu thích được truy cập nhanh tại đây.', customize: 'Tùy biến ứng dụng', finish: 'Thoát chỉnh sửa',
    save: 'Lưu thay đổi', reset: 'Khôi phục mặc định', all: 'Tất cả', hidden: 'Đã ẩn', addGroup: 'Tạo nhóm ứng dụng',
    groupName: 'Tên nhóm mới', create: 'Tạo nhóm', dragHint: 'Kéo thẻ để sắp xếp · dùng các nút trên thẻ để ghim, ẩn, đưa lên thanh điều hướng hoặc đổi nhóm.',
    pin: 'Ghim', unpin: 'Bỏ ghim', hide: 'Ẩn', show: 'Hiện', navOn: 'Đưa lên thanh điều hướng', navOff: 'Gỡ khỏi thanh điều hướng',
    group: 'Nhóm', saved: 'Đã lưu và đồng bộ bố cục ứng dụng toàn hệ thống.', savedLocal: 'Đã lưu bố cục ứng dụng trên thiết bị. Hãy chạy migration để đồng bộ toàn hệ thống.', saving: 'Đang lưu…', navLimit: 'Thanh điều hướng tối đa 12 mục.', empty: 'Nhóm này chưa có ứng dụng.',
    search: 'Tìm ứng dụng', searchPlaceholder: 'Nhập tên, chức năng hoặc nhóm ứng dụng…', density: 'Mật độ', comfortable: 'Thoáng', compact: 'Gọn', command: 'Tìm nhanh toàn hệ thống', noSearch: 'Không có ứng dụng phù hợp với từ khóa.',
    workspaceFilter: 'Đang lọc theo không gian', clearWorkspace: 'Hiện tất cả ứng dụng',
    nav: { home: 'Trang chủ', apps: 'Ứng dụng', games: 'Trò chơi', admin: 'Quản trị' },
  },
  en: {
    brand: 'Brian English', kicker: 'Creative App Directory', titleA: 'creative', titleB: 'app', titleC: 'windows',
    subtitle: 'Drag, pin, group and choose the apps shown in the global navigation while preserving each app’s visual identity and balanced page margins.',
    open: 'Open app', locked: 'Locked', aiOn: 'AI ready', aiOff: 'Set up AI', role: 'Role', total: 'Tools',
    pinned: 'Pinned apps', flow: 'Favorite apps stay within quick reach.', customize: 'Customize apps', finish: 'Exit editor', save: 'Save changes',
    reset: 'Restore defaults', all: 'All', hidden: 'Hidden', addGroup: 'Create app group', groupName: 'New group name', create: 'Create group',
    dragHint: 'Drag cards to reorder. Use card controls to pin, hide, add to navigation or move between groups.', pin: 'Pin', unpin: 'Unpin',
    hide: 'Hide', show: 'Show', navOn: 'Add to navigation', navOff: 'Remove from navigation', group: 'Group', saved: 'App layout saved and synced.', savedLocal: 'App layout saved on this device. Run the migration for system-wide sync.', saving: 'Saving…',
    navLimit: 'The navigation supports up to 12 items.', empty: 'No apps in this group yet.',
    search: 'Search apps', searchPlaceholder: 'Type an app, feature or group…', density: 'Density', comfortable: 'Comfortable', compact: 'Compact', command: 'Search the whole system', noSearch: 'No app matches this search.',
    workspaceFilter: 'Workspace filter', clearWorkspace: 'Show all apps',
    nav: { home: 'Home', apps: 'Apps', games: 'Games', admin: 'Admin' },
  },
};


function AppsHeroArtwork({ language }) {
  const labels = language === 'vi'
    ? { safe: 'An toàn', safeSub: 'Quyền truy cập được kiểm soát', fast: 'Nhanh chóng', fastSub: 'Mở ứng dụng chỉ với 1 cú nhấp', drag: 'Kéo thả linh hoạt', color: 'Màu sắc nhận diện riêng', sync: 'Đồng bộ mọi thiết bị', sort: 'Sắp xếp thông minh' }
    : { safe: 'Secure', safeSub: 'Controlled access', fast: 'Fast', fastSub: 'Open apps in one click', drag: 'Flexible drag & drop', color: 'Distinct app colors', sync: 'Sync across devices', sort: 'Smart sorting' };
  const apps = [
    { key: 'document', label: 'WS', color: '#9C6BE8' },
    { key: 'writing', label: 'WR', color: '#62A8F0' },
    { key: 'users', label: 'CL', color: '#F3A45C' },
    { key: 'folder', label: 'LB', color: '#72BF72' },
    { key: 'ai', label: 'AI', color: '#8E72DE' },
    { key: 'game', label: 'GM', color: '#F07476' },
    { key: 'settings', label: 'ST', color: '#8B8583' },
  ];
  return (
    <div className="apps-hero-visual" aria-hidden="true">
      <span className="apps-hero-spark spark-a">✦</span><span className="apps-hero-spark spark-b">✦</span><span className="apps-hero-spark spark-c">✦</span>
      <div className="apps-hero-browser">
        <div className="apps-hero-browser-top"><i /><i /><i /><span /></div>
        <div className="apps-hero-browser-grid">
          {apps.map((app) => <span key={app.key} className="apps-hero-browser-app" style={{ '--hero-app': app.color }}><b>{app.label}</b></span>)}
        </div>
      </div>
      <div className="apps-hero-folder">
        <div className="apps-hero-folder-tab" />
        <div className="apps-hero-folder-body">
          <span className="apps-hero-folder-star">★</span>
          <div className="apps-hero-folder-tabs">
            <span><b>TR</b> Trang chủ</span><span><b>GB</b> Grammar</span><span><b>WS</b> Writing</span><span><b>CH</b> Chủ nhiệm</span>
          </div>
          <span className="apps-hero-hand">☝</span>
        </div>
      </div>
      <div className="apps-hero-side-card safe"><b>♢</b><strong>{labels.safe}</strong><small>{labels.safeSub}</small></div>
      <div className="apps-hero-side-card fast"><b>ϟ</b><strong>{labels.fast}</strong><small>{labels.fastSub}</small></div>
      <div className="apps-hero-floating-grid">▦</div>
      <div className="apps-hero-feature-row">
        <span><b>☝</b>{labels.drag}</span><span><b>◉</b>{labels.color}</span><span><b>☁</b>{labels.sync}</span><span><b>▤</b>{labels.sort}</span>
      </div>
    </div>
  );
}

function titleOf(item, language) { return language === 'vi' ? item.titleVi || item.title : item.title; }
function descOf(item, language) { return language === 'vi' ? item.descVi || item.desc : item.desc; }
function statusOf(item, language) {
  const profile = getAppDesignProfile(item.slug);
  return language === 'vi' ? profile.styleVi || item.statusVi || item.status : profile.style || item.status;
}

function shortDesc(item, language) {
  const vi = {
    'lesson-plan-ai': 'Giáo án, học liệu, năng lực số.', 'worksheet-factory': 'Tạo worksheet từ file, text hoặc chủ đề.',
    'textlab-activities': '18 hoạt động tương tác từ văn bản.', textcare: 'Chuẩn hoá văn bản hành chính.',
    'reading-studio': 'Bài đọc, câu hỏi và từ vựng.', 'news-reader': 'Tin giáo dục Việt Nam và báo tiếng Anh.',
    'smart-id': 'Ảnh thẻ AI, crop chuẩn và tờ in 10 × 15.', 'vietnam-tax': 'Thuế TNCN, bảo hiểm và lương Net 2026.',
    'speaking-studio': 'Thẻ nói, debate, presentation.', word2graph: 'Word family và collocation.',
    'exam-studio': 'Đề kiểm tra, cloze, word form.', 'student-practice': 'Bài luyện có chấm điểm.',
    'department-workspace': 'Lịch, hồ sơ, nhiệm vụ tổ.', 'homeroom-hub': 'Học sinh, điểm danh và phụ huynh.',
    'resource-library-hub': 'Kho học liệu dùng chung trên Drive TTCM.', 'library-hub': 'Kho tài liệu và bài đã lưu.',
    'practice-hub': 'Giao bài và theo dõi tiến độ.', 'games-hub': 'Game lớp học và launcher.', 'admin-hub': 'Người dùng, quyền, cấu hình.',
  };
  const en = {
    'lesson-plan-ai': 'Lessons, materials and competencies.', 'worksheet-factory': 'Worksheets from files, text or topics.',
    'textlab-activities': '18 interactive activities from text.', textcare: 'Clean official documents.',
    'reading-studio': 'Readings and vocabulary.', 'news-reader': 'Vietnam education and English news.',
    'smart-id': 'AI ID portraits and exact-size print sheets.', 'vietnam-tax': 'Vietnam PIT, insurance and 2026 net salary.',
    'speaking-studio': 'Speaking cards and debates.', word2graph: 'Word families and collocations.',
    'exam-studio': 'Tests, cloze and word form.', 'student-practice': 'Scored learner practice.',
    'department-workspace': 'Schedules, files and tasks.', 'homeroom-hub': 'Students, attendance and parents.',
    'resource-library-hub': 'Shared department Drive resources.', 'library-hub': 'Saved teaching resources.',
    'practice-hub': 'Assign and track practice.', 'games-hub': 'Classroom game launchers.', 'admin-hub': 'Users and permissions.',
  };
  return (language === 'vi' ? vi[item.slug] : en[item.slug]) || descOf(item, language);
}

function targetFor(item) { return item.route ? `#/${item.route}` : `#/tool/${item.slug}`; }
function launch(target, label, color, sourceEl = null) { launchRoute({ target, label, color: color || '#191515', sourceEl }); }

function defaultGroupOf(item) {
  if (['lesson-plan-ai', 'textcare', 'library-hub', 'resource-library-hub'].includes(item.slug)) return 'plan';
  if (item.slug === 'homeroom-hub') return 'manage';
  if (['textlab-activities', 'worksheet-factory', 'reading-studio', 'news-reader', 'smart-id', 'vietnam-tax', 'speaking-studio', 'word2graph', 'game-hub', 'games-hub'].includes(item.slug)) return 'create';
  if (['exam-studio', 'student-practice', 'practice-hub'].includes(item.slug)) return 'assess';
  return 'manage';
}

function permissionFor(item) {
  if (!item.route) return getToolPermissionId(item.slug);
  if (item.route === 'department' && item.slug) return getToolPermissionId(item.slug);
  return getRoutePermissionId(item.route) || '';
}

function lockedFor(item, currentUser) {
  if (!currentUser || currentUser.role === 'admin') return false;
  if (item.adminOnly) return true;
  if (item.route) return !hasRouteAccess(currentUser, item.route, item);
  return !hasToolAccess(currentUser, item.slug);
}

function AppWindowCard({ item, language, currentUser, editMode, config, groupOptions, onTogglePin, onToggleHidden, onToggleNav, onAssignGroup, onDragStart, onDrop }) {
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

  return (
    <article
      className={`bui-launch-tile flat-app-window-card flat-app-window-drawer ${item.isHiddenFolder ? 'hidden-app-folder-card' : ''} ${locked ? 'is-locked' : ''} ${editMode ? 'is-launcher-editing' : ''} ${hidden ? 'is-launcher-hidden' : ''}`}
      style={{ '--app-accent': profile.accent, '--app-soft': profile.soft, '--app-ink': profile.ink }}
      draggable={editMode}
      onDragStart={(event) => onDragStart?.(event, itemId)}
      onDragOver={(event) => { if (editMode) event.preventDefault(); }}
      onDrop={(event) => onDrop?.(event, itemId)}
      data-launcher-item={itemId}
    >
      {editMode && <div className="launcher-drag-handle" title={language === 'vi' ? 'Kéo để sắp xếp' : 'Drag to reorder'}>⋮⋮</div>}
      <button
        type="button"
        className="flat-app-window-launch"
        onClick={(event) => { if (!locked && !editMode) launch(targetFor(item), item.icon || titleOf(item, language).slice(0, 2), profile.accent, event.currentTarget); }}
        aria-label={`${t.open}: ${titleOf(item, language)}`}
        disabled={editMode}
      >
        <span className="flat-app-window-chrome"><span className="flat-traffic"><i /><i /><i /></span><b>{statusOf(item, language)}</b></span>
        <span className="flat-app-window-body">
          <span className="flat-app-window-art" aria-hidden="true"><FlatAppIcon type={profile.icon} slug={item.slug} /></span>
          <span className="flat-app-window-copy">
            <small>{groupOptions.find((group) => group.id === groupId)?.[language === 'vi' ? 'labelVi' : 'label'] || t.group}</small>
            <strong>{titleOf(item, language)} {item.isHiddenFolder ? <span className="hidden-app-folder-count">{String(item.statusVi || item.status || '').match(/\d+/)?.[0] || '0'}</span> : null}</strong><em>{shortDesc(item, language)}</em>
          </span>
          <span className="flat-app-window-cta">{locked ? t.locked : t.open}</span><span className="flat-app-window-decoration" />
        </span>
      </button>

      {editMode && !item.isHiddenFolder && (
        <div className="launcher-card-controls" role="group" aria-label={`${t.customize}: ${titleOf(item, language)}`}>
          <button type="button" className={pinned ? 'active' : ''} onClick={() => onTogglePin(itemId)} title={pinned ? t.unpin : t.pin}>★</button>
          <button type="button" className={hidden ? 'active danger' : ''} onClick={() => onToggleHidden(itemId, navId)} title={hidden ? t.show : t.hide}>{hidden ? '◉' : '◌'}</button>
          <button type="button" className={inNav ? 'active' : ''} onClick={() => onToggleNav(navId)} title={inNav ? t.navOff : t.navOn}>⌘</button>
          <select value={groupId} onChange={(event) => onAssignGroup(itemId, event.target.value)} aria-label={t.group}>
            {groupOptions.map((group) => <option key={group.id} value={group.id}>{language === 'vi' ? group.labelVi : group.label}</option>)}
          </select>
        </div>
      )}

      {locked && permissionId ? <div className="flat-app-window-request"><PermissionRequestButton currentUser={currentUser} permissionId={permissionId} item={item} language={language} /></div> : null}
    </article>
  );
}

function GroupRail({ group, count, language, active, onClick }) {
  return (
    <button type="button" className={`flat-apps-group-chip ${active ? 'active' : ''}`} style={{ '--group-accent': group.accent }} onClick={onClick}>
      <b>{language === 'vi' ? group.labelVi : group.label}</b><small>{count}</small>
    </button>
  );
}

export default function WebApps({ apps, language = 'vi', currentUser, appVisibility: externalAppVisibility }) {
  const t = copy[language] || copy.vi;
  const isAdmin = currentUser?.role === 'admin';
  const appVisibility = externalAppVisibility || { snapshot: {}, hiddenIds: [] };
  const globallyHiddenIds = useMemo(() => new Set(appVisibility?.hiddenIds || getHiddenAppIds(appVisibility?.snapshot)), [appVisibility?.hiddenIds?.join('|'), appVisibility?.snapshot]);
  const [editMode, setEditMode] = useState(false);
  const [activeGroup, setActiveGroup] = useState('all');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#00A6A6');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [workspaceFilter, setWorkspaceFilter] = useState(() => getWorkspaceFilterFromHash());
  const [density, setDensity] = useState(() => {
    try { return localStorage.getItem('bes-launcher-density') === 'compact' ? 'compact' : 'comfortable'; } catch { return 'comfortable'; }
  });
  const dragItemRef = useRef('');
  const editModeRef = useRef(false);

  const safeApps = Array.isArray(apps) ? apps : [];
  const allBaseItems = useMemo(() => {
    const routeApps = ROUTE_APPS.filter((item) => !item.adminOnly || isAdmin);
    const hiddenCount = globallyHiddenIds.size;
    const folder = isAdmin ? [{
      ...HIDDEN_APPS_FOLDER,
      desc: `${hiddenCount} app${hiddenCount === 1 ? '' : 's'} are currently hidden from teachers.`,
      descVi: `${hiddenCount} ứng dụng hiện đang được ẩn khỏi tài khoản giáo viên.`,
      status: `${hiddenCount} hidden apps`,
      statusVi: `${hiddenCount} ứng dụng đã ẩn`,
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
      const ai = APP_ORDER.indexOf(a.slug); const bi = APP_ORDER.indexOf(b.slug);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [safeApps, isAdmin, globallyHiddenIds]);

  const baseItems = useMemo(() => allBaseItems.filter((item) => item.isHiddenFolder || !globallyHiddenIds.has(appVisibilityId(item))), [allBaseItems, globallyHiddenIds]);
  const itemIds = useMemo(() => allBaseItems.map(launcherItemId), [allBaseItems]);
  const [config, setConfig] = useState(() => loadLauncherConfig(itemIds));
  const [draftConfig, setDraftConfig] = useState(() => loadLauncherConfig(itemIds));

  useEffect(() => { editModeRef.current = editMode; }, [editMode]);

  useEffect(() => {
    try { localStorage.setItem('bes-launcher-density', density); } catch { /* optional */ }
  }, [density]);

  useEffect(() => {
    const syncWorkspaceFilter = () => {
      const next = getWorkspaceFilterFromHash();
      setWorkspaceFilter(next);
      if (next) setActiveGroup('all');
    };
    syncWorkspaceFilter();
    window.addEventListener('hashchange', syncWorkspaceFilter);
    return () => window.removeEventListener('hashchange', syncWorkspaceFilter);
  }, []);

  useEffect(() => {
    let active = true;
    const normalized = normalizeLauncherConfig(loadLauncherConfig(itemIds), itemIds);
    setConfig(normalized); setDraftConfig(normalized);
    loadLauncherConfigFromCloud(itemIds)
      .then(({ config: cloudConfig }) => {
        if (!active) return;
        const clean = normalizeLauncherConfig(cloudConfig, itemIds);
        setConfig(clean);
        if (!editModeRef.current) setDraftConfig(clean);
      })
      .catch((error) => console.warn('[Launcher] app directory cloud fallback', error));
    const unsubscribe = subscribeLauncherConfig((next) => {
      const clean = normalizeLauncherConfig(next, itemIds);
      setConfig(clean);
      if (!editModeRef.current) setDraftConfig(clean);
    }, itemIds);
    return () => { active = false; unsubscribe(); };
  }, [itemIds.join('|')]);

  const workingConfig = normalizeLauncherConfig(editMode ? draftConfig : config, itemIds);
  const orderMap = useMemo(() => new Map(workingConfig.order.map((id, index) => [id, index])), [workingConfig.order]);
  const orderedItems = useMemo(() => [...baseItems].sort((a, b) => (orderMap.get(launcherItemId(a)) ?? 999) - (orderMap.get(launcherItemId(b)) ?? 999)), [baseItems, orderMap]);
  const visibleItems = orderedItems.filter((item) => editMode || !workingConfig.hidden.includes(launcherItemId(item)));
  const workspaceVisibleItems = workspaceFilter ? visibleItems.filter((item) => workspaceMatchesItem(workspaceFilter, item)) : visibleItems;
  const activeWorkspace = workspaceFilter ? getWorkspaceById(workspaceFilter) : null;
  const groupOptions = Array.isArray(workingConfig.groups) && workingConfig.groups.length ? workingConfig.groups : DEFAULT_LAUNCHER_GROUPS;

  const groupForItem = (item) => workingConfig.assignments[launcherItemId(item)] || defaultGroupOf(item);
  const groupCounts = groupOptions.reduce((acc, group) => {
    acc[group.id] = workspaceVisibleItems.filter((item) => groupForItem(item) === group.id).length;
    return acc;
  }, {});

  const normalizedSearch = searchQuery.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const groupFilteredItems = activeGroup === 'all' ? workspaceVisibleItems : workspaceVisibleItems.filter((item) => groupForItem(item) === activeGroup);
  const filteredItems = groupFilteredItems.filter((item) => {
    if (!normalizedSearch) return true;
    const group = groupOptions.find((entry) => entry.id === groupForItem(item));
    const haystack = [titleOf(item, language), descOf(item, language), shortDesc(item, language), item.slug, group?.label, group?.labelVi]
      .join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalizedSearch.split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
  });
  const pinnedItems = orderedItems.filter((item) => workingConfig.pinned.includes(launcherItemId(item)) && !workingConfig.hidden.includes(launcherItemId(item)));

  const patchDraft = (updater) => setDraftConfig((current) => normalizeLauncherConfig(typeof updater === 'function' ? updater(current) : { ...current, ...updater }, itemIds));
  const togglePin = (id) => patchDraft((current) => ({ ...current, pinned: current.pinned.includes(id) ? current.pinned.filter((value) => value !== id) : [...current.pinned, id].slice(-12) }));
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
  const assignGroup = (id, groupId) => patchDraft((current) => ({ ...current, assignments: { ...current.assignments, [id]: groupId } }));

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
    let id = baseId; let counter = 2;
    while (draftConfig.groups.some((group) => group.id === id)) { id = `${baseId}-${counter}`; counter += 1; }
    patchDraft((current) => ({ ...current, groups: [...current.groups, { id, label: name, labelVi: name, accent: newGroupColor }] }));
    setNewGroupName(''); setActiveGroup(id);
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
    setConfig(saved); setDraftConfig(saved); setEditMode(false); setNotice(result.cloud ? t.saved : t.savedLocal);
    setSaving(false);
    window.setTimeout(() => setNotice(''), 3200);
  };

  const restoreDefaults = async () => {
    if (saving) return;
    setSaving(true);
    const result = await resetLauncherConfigToCloud(itemIds);
    const next = result.config;
    setConfig(next); setDraftConfig(next); setActiveGroup('all'); setNotice(result.cloud ? t.saved : t.savedLocal);
    setSaving(false);
  };

  const beginEdit = () => { setDraftConfig(normalizeLauncherConfig(config, itemIds)); setEditMode(true); setActiveGroup('all'); setNotice(''); };
  const cancelEdit = () => { setDraftConfig(config); setEditMode(false); setNotice(''); };

  useEffect(() => {
    const openEditor = () => { if (isAdmin) beginEdit(); };
    window.addEventListener('bes-launcher-edit', openEditor);
    return () => window.removeEventListener('bes-launcher-edit', openEditor);
  }, [isAdmin, config, itemIds.join('|')]);

  return (
    <UILaunchPage app="apps" className={`flat-design-home flat-apps-directory launcher-v10831 launcher-v1136 launcher-command-center density-${density} ${editMode ? 'is-launcher-edit-mode' : ''}`} aria-label="Creative apps directory">

      <UILaunchHero as="header" className="flat-apps-hero apps-directory-hero-v1216">
        <div className="flat-apps-hero-copy">
          <p className="flat-kicker">✦ {t.kicker}</p>
          <h1><span className="flat-bubble-word">{t.titleA}</span><span>{t.titleB}</span><span>{t.titleC}</span></h1>
          <p className="flat-subtitle">{t.subtitle}</p>
          <aside className="flat-apps-stats" aria-label="Apps summary">
            <div><strong>{workspaceVisibleItems.length}</strong><small>{t.total}</small><em>{language === 'vi' ? 'Ứng dụng có sẵn' : 'Available apps'}</em></div>
            <div><strong>{workingConfig.pinned.length}</strong><small>PIN</small><em>{language === 'vi' ? 'Ứng dụng ghim' : 'Pinned apps'}</em></div>
            <div><strong>{workingConfig.nav.length}</strong><small>NAV</small><em>{language === 'vi' ? 'Mục điều hướng' : 'Navigation items'}</em></div>
          </aside>
          {isAdmin && (
            <div className="launcher-admin-actions">
              <button type="button" className={editMode ? 'active' : ''} onClick={editMode ? cancelEdit : beginEdit}>✦ {editMode ? t.finish : t.customize} <span aria-hidden="true">→</span></button>
              {editMode && <button type="button" className="primary" onClick={saveChanges} disabled={saving}>{saving ? t.saving : t.save}</button>}
              {editMode && <button type="button" onClick={restoreDefaults} disabled={saving}>{t.reset}</button>}
            </div>
          )}
        </div>
        <AppsHeroArtwork language={language} />
      </UILaunchHero>

      {activeWorkspace ? (
        <section className="bui-app-workspace-filter" style={{ '--workspace-accent': activeWorkspace.accent }} aria-label={t.workspaceFilter}>
          <div>
            <strong>{t.workspaceFilter}: {language === 'vi' ? activeWorkspace.labelVi : activeWorkspace.label}</strong>
            <small>{language === 'vi' ? activeWorkspace.descriptionVi : activeWorkspace.description}</small>
          </div>
          <button type="button" className="bui-button bui-button--secondary" onClick={() => { setWorkspaceFilter(''); window.location.hash = '#/apps'; }}>{t.clearWorkspace}</button>
        </section>
      ) : null}

      <UILaunchToolbar className="launcher-discovery-bar" aria-label={t.search}>
        <label className="launcher-search-box">
          <span aria-hidden="true">⌕</span>
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t.searchPlaceholder} aria-label={t.search} />
          {searchQuery ? <button type="button" onClick={() => setSearchQuery('')} aria-label={language === 'vi' ? 'Xóa tìm kiếm' : 'Clear search'}>×</button> : <kbd>⌘K</kbd>}
        </label>
        <button type="button" className="launcher-command-button" onClick={() => window.dispatchEvent(new CustomEvent('bes-command-palette-open'))}><span>⌘</span><b>{t.command}</b><small>⌘K</small></button>
        <div className="launcher-density-switch" aria-label={t.density}>
          <span>{t.density}</span>
          <button type="button" className={density === 'comfortable' ? 'active' : ''} onClick={() => setDensity('comfortable')} title={t.comfortable}>▦</button>
          <button type="button" className={density === 'compact' ? 'active' : ''} onClick={() => setDensity('compact')} title={t.compact}>▦▦</button>
        </div>
      </UILaunchToolbar>

      {editMode && (
        <section className="launcher-admin-panel bui-launch-admin">
          <div className="launcher-editor-intro"><strong>{t.customize}</strong><p>{t.dragHint}</p></div>
          <div className="launcher-create-group">
            <label><span>{t.addGroup}</span><input value={newGroupName} onChange={(event) => setNewGroupName(event.target.value.slice(0, 40))} placeholder={t.groupName} onKeyDown={(event) => { if (event.key === 'Enter') createGroup(); }} /></label>
            <input type="color" value={newGroupColor} onChange={(event) => setNewGroupColor(event.target.value)} aria-label="Group color" />
            <button type="button" onClick={createGroup} disabled={!newGroupName.trim()}>＋ {t.create}</button>
          </div>
          <div className="launcher-group-manager">
            {groupOptions.map((group) => (
              <span key={group.id} style={{ '--group-accent': group.accent }}>
                <i /> <b>{language === 'vi' ? group.labelVi : group.label}</b>
                {!DEFAULT_LAUNCHER_GROUPS.some((item) => item.id === group.id) && <button type="button" onClick={() => deleteGroup(group.id)} aria-label="Delete group">×</button>}
              </span>
            ))}
          </div>
          {notice && <div className="launcher-notice">{notice}</div>}
        </section>
      )}

      <section className="flat-apps-group-rail launcher-group-rail bui-launch-navigation" aria-label="Workflow groups">
        <GroupRail group={{ id: 'all', label: 'All apps', labelVi: 'Tất cả', accent: '#191515' }} count={workspaceVisibleItems.length} language={language} active={activeGroup === 'all'} onClick={() => setActiveGroup('all')} />
        {groupOptions.map((group) => <GroupRail key={group.id} group={group} count={groupCounts[group.id] || 0} language={language} active={activeGroup === group.id} onClick={() => setActiveGroup(group.id)} />)}
      </section>

      <UILaunchGrid as="main" className="flat-apps-collage-grid launcher-custom-grid" aria-label="Application windows">
        {filteredItems.map((item) => (
          <AppWindowCard key={`${item.route || 'tool'}-${item.slug}`} item={item} language={language} currentUser={currentUser} editMode={editMode} config={workingConfig} groupOptions={groupOptions}
            onTogglePin={togglePin} onToggleHidden={toggleHidden} onToggleNav={toggleNav} onAssignGroup={assignGroup} onDragStart={onDragStart} onDrop={onDrop} />
        ))}
        {!filteredItems.length && <div className="launcher-empty-group">{searchQuery ? t.noSearch : t.empty}</div>}
      </UILaunchGrid>

      <UILaunchPinned className="flat-pinned-apps flat-apps-pins launcher-pinned-apps" aria-label="Pinned apps">
        <div><strong>{t.pinned}</strong><small>{t.flow}</small></div>
        <div className="flat-chip-row">
          {pinnedItems.map((item) => {
            const profile = getAppDesignProfile(item.slug);
            return (
              <button key={`pin-${item.slug}`} type="button" className="flat-app-chip" style={{ '--chip-bg': profile.accent }} onClick={(event) => launch(targetFor(item), item.icon || 'AP', profile.accent, event.currentTarget)}>
                <FlatAppIcon type={profile.icon} slug={item.slug} /><span>{titleOf(item, language)}</span>
              </button>
            );
          })}
          {!pinnedItems.length && <small className="launcher-no-pins">{language === 'vi' ? 'Chưa có ứng dụng được ghim.' : 'No pinned apps yet.'}</small>}
        </div>
      </UILaunchPinned>
    </UILaunchPage>
  );
}
