import React from 'react';
import { LockKeyhole } from 'lucide-react';
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
  return (
    <header className="editorial-apps-hero">
      <div className="editorial-apps-hero-copy">
        <p className="editorial-apps-eyebrow">BRIAN ENGLISH · APP DIRECTORY</p>
        <h1>{vi ? <>Kho <em>ứng dụng</em><br />dành cho giáo viên</> : <>Teacher <em>app</em><br />directory</>}</h1>
        <p className="editorial-apps-lede">
          {vi
            ? 'Khám phá và mở nhanh toàn bộ công cụ dạy học, quản lý lớp và phát triển chuyên môn trong một không gian gọn gàng, dễ đọc và nhất quán.'
            : 'Discover and launch teaching, classroom-management and professional tools from one calm, consistent workspace.'}
        </p>
        <div className="editorial-apps-hero-actions">
          <button type="button" onClick={onBrowse}>{vi ? 'Xem toàn bộ ứng dụng' : 'Browse all apps'}</button>
          {isAdmin && <button type="button" onClick={onEdit}>{editMode ? t.finish : t.customize}</button>}
          {isAdmin && editMode && <button type="button" onClick={onSave} disabled={saving}>{saving ? t.saving : t.save}</button>}
          {isAdmin && editMode && <button type="button" onClick={onReset} disabled={saving}>{t.reset}</button>}
        </div>
      </div>

      <div className="editorial-apps-hero-side">
        <div className="editorial-apps-illustration" aria-hidden="true">
          <svg viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M109 199C110 163 113 123 117 84C120 57 126 35 136 17" stroke="#617362" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M117 95C94 80 76 62 63 40M115 119C139 103 158 84 171 59M112 148C89 138 69 124 52 104M111 176C133 164 153 149 171 128" stroke="#617362" strokeWidth="1.6" strokeLinecap="round" />
            <ellipse cx="69" cy="50" rx="10" ry="23" transform="rotate(-43 69 50)" stroke="#617362" strokeWidth="1.5" />
            <ellipse cx="87" cy="76" rx="9" ry="21" transform="rotate(-49 87 76)" stroke="#617362" strokeWidth="1.5" />
            <ellipse cx="161" cy="69" rx="10" ry="23" transform="rotate(43 161 69)" stroke="#617362" strokeWidth="1.5" />
            <ellipse cx="144" cy="96" rx="9" ry="21" transform="rotate(49 144 96)" stroke="#617362" strokeWidth="1.5" />
            <ellipse cx="61" cy="116" rx="10" ry="23" transform="rotate(-57 61 116)" stroke="#617362" strokeWidth="1.5" />
            <ellipse cx="85" cy="141" rx="9" ry="21" transform="rotate(-57 85 141)" stroke="#617362" strokeWidth="1.5" />
            <ellipse cx="160" cy="142" rx="10" ry="23" transform="rotate(57 160 142)" stroke="#617362" strokeWidth="1.5" />
            <ellipse cx="140" cy="165" rx="9" ry="21" transform="rotate(57 140 165)" stroke="#617362" strokeWidth="1.5" />
            <path d="M44 202C82 189 132 189 179 202" stroke="#C5A98F" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>
        <div className="editorial-apps-stats" aria-label={vi ? 'Tổng quan ứng dụng' : 'Apps summary'}>
          <div className="editorial-apps-stat"><span aria-hidden="true">▦</span><strong>{visibleItems.length}</strong><small>{vi ? 'Ứng dụng sẵn sàng' : 'Apps ready'}</small></div>
          <div className="editorial-apps-stat"><span aria-hidden="true">★</span><strong>{pinnedCount}</strong><small>{vi ? 'Đã ghim' : 'Pinned'}</small></div>
          <div className="editorial-apps-stat"><span aria-hidden="true">➤</span><strong>{navCount}</strong><small>{vi ? 'Trên điều hướng' : 'In navigation'}</small></div>
        </div>
      </div>
    </header>
  );
}
