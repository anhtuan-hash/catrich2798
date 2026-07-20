import React from 'react';
import PermissionRequestButton from './PermissionRequestButton.jsx';
import FlatAppIcon from './FlatAppIcon.jsx';
import { getAppDesignProfile } from '../data/designProfiles.js';
import { getToolPermissionId, hasToolAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';

function launchTarget(target, item, sourceEl = null) {
  const profile = getAppDesignProfile(item?.slug);
  launchRoute({
    target,
    label: item?.icon || 'AP',
    color: profile.accent || '#191515',
    sourceEl,
  });
}

export default function AppCard({ item, language, currentUser }) {
  const title = language === 'vi' ? item.titleVi || item.title : item.title;
  const desc = language === 'vi' ? item.descVi || item.desc : item.desc;
  const group = language === 'vi' ? item.groupVi || item.group : item.group;
  const target = item.route ? `#/${item.route}` : `#/tool/${item.slug}`;
  const locked = Boolean(currentUser && currentUser.role !== 'admin' && !hasToolAccess(currentUser, item.slug));
  const permissionId = getToolPermissionId(item.slug);
  const tone = item.tone || 'blue';
  const profile = getAppDesignProfile(item.slug);
  const styleName = language === 'vi' ? profile.styleVi : profile.style;
  const statusText = language === 'vi' ? item.statusVi || item.status : item.status || item.statusVi;

  return (
    <article
      className={`tool-card app-card-v3 creative-app-card tile-card metro-card tone-${tone} ${item.featured ? 'featured' : ''} ${locked ? 'locked-card' : ''}`.trim()}
      style={{ '--app-accent': profile.accent, '--app-soft': profile.soft, '--app-ink': profile.ink }}
      aria-disabled={locked ? 'true' : 'false'}
    >
      {locked ? <span className="locked-ribbon">{language === 'vi' ? 'Chưa cấp quyền' : 'Locked'}</span> : null}
      <div className="app-card-topline">
        <span className="app-group-chip">{styleName || group}</span>
        <span className="status-badge">{statusText}</span>
      </div>
      <div className="card-head">
        <span className={`app-icon tile-icon tone-${tone}`} aria-hidden="true"><FlatAppIcon type={profile.icon} slug={item.slug} /></span>
        <div className="card-title-copy">
          <h3>{title}</h3>
          <p>{desc}</p>
        </div>
      </div>
      <div className="card-meta compact">
        <span>{locked ? (language === 'vi' ? 'Cần admin duyệt' : 'Admin approval required') : item.api ? (language === 'vi' ? 'Hỗ trợ' : 'AI powered') : (language === 'vi' ? 'Sẵn sàng' : 'Ready')}</span>
        <span>{language === 'vi' ? 'Mở nhanh' : 'Quick launch'}</span>
      </div>
      {locked ? (
        <PermissionRequestButton currentUser={currentUser} permissionId={permissionId} item={item} language={language} />
      ) : (
        <button className="primary full" onClick={(event) => launchTarget(target, item, event.currentTarget)}>
          {language === 'vi' ? 'Mở ứng dụng' : 'Open app'}
        </button>
      )}
    </article>
  );
}
