import React, { useEffect, useState } from 'react';
import './tokens.css';
import './BrianV2Shell.css';
import './B2PermissionPreview.css';
import { B2CommandPalette, B2NotificationCenter, B2ProfileMenu } from './components/B2GlobalOverlays.jsx';
import { canPreviewTarget, getPreviewRoleMeta, normalizePreviewRole } from './previewPermissions.js';

const NAV_GROUPS = [
  {
    label: 'TEACH',
    items: [
      { icon: '⌂', label: 'Trang chủ', id: 'home', ready: true },
      { icon: '▦', label: 'Ứng dụng', id: 'apps', ready: true },
      { icon: '◫', label: 'Teaching tools', id: 'teaching-tools', ready: true },
      { icon: '▶', label: 'Trò chơi', id: 'games', ready: true },
      { icon: '▤', label: 'Kho học liệu', id: 'resources', ready: true },
    ],
  },
  {
    label: 'MANAGE',
    items: [
      { icon: '◎', label: 'Chủ nhiệm', id: 'homeroom', ready: true },
      { icon: '♙', label: 'Lớp học', id: 'classes', ready: true },
      { icon: '▥', label: 'Học sinh', id: 'students', ready: true },
    ],
  },
  {
    label: 'WORK',
    items: [
      { icon: '◧', label: 'Dashboard', id: 'dashboard', ready: true },
      { icon: '▱', label: 'Báo cáo', id: 'reports', ready: true },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { icon: '◇', label: 'Quản trị', id: 'admin', ready: true },
      { icon: '◈', label: 'UI Lab', id: 'ui-lab', ready: true, private: true },
    ],
  },
];

const byId = Object.fromEntries(NAV_GROUPS.flatMap((group) => group.items).map((item) => [item.id, item]));
const MOBILE_ITEMS = ['home', 'apps', 'homeroom', 'dashboard'].map((id) => byId[id]);

export default function BrianV2Shell({ children, active = 'home', onNavigate, currentUser = null, previewRole = 'teacher', onPreviewRoleChange }) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const role = normalizePreviewRole(previewRole);
  const roleMeta = getPreviewRoleMeta(role);
  const canOpen = (target) => canPreviewTarget(role, target);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setNotificationsOpen(false);
        setProfileOpen(false);
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const navigate = (item) => {
    if (!item?.ready || !canOpen(item.id)) return;
    setNotificationsOpen(false);
    setProfileOpen(false);
    onNavigate?.(item.id);
  };
  const navigateId = (id) => {
    if (!canOpen(id)) return;
    onNavigate?.(id);
  };

  return (
    <div className="brian-v2 b2-shell" data-brian-ui="v2" data-preview-role={role}>
      <aside className="b2-rail" aria-label="Brian Metro Next navigation">
        <div className="b2-brand">
          <div className="b2-brand-mark">B</div>
          <div><strong>Brian English</strong><span>Teaching OS</span></div>
        </div>

        <nav className="b2-nav">
          {NAV_GROUPS.map((group) => (
            <section className="b2-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const allowed = canOpen(item.id);
                return (
                  <button
                    className={`b2-nav-item ${active === item.id ? 'is-active' : ''} ${item.ready ? '' : 'is-pending'} ${item.private ? 'is-private' : ''} ${allowed ? '' : 'is-locked'}`.trim()}
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item)}
                    aria-disabled={!item.ready || !allowed}
                    title={!allowed ? `${item.label} · khóa trong role preview ${roleMeta.label}` : item.ready ? item.label : `${item.label} · chưa migrate sang V2`}
                  >
                    <span aria-hidden="true">{item.icon}</span><strong>{item.label}</strong>
                    {!allowed ? <em>LOCK</em> : item.private ? <em>LAB</em> : !item.ready ? <em>SOON</em> : null}
                  </button>
                );
              })}
            </section>
          ))}
        </nav>

        <div className="b2-rail-footer">
          <button className={`b2-nav-item ${active === 'settings' ? 'is-active' : ''}`} type="button" onClick={() => navigateId('settings')}>
            <span>⚙</span><strong>Cài đặt</strong>
          </button>
        </div>
      </aside>

      <div className="b2-main">
        <header className="b2-topbar">
          <button className="b2-command-search" type="button" aria-label="Tìm kiếm toàn Brian" onClick={() => { setNotificationsOpen(false); setProfileOpen(false); setCommandOpen(true); }}>
            <span aria-hidden="true">⌕</span><span>Tìm lớp học, học sinh, công cụ…</span><kbd>⌘ K</kbd>
          </button>
          <div className="b2-top-actions">
            <span className="b2-role-chip">{roleMeta.shortLabel}</span>
            <button className={`b2-icon-btn ${notificationsOpen ? 'is-active' : ''}`} type="button" aria-label="Thông báo" onClick={() => { setProfileOpen(false); setNotificationsOpen((value) => !value); }}>♢</button>
            <button className={`b2-profile ${profileOpen ? 'is-active' : ''}`} type="button" onClick={() => { setNotificationsOpen(false); setProfileOpen((value) => !value); }}>
              <span className="b2-avatar">T</span>
              <span><strong>{currentUser?.name || 'Tuấn'}</strong><small>{roleMeta.label}</small></span><span>⌄</span>
            </button>
          </div>
        </header>
        <main className="b2-workspace">{children}</main>
      </div>

      <nav className="b2-mobile-nav" aria-label="Điều hướng V2 trên điện thoại">
        {MOBILE_ITEMS.map((item) => (
          <button key={item.id} type="button" className={active === item.id ? 'is-active' : ''} onClick={() => navigate(item)}>
            <span aria-hidden="true">{item.icon}</span><strong>{item.label}</strong>
          </button>
        ))}
      </nav>

      <B2CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={navigateId} canOpen={canOpen} />
      <B2NotificationCenter open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <B2ProfileMenu
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onNavigate={navigateId}
        role={role}
        roleMeta={roleMeta}
        onRoleChange={onPreviewRoleChange}
        canOpen={canOpen}
      />
    </div>
  );
}
