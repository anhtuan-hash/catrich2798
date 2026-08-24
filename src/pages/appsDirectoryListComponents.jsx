import React from 'react';
import { ChevronRight, EyeOff, LockKeyhole, Pin, PinOff, Star } from 'lucide-react';
import PermissionRequestButton from '../components/PermissionRequestButton.jsx';
import FlatAppIcon from '../components/FlatAppIcon.jsx';
import { getAppDesignProfile } from '../data/designProfiles.js';
import { launcherItemId, launcherNavId } from '../utils/launcherPreferences.js';
import {
  copy,
  defaultGroupOf,
  descOf,
  launch,
  lockedFor,
  permissionFor,
  shortDesc,
  statusOf,
  targetFor,
  titleOf,
} from './appsDirectoryData.js';

export default function AppListRow({
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
  const itemTitle = titleOf(item, language);
  const description = shortDesc(item, language) || descOf(item, language) || '';
  const status = statusOf(item, language);

  const openItem = (event) => {
    if (locked || editMode) return;
    launch(targetFor(item), item.icon || itemTitle.slice(0, 2), profile.accent, event.currentTarget);
  };

  return (
    <article
      className={`apps-list-row ${locked ? 'is-locked' : ''} ${hidden ? 'is-hidden' : ''} ${editMode ? 'is-editing' : ''}`}
      style={{ '--app-accent': profile.accent, '--app-soft': profile.soft, '--app-ink': profile.ink }}
      draggable={editMode}
      onDragStart={(event) => onDragStart?.(event, itemId)}
      onDragOver={(event) => { if (editMode) event.preventDefault(); }}
      onDrop={(event) => onDrop?.(event, itemId)}
      data-launcher-item={itemId}
    >
      <button
        type="button"
        className="apps-list-open"
        onClick={openItem}
        aria-label={`${locked ? (language === 'vi' ? 'Cần quyền truy cập' : 'Access required') : t.open}: ${itemTitle}`}
        aria-disabled={locked || editMode ? 'true' : 'false'}
      >
        <span className="apps-list-icon" aria-hidden="true"><FlatAppIcon type={profile.icon} slug={item.slug} /></span>
        <span className="apps-list-copy">
          <span className="apps-list-meta">
            <b>{language === 'vi' ? (group?.labelVi || 'Ứng dụng') : (group?.label || 'Application')}</b>
            {status ? <em>{status}</em> : null}
            {pinned ? <em className="is-pinned">★ {language === 'vi' ? 'Đã ghim' : 'Pinned'}</em> : null}
          </span>
          <strong>{itemTitle}</strong>
          <small>{description}</small>
        </span>
        <span className="apps-list-primary-action" aria-hidden="true">
          {locked ? <><LockKeyhole /><b>{language === 'vi' ? 'Cần quyền' : 'Access'}</b></> : <><b>{language === 'vi' ? 'Mở' : 'Open'}</b><ChevronRight /></>}
        </span>
      </button>

      {locked && permissionId && !editMode ? (
        <div className="apps-list-permission">
          <PermissionRequestButton currentUser={currentUser} permissionId={permissionId} item={item} language={language} compact className="request-access-btn" label={language === 'vi' ? `Yêu cầu quyền cho ${itemTitle}` : `Request access to ${itemTitle}`} />
        </div>
      ) : null}

      {editMode && !item.isHiddenFolder ? (
        <div className="apps-list-admin" role="group" aria-label={`${t.customize}: ${itemTitle}`}>
          <button type="button" className={pinned ? 'active' : ''} onClick={() => onTogglePin(itemId)} title={pinned ? t.unpin : t.pin}>{pinned ? <PinOff /> : <Pin />}<span>{pinned ? t.unpin : t.pin}</span></button>
          <button type="button" className={hidden ? 'active danger' : ''} onClick={() => onToggleHidden(itemId, navId)} title={hidden ? t.show : t.hide}><EyeOff /><span>{hidden ? t.show : t.hide}</span></button>
          <button type="button" className={inNav ? 'active' : ''} onClick={() => onToggleNav(navId)} title={inNav ? t.navOff : t.navOn}><Star /><span>{inNav ? t.navOff : t.navOn}</span></button>
          <label><span>{t.group}</span><select value={groupId} onChange={(event) => onAssignGroup(itemId, event.target.value)} aria-label={t.group}>{groupOptions.map((option) => <option key={option.id} value={option.id}>{language === 'vi' ? option.labelVi : option.label}</option>)}</select></label>
        </div>
      ) : null}
    </article>
  );
}
