import React, { useState } from 'react';
import { ChevronRight, Grid2X2, LockKeyhole, Navigation, Pin, Settings2, Star, UsersRound } from 'lucide-react';
import PermissionRequestButton from '../components/PermissionRequestButton.jsx';
import FlatAppIcon from '../components/FlatAppIcon.jsx';
import { getAppDesignProfile } from '../data/designProfiles.js';
import { launcherItemId, launcherNavId } from '../utils/launcherPreferences.js';
import { copy, defaultGroupOf, launch, lockedFor, navLaunch, permissionFor, shortDesc, statusOf, targetFor, titleOf } from './appsDirectoryData.js';

export function TopMenu({ language, setLanguage, hasApiKey, currentUser }) {
  const t = copy[language] || copy.vi;
  const isAdmin = currentUser?.role === 'admin';
  const nav = [
    { key: 'home', label: t.nav.home, icon: 'home', color: '#ffc69d' },
    { key: 'apps', label: t.nav.apps, icon: 'apps', color: '#2bb7b3' },
    { key: 'games', label: t.nav.games, icon: 'game', color: '#5B2A86' },
    ...(isAdmin ? [{ key: 'admin', label: t.nav.admin, icon: 'admin', color: '#D13438' }] : []),
  ];
  return (
    <nav className="flat-pinned-menu flat-apps-menu" aria-label="Apps navigation">
      <button type="button" className="flat-brand-button" onClick={(event) => navLaunch('home', 'BE', '#ffc69d', event.currentTarget)}>
        <span className="flat-brand-mark">be</span><strong>{t.brand}</strong>
      </button>
      <div className="flat-nav-links">
        {nav.map((item) => (
          <button key={item.key} type="button" className="flat-nav-link" style={{ '--nav-hover': item.color }} onClick={(event) => navLaunch(item.key, item.label, item.color, event.currentTarget)}>
            <FlatAppIcon type={item.icon} /><span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="flat-menu-actions">
        <button type="button" className="flat-menu-pill" onClick={(event) => navLaunch('settings', 'AI', hasApiKey ? '#2bb7b3' : '#f7d23b', event.currentTarget)}>{hasApiKey ? t.aiOn : t.aiOff}</button>
        <button type="button" className="flat-menu-pill" onClick={() => setLanguage?.(language === 'vi' ? 'en' : 'vi')}>{language === 'vi' ? 'VI' : 'EN'}</button>
        <button type="button" className="flat-account-button" onClick={(event) => navLaunch('settings', 'ME', '#191515', event.currentTarget)}>
          <span>{(currentUser?.name || currentUser?.email || 'U').slice(0, 1).toUpperCase()}</span><strong>{currentUser?.role || 'user'}</strong>
        </button>
      </div>
    </nav>
  );
}

export function AppWindowCard({ item, language, currentUser, editMode, config, groupOptions, onTogglePin, onToggleHidden, onToggleNav, onAssignGroup, onDragStart, onDrop }) {
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
  const itemTitle = titleOf(item, language);
  return (
    <article
      className={`flat-app-window-card flat-app-window-drawer ${item.isHiddenFolder ? 'hidden-app-folder-card' : ''} ${locked ? 'is-locked' : ''} ${editMode ? 'is-launcher-editing' : ''} ${hidden ? 'is-launcher-hidden' : ''}`}
      style={{ '--app-accent': profile.accent, '--app-soft': profile.soft, '--app-ink': profile.ink }}
      draggable={editMode}
      onDragStart={(event) => onDragStart?.(event, itemId)}
      onDragOver={(event) => { if (editMode) event.preventDefault(); }}
      onDrop={(event) => onDrop?.(event, itemId)}
      data-launcher-item={itemId}
    >
      {editMode && <div className="launcher-drag-handle" title={language === 'vi' ? 'Kéo để sắp xếp' : 'Drag to reorder'}>⋮⋮</div>}
      {locked ? <span className="flat-app-window-lock-chip" aria-hidden="true"><LockKeyhole />{language === 'vi' ? 'Cần quyền' : 'Access needed'}</span> : null}
      <button
        type="button"
        className="flat-app-window-launch"
        onClick={(event) => { if (!locked && !editMode) launch(targetFor(item), item.icon || titleOf(item, language).slice(0, 2), profile.accent, event.currentTarget); }}
        aria-label={`${locked ? (language === 'vi' ? 'Cần quyền truy cập' : 'Access required') : t.open}: ${itemTitle}`}
        aria-disabled={locked || editMode ? 'true' : 'false'}
        tabIndex={locked ? -1 : undefined}
        disabled={editMode}
      >
        <span className="flat-app-window-chrome"><span className="flat-traffic"><i /><i /><i /></span><b>{statusOf(item, language)}</b></span>
        <span className="flat-app-window-body">
          <span className="flat-app-window-art" aria-hidden="true"><FlatAppIcon type={profile.icon} slug={item.slug} /></span>
          <span className="flat-app-window-copy">
            <small>{groupOptions.find((group) => group.id === groupId)?.[language === 'vi' ? 'labelVi' : 'label'] || t.group}</small>
            <strong>{itemTitle} {item.isHiddenFolder ? <span className="hidden-app-folder-count">{String(item.statusVi || item.status || '').match(/\d+/)?.[0] || '0'}</span> : null}</strong>
            <em>{shortDesc(item, language)}</em>
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
      {locked && permissionId ? <div className="flat-app-window-request"><PermissionRequestButton currentUser={currentUser} permissionId={permissionId} item={item} language={language} compact className="request-access-btn" label={language === 'vi' ? `Yêu cầu quyền cho ${itemTitle}` : `Request access to ${itemTitle}`} /></div> : null}
    </article>
  );
}

export function GroupRail({ group, count, language, active, onClick }) {
  return (
    <button type="button" className={`flat-apps-group-chip ${active ? 'active' : ''}`} style={{ '--group-accent': group.accent }} onClick={onClick}>
      <b>{language === 'vi' ? group.labelVi : group.label}</b><small>{count}</small>
    </button>
  );
}

export function AppsDirectoryHero({ language, isAdmin, editMode, saving, visibleItems, pinnedCount, navCount, onBrowse, onEdit, onSave, onReset }) {
  const t = copy[language] || copy.vi;
  const vi = language === 'vi';
  const [activeFilter, setActiveFilter] = useState('all');

  const filterOptions = [
    { id: 'all', label: vi ? 'Tất cả ứng dụng' : 'All apps', icon: Grid2X2 },
    { id: 'pinned', label: vi ? 'Đã ghim' : 'Pinned', icon: Pin },
    { id: 'shared', label: vi ? 'Dùng chung' : 'Shared', icon: UsersRound },
    { id: 'featured', label: vi ? 'Nổi bật' : 'Featured', icon: Star },
    { id: 'nav', label: vi ? 'Trên điều hướng' : 'In navigation', icon: Navigation },
  ];

  const applyFilter = (filterId, shouldScroll = true) => {
    setActiveFilter(filterId);
    const root = document.querySelector('.apps-directory-native');
    if (root) root.dataset.heroFilter = filterId;
    if (shouldScroll) {
      window.requestAnimationFrame(() => document.getElementById('apps-directory-grid')?.scrollIntoView({ behavior: 'auto', block: 'start' }));
    }
  };

  const browseAll = () => {
    applyFilter('all', false);
    onBrowse?.();
  };

  return (
    <header className="editorial-apps-hero">
      <div className="editorial-apps-hero-copy">
        <p className="editorial-apps-eyebrow">BRIAN ENGLISH · APP DIRECTORY</p>
        <h1>{vi ? <>Kho <em>ứng dụng</em><br />dành cho giáo viên</> : <>Teacher <em>app</em><br />directory</>}</h1>
        <p className="editorial-apps-lede">
          {vi
            ? 'Khám phá và sử dụng các ứng dụng học tập hữu ích dành riêng cho giáo viên Brian English.'
            : 'Discover and launch useful teaching applications built for the Brian English workspace.'}
        </p>

        <div className="editorial-apps-hero-actions">
          <button type="button" className="is-primary" onClick={browseAll}><Grid2X2 aria-hidden="true" /><span>{vi ? 'Xem toàn bộ ứng dụng' : 'Browse all apps'}</span></button>
          {isAdmin && <button type="button" className="is-secondary" onClick={onEdit}><Settings2 aria-hidden="true" /><span>{editMode ? t.finish : t.customize}</span></button>}
          {isAdmin && editMode && <button type="button" className="is-utility" onClick={onSave} disabled={saving}>{saving ? t.saving : t.save}</button>}
          {isAdmin && editMode && <button type="button" className="is-utility" onClick={onReset} disabled={saving}>{t.reset}</button>}
        </div>

        <div className="editorial-apps-filter-chips" aria-label={vi ? 'Bộ lọc nhanh ứng dụng' : 'Quick app filters'}>
          {filterOptions.map(({ id, label, icon: FilterIcon }) => (
            <button key={id} type="button" className={activeFilter === id ? 'is-active' : ''} onClick={() => applyFilter(id)} aria-pressed={activeFilter === id}>
              <FilterIcon aria-hidden="true" /><span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="editorial-apps-hero-side">
        <div className="editorial-apps-illustration" aria-hidden="true">
          <span className="editorial-apps-orb editorial-apps-orb-a" />
          <span className="editorial-apps-orb editorial-apps-orb-b" />
          <svg viewBox="0 0 260 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M124 277C125 228 128 171 133 116C137 78 144 48 157 23" stroke="#506B70" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M132 131C103 110 80 85 64 55M130 165C160 143 183 116 199 82M127 205C98 191 73 172 52 145M126 244C154 225 179 203 201 173" stroke="#506B70" strokeWidth="1.6" strokeLinecap="round" />
            <ellipse cx="72" cy="67" rx="12" ry="27" transform="rotate(-43 72 67)" stroke="#506B70" strokeWidth="1.5" />
            <ellipse cx="94" cy="101" rx="11" ry="25" transform="rotate(-49 94 101)" stroke="#506B70" strokeWidth="1.5" />
            <ellipse cx="187" cy="96" rx="12" ry="27" transform="rotate(43 187 96)" stroke="#506B70" strokeWidth="1.5" />
            <ellipse cx="166" cy="132" rx="11" ry="25" transform="rotate(49 166 132)" stroke="#506B70" strokeWidth="1.5" />
            <ellipse cx="61" cy="160" rx="12" ry="27" transform="rotate(-57 61 160)" stroke="#506B70" strokeWidth="1.5" />
            <ellipse cx="91" cy="194" rx="11" ry="25" transform="rotate(-57 91 194)" stroke="#506B70" strokeWidth="1.5" />
            <ellipse cx="188" cy="191" rx="12" ry="27" transform="rotate(57 188 191)" stroke="#506B70" strokeWidth="1.5" />
            <ellipse cx="163" cy="225" rx="11" ry="25" transform="rotate(57 163 225)" stroke="#506B70" strokeWidth="1.5" />
            <path d="M42 281C87 263 148 263 211 281" stroke="#C99678" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        <div className="editorial-apps-stats" aria-label={vi ? 'Tổng quan ứng dụng' : 'Apps summary'}>
          <button type="button" className="editorial-apps-stat is-ready" onClick={() => applyFilter('all')}>
            <span className="editorial-apps-stat-icon"><Grid2X2 aria-hidden="true" /></span>
            <span className="editorial-apps-stat-copy"><strong>{visibleItems.length}</strong><small>{vi ? 'ứng dụng sẵn sàng' : 'apps ready'}</small></span>
            <ChevronRight className="editorial-apps-stat-arrow" aria-hidden="true" />
          </button>
          <button type="button" className="editorial-apps-stat is-pinned" onClick={() => applyFilter('pinned')}>
            <span className="editorial-apps-stat-icon"><Star aria-hidden="true" /></span>
            <span className="editorial-apps-stat-copy"><strong>{pinnedCount}</strong><small>{vi ? 'đã ghim' : 'pinned'}</small></span>
            <ChevronRight className="editorial-apps-stat-arrow" aria-hidden="true" />
          </button>
          <button type="button" className="editorial-apps-stat is-nav" onClick={() => applyFilter('nav')}>
            <span className="editorial-apps-stat-icon"><Navigation aria-hidden="true" /></span>
            <span className="editorial-apps-stat-copy"><strong>{navCount}</strong><small>{vi ? 'trên điều hướng' : 'in navigation'}</small></span>
            <ChevronRight className="editorial-apps-stat-arrow" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
