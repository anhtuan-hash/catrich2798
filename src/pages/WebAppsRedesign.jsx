import React, { useEffect, useMemo, useRef, useState } from 'react';
import FlatAppIcon from '../components/FlatAppIcon.jsx';
import '../styles/launcher-app-hub-v1167.css';
import '../styles/apps-directory-redesign.css';
import { getAppDesignProfile } from '../data/designProfiles.js';
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
import { HIDDEN_APPS_FOLDER, appVisibilityId } from '../data/appVisibilityRegistry.js';
import { getHiddenAppIds } from '../utils/appVisibility.js';
import { APP_ORDER, ROUTE_APPS, copy, defaultGroupOf, descOf, launch, shortDesc, targetFor, titleOf } from './appsDirectoryData.js';
import { AppsDirectoryHero, GroupRail, TopMenu } from './appsDirectoryComponents.jsx';
import AppListRow from './appsDirectoryListComponents.jsx';

export default function WebAppsRedesign({ apps, language = 'vi', hasApiKey, currentUser, setLanguage, appVisibility: externalAppVisibility }) {
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
  useEffect(() => { try { localStorage.setItem('bes-launcher-density', density); } catch { /* optional */ } }, [density]);
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
    const haystack = [titleOf(item, language), descOf(item, language), shortDesc(item, language), item.slug, group?.label, group?.labelVi]
      .join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalizedSearch.split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
  });
  const pinnedItems = orderedItems.filter((item) => workingConfig.pinned.includes(launcherItemId(item)) && !workingConfig.hidden.includes(launcherItemId(item)));
  const heroPreviewItems = (pinnedItems.length ? pinnedItems : visibleItems).filter((item) => !item.isHiddenFolder).slice(0, 6);
  const showGroupedDirectory = !editMode && activeGroup === 'all' && !normalizedSearch;
  const directoryGroups = groupOptions
    .map((group) => ({ ...group, items: visibleItems.filter((item) => groupForItem(item) === group.id) }))
    .filter((group) => group.items.length > 0);

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
  const cancelEdit = () => { setDraftConfig(config); setEditMode(false); setActiveGroup('all'); setNotice(''); };

  useEffect(() => {
    const openEditor = () => { if (isAdmin) beginEdit(); };
    window.addEventListener('bes-launcher-edit', openEditor);
    return () => window.removeEventListener('bes-launcher-edit', openEditor);
  }, [isAdmin, config, itemIds.join('|')]);

  const renderAppRow = (item, keyPrefix = '') => (
    <AppListRow
      key={`${keyPrefix}${item.route || 'tool'}-${item.slug}`}
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
  );

  return (
    <div className={`flat-design-home flat-apps-directory apps-directory-native launcher-v10831 launcher-v1136 launcher-command-center launcher-style-radial density-${density} ${editMode ? 'is-launcher-edit-mode' : ''}`} aria-label="Creative apps directory">
      <TopMenu language={language} setLanguage={setLanguage} hasApiKey={hasApiKey} currentUser={currentUser} />
      <AppsDirectoryHero
        language={language} isAdmin={isAdmin} editMode={editMode} saving={saving} visibleItems={visibleItems}
        pinnedCount={workingConfig.pinned.length} navCount={workingConfig.nav.length} previewItems={heroPreviewItems}
        onBrowse={() => document.getElementById('apps-directory-grid')?.scrollIntoView({ behavior: 'auto', block: 'start' })}
        onEdit={editMode ? cancelEdit : beginEdit} onSave={saveChanges} onReset={restoreDefaults}
      />

      <section className="apps-directory-toolbar" aria-label={t.search}>
        <label className="apps-directory-search-box"><span aria-hidden="true">⌕</span><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t.searchPlaceholder} aria-label={t.search} />{searchQuery ? <button type="button" onClick={() => setSearchQuery('')} aria-label={language === 'vi' ? 'Xóa tìm kiếm' : 'Clear search'}>×</button> : null}</label>
        <button type="button" className="apps-directory-command-button" onClick={() => window.dispatchEvent(new CustomEvent('bes-command-palette-open'))}><span>⌘</span><b>{t.command}</b><small>⌘K</small></button>
        <div className="apps-directory-density-switch" aria-label={t.density}><span>{t.density}</span><button type="button" className={density === 'comfortable' ? 'active' : ''} onClick={() => setDensity('comfortable')} title={t.comfortable}>▦</button><button type="button" className={density === 'compact' ? 'active' : ''} onClick={() => setDensity('compact')} title={t.compact}>▦▦</button></div>
      </section>

      {editMode && <section className="launcher-admin-panel">
        <div className="launcher-editor-intro"><strong>{t.customize}</strong><p>{t.dragHint}</p></div>
        <div className="launcher-create-group"><label><span>{t.addGroup}</span><input value={newGroupName} onChange={(event) => setNewGroupName(event.target.value.slice(0, 40))} placeholder={t.groupName} onKeyDown={(event) => { if (event.key === 'Enter') createGroup(); }} /></label><input type="color" value={newGroupColor} onChange={(event) => setNewGroupColor(event.target.value)} aria-label="Group color" /><button type="button" onClick={createGroup} disabled={!newGroupName.trim()}>＋ {t.create}</button></div>
        <div className="launcher-group-manager">{groupOptions.map((group) => <span key={group.id} style={{ '--group-accent': group.accent }}><i /> <b>{language === 'vi' ? group.labelVi : group.label}</b>{!DEFAULT_LAUNCHER_GROUPS.some((item) => item.id === group.id) && <button type="button" onClick={() => deleteGroup(group.id)} aria-label="Delete group">×</button>}</span>)}</div>
        {notice && <div className="launcher-notice">{notice}</div>}
      </section>}

      <section className="flat-apps-group-rail launcher-group-rail" aria-label="Workflow groups">
        <GroupRail group={{ id: 'all', label: 'All apps', labelVi: 'Tất cả', accent: '#191515' }} count={visibleItems.length} language={language} active={activeGroup === 'all'} onClick={() => setActiveGroup('all')} />
        {groupOptions.map((group) => <GroupRail key={group.id} group={group} count={groupCounts[group.id] || 0} language={language} active={activeGroup === group.id} onClick={() => setActiveGroup(group.id)} />)}
      </section>

      <main id="apps-directory-grid" className={`apps-directory-list-native ${showGroupedDirectory ? 'is-grouped-editorial' : ''}`} aria-label="Application list">
        {showGroupedDirectory ? (
          <div className="apps-directory-group-grid">
            {directoryGroups.map((group) => (
              <section key={group.id} className="apps-directory-group-panel" style={{ '--group-accent': group.accent }}>
                <header className="apps-directory-group-heading">
                  <span className="apps-directory-group-mark" aria-hidden="true">▦</span>
                  <strong>{language === 'vi' ? group.labelVi : group.label}</strong>
                  <small>{group.items.length}</small>
                </header>
                <div className="apps-directory-group-items">
                  {group.items.slice(0, 4).map((item) => renderAppRow(item, `${group.id}-`))}
                </div>
                {group.items.length > 4 && (
                  <button type="button" className="apps-directory-group-more" onClick={() => setActiveGroup(group.id)}>
                    <span>›</span>{language === 'vi' ? `Xem tất cả ${group.items.length} ứng dụng` : `View all ${group.items.length} apps`}
                  </button>
                )}
              </section>
            ))}
          </div>
        ) : (
          <>
            {filteredItems.map((item) => renderAppRow(item))}
            {!filteredItems.length && <div className="launcher-empty-group">{searchQuery ? t.noSearch : t.empty}</div>}
          </>
        )}
      </main>

      {pinnedItems.length > 0 && !showGroupedDirectory && <aside className="flat-pinned-apps flat-apps-pins launcher-pinned-apps apps-directory-pinned-native" aria-label="Pinned apps">
        <div><strong>{t.pinned}</strong><small>{t.flow}</small></div>
        <div className="flat-chip-row">{pinnedItems.map((item) => {
          const profile = getAppDesignProfile(item.slug);
          return <button key={`pin-${item.slug}`} type="button" className="flat-app-chip" style={{ '--chip-bg': profile.accent }} onClick={(event) => launch(targetFor(item), item.icon || 'AP', profile.accent, event.currentTarget)}><FlatAppIcon type={profile.icon} slug={item.slug} /><span>{titleOf(item, language)}</span></button>;
        })}</div>
      </aside>}
    </div>
  );
}
