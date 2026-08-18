import React, { useEffect, useMemo, useState } from 'react';
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
      { icon: '⌕', label: 'Knowledge Hub', id: 'knowledge-hub', ready: true },
      { icon: '▥', label: 'News & Reading', id: 'news', ready: true },
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
      { icon: '◷', label: 'Work Hub', id: 'work-hub', ready: true },
      { icon: '◇', label: 'Assessment', id: 'assessment', ready: true },
      { icon: '∞', label: 'Cộng tác', id: 'collaboration', ready: true },
      { icon: '▱', label: 'Báo cáo', id: 'reports', ready: true },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { icon: '◇', label: 'Quản trị', id: 'admin', ready: true },
      { icon: '☁', label: 'Cloud & Data', id: 'cloud', ready: true },
      { icon: '◈', label: 'UI Lab', id: 'ui-lab', ready: true, private: true },
    ],
  },
];

const byId = Object.fromEntries(NAV_GROUPS.flatMap((group) => group.items).map((item) => [item.id, item]));
const MOBILE_ITEMS = ['home', 'apps', 'homeroom', 'dashboard'].map((id) => byId[id]);

function personInitials(user) {
  const words = String(user?.name || user?.email || 'T').trim().split(/\s+/).filter(Boolean);
  return `${words[0]?.[0] || 'T'}${words.length > 1 ? words[words.length - 1]?.[0] || '' : ''}`.toUpperCase();
}

function focusMain() {
  document.getElementById('brian-v2-main')?.focus({ preventScroll: true });
}

export default function BrianV2Shell({
  children,
  active = 'home',
  onNavigate,
  currentUser = null,
  previewRole = 'teacher',
  onPreviewRoleChange,
  permissionMode = 'preview',
  roleMeta: roleMetaProp = null,
  canOpenTarget,
}) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const role = normalizePreviewRole(previewRole);
  const roleMeta = roleMetaProp || getPreviewRoleMeta(role);
  const canOpen = useMemo(() => (
    typeof canOpenTarget === 'function'
      ? canOpenTarget
      : (target) => canPreviewTarget(role, target)
  ), [canOpenTarget, role]);

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

  useEffect(() => {
    const frame = window.requestAnimationFrame(focusMain);
    return () => window.cancelAnimationFrame(frame);
  }, [active]);

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
    <div className="brian-v2 b2-shell" data-brian-ui="v2" data-permission-mode={permissionMode} data-preview-role={roleMeta.id || role}>
      <a className="b2-skip-link" href="#brian-v2-main" onClick={(event) => { event.preventDefault(); focusMain(); }}>Bỏ qua điều hướng, đến nội dung chính</a>
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
                    aria-current={active === item.id ? 'page' : undefined}
                    title={!allowed ? `${item.label} · không có quyền trong phiên hiện tại` : item.ready ? item.label : `${item.label} · chưa migrate sang V2`}
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
          <button className={`b2-nav-item ${active === 'settings' ? 'is-active' : ''} ${canOpen('settings') ? '' : 'is-locked'}`} type="button" onClick={() => navigateId('settings')} aria-disabled={!canOpen('settings')} aria-current={active === 'settings' ? 'page' : undefined}>
            <span aria-hidden="true">⚙</span><strong>Cài đặt</strong>{!canOpen('settings') ? <em>LOCK</em> : null}
          </button>
        </div>
      </aside>

      <div className="b2-main">
        <header className="b2-topbar">
          <button className="b2-command-search" type="button" aria-label="Tìm kiếm toàn Brian" onClick={() => { setNotificationsOpen(false); setProfileOpen(false); setCommandOpen(true); }}>
            <span aria-hidden="true">⌕</span><span>Tìm lớp học, học sinh, công cụ…</span><kbd>⌘ K</kbd>
          </button>
          <div className="b2-top-actions">
            <span className={`b2-role-chip ${permissionMode === 'real' ? 'is-real' : ''}`} title={roleMeta.summary || roleMeta.description}>{roleMeta.shortLabel}{permissionMode === 'real' ? ' · LIVE' : ''}</span>
            <button className={`b2-icon-btn ${notificationsOpen ? 'is-active' : ''}`} type="button" aria-label="Thông báo" aria-expanded={notificationsOpen} onClick={() => { setProfileOpen(false); setNotificationsOpen((value) => !value); }}>♢</button>
            <button className={`b2-profile ${profileOpen ? 'is-active' : ''}`} type="button" aria-label="Mở menu tài khoản" aria-expanded={profileOpen} onClick={() => { setNotificationsOpen(false); setProfileOpen((value) => !value); }}>
              <span className="b2-avatar">{personInitials(currentUser)}</span>
              <span><strong>{currentUser?.name || currentUser?.email || 'Shadow Preview'}</strong><small>{roleMeta.label}</small></span><span aria-hidden="true">⌄</span>
            </button>
          </div>
        </header>
        <main id="brian-v2-main" className="b2-workspace" tabIndex={-1}>{children}</main>
      </div>

      <nav className="b2-mobile-nav" aria-label="Điều hướng V2 trên điện thoại">
        {MOBILE_ITEMS.map((item) => (
          <button key={item.id} type="button" className={active === item.id ? 'is-active' : ''} onClick={() => navigate(item)} disabled={!canOpen(item.id)} aria-current={active === item.id ? 'page' : undefined}>
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
        role={roleMeta.id || role}
        roleMeta={roleMeta}
        onRoleChange={onPreviewRoleChange}
        canOpen={canOpen}
        currentUser={currentUser}
        permissionMode={permissionMode}
      />
    </div>
  );
}
