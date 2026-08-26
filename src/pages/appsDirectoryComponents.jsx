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

export function AppsDirectoryHero({ language, isAdmin, editMode, saving, visibleItems, pinnedCount, navCount, previewItems, onBrowse, onEdit, onSave, onReset }) {
  const t = copy[language] || copy.vi;
  return (
    <header className="apps-directory-hero-native">
      <div className="apps-directory-hero-copy">
        <p className="apps-directory-kicker"><span aria-hidden="true">✦</span>{t.kicker}</p>
        <h1><span>{t.titleA}</span><span className="apps-directory-title-accent">{t.titleB}</span><span>{t.titleC}</span></h1>
        <p className="apps-directory-subtitle">{t.subtitle}</p>
        <div className="apps-directory-actions">
          <button type="button" className="apps-directory-primary-action" onClick={onBrowse}>
            <span className="apps-directory-action-icon" aria-hidden="true">＋</span>
            <span><strong>{t.browse}</strong><small>{t.browseHint}</small></span>
          </button>
          {isAdmin && <>
            <button type="button" className={`apps-directory-secondary-action ${editMode ? 'is-active' : ''}`} onClick={onEdit}>
              <span className="apps-directory-action-icon" aria-hidden="true">⚙</span><span><strong>{editMode ? t.finish : t.customize}</strong></span>
            </button>
            {editMode && <button type="button" className="apps-directory-save-action" onClick={onSave} disabled={saving}>{saving ? t.saving : t.save}</button>}
            {editMode && <button type="button" className="apps-directory-reset-action" onClick={onReset} disabled={saving}>{t.reset}</button>}
          </>}
        </div>
      </div>
      <div className="apps-directory-hero-visual" aria-label={t.previewTitle}>
        <span className="apps-directory-orbit apps-directory-orbit-one" aria-hidden="true" /><span className="apps-directory-orbit apps-directory-orbit-two" aria-hidden="true" />
        <section className="apps-directory-workspace">
          <header className="apps-directory-workspace-bar"><span className="apps-directory-window-dots" aria-hidden="true"><i /><i /><i /></span><span className="apps-directory-workspace-search" aria-hidden="true">⌕ {t.search}</span></header>
          <div className="apps-directory-workspace-content">
            <div className="apps-directory-workspace-heading">
              <small>BRIAN APP SPACE</small><strong>{t.previewTitle}</strong><span>{t.previewHint}</span>
              <div className="apps-directory-flat-relief" aria-hidden="true">
                <div className="apps-flat-relief-books">
                  <span className="apps-flat-relief-book is-blue"><i /></span>
                  <span className="apps-flat-relief-book is-mint"><i /></span>
                  <span className="apps-flat-relief-book is-coral"><i /></span>
                </div>
                <div className="apps-flat-relief-calendar">
                  <span className="apps-flat-relief-rings"><i /><i /></span>
                  <strong>BE</strong><small>APPS</small>
                </div>
                <div className="apps-flat-relief-pencil"><span /><i /></div>
                <div className="apps-flat-relief-cube"><span /><i /><b /></div>
              </div>
            </div>
            <div className="apps-directory-preview-grid">
              {previewItems.map((item) => {
                const profile = getAppDesignProfile(item.slug);
                return (
                  <button key={`hero-${item.route || 'tool'}-${item.slug}`} type="button" style={{ '--preview-accent': profile.accent, '--preview-soft': profile.soft }} onClick={(event) => launch(targetFor(item), item.icon || 'AP', profile.accent, event.currentTarget)} title={titleOf(item, language)}>
                    <FlatAppIcon type={profile.icon} slug={item.slug} /><span>{titleOf(item, language)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
        <div className="apps-directory-stat-row" aria-label="Apps summary">
          <div><span aria-hidden="true">▦</span><strong>{visibleItems.length}</strong><small>{t.ready}</small></div>
          <div><span aria-hidden="true">★</span><strong>{pinnedCount}</strong><small>{t.pinnedLabel}</small></div>
          <div><span aria-hidden="true">➤</span><strong>{navCount}</strong><small>{t.navLabel}</small></div>
        </div>
      </div>
    </header>
  );
}
