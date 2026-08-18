import React from 'react';
import './tokens.css';
import './BrianV2Shell.css';

const NAV_GROUPS = [
  {
    label: 'TEACH',
    items: [
      { icon: '⌂', label: 'Trang chủ', id: 'home', ready: true },
      { icon: '▦', label: 'Ứng dụng', id: 'apps', ready: true },
      { icon: '◫', label: 'Teaching tools', id: 'teaching-tools', ready: true },
      { icon: '▶', label: 'Trò chơi', id: 'games' },
      { icon: '▤', label: 'Kho học liệu', id: 'resources' },
    ],
  },
  {
    label: 'MANAGE',
    items: [
      { icon: '◎', label: 'Chủ nhiệm', id: 'homeroom', ready: true },
      { icon: '♙', label: 'Lớp học', id: 'classes' },
      { icon: '▥', label: 'Học sinh', id: 'students' },
    ],
  },
  {
    label: 'WORK',
    items: [
      { icon: '◧', label: 'Dashboard', id: 'dashboard', ready: true },
      { icon: '▱', label: 'Báo cáo', id: 'reports' },
      { icon: '◇', label: 'UI Lab', id: 'ui-lab', ready: true, private: true },
    ],
  },
];

const byId = Object.fromEntries(NAV_GROUPS.flatMap((group) => group.items).map((item) => [item.id, item]));
const MOBILE_ITEMS = ['home', 'apps', 'homeroom', 'dashboard'].map((id) => byId[id]);

export default function BrianV2Shell({ children, active = 'home', onNavigate, currentUser = null }) {
  const navigate = (item) => {
    if (!item.ready) return;
    onNavigate?.(item.id);
  };

  return (
    <div className="brian-v2 b2-shell" data-brian-ui="v2">
      <aside className="b2-rail" aria-label="Brian Metro Next navigation">
        <div className="b2-brand">
          <div className="b2-brand-mark">B</div>
          <div>
            <strong>Brian English</strong>
            <span>Teaching OS</span>
          </div>
        </div>

        <nav className="b2-nav">
          {NAV_GROUPS.map((group) => (
            <section className="b2-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => (
                <button
                  className={`b2-nav-item ${active === item.id ? 'is-active' : ''} ${item.ready ? '' : 'is-pending'} ${item.private ? 'is-private' : ''}`.trim()}
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item)}
                  aria-disabled={!item.ready}
                  title={item.ready ? item.label : `${item.label} · chưa migrate sang V2`}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <strong>{item.label}</strong>
                  {item.private ? <em>LAB</em> : !item.ready ? <em>SOON</em> : null}
                </button>
              ))}
            </section>
          ))}
        </nav>

        <div className="b2-rail-footer">
          <button className="b2-nav-item is-pending" type="button" aria-disabled="true"><span>⚙</span><strong>Cài đặt</strong><em>SOON</em></button>
        </div>
      </aside>

      <div className="b2-main">
        <header className="b2-topbar">
          <button className="b2-command-search" type="button" aria-label="Tìm kiếm toàn Brian">
            <span aria-hidden="true">⌕</span>
            <span>Tìm lớp học, học sinh, công cụ…</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="b2-top-actions">
            <button className="b2-icon-btn" type="button" aria-label="Thông báo">♢</button>
            <button className="b2-profile" type="button">
              <span className="b2-avatar">T</span>
              <span><strong>{currentUser?.name || 'Tuấn'}</strong><small>Giáo viên</small></span>
              <span>⌄</span>
            </button>
          </div>
        </header>

        <main className="b2-workspace">{children}</main>
      </div>

      <nav className="b2-mobile-nav" aria-label="Điều hướng V2 trên điện thoại">
        {MOBILE_ITEMS.map((item) => (
          <button key={item.id} type="button" className={active === item.id ? 'is-active' : ''} onClick={() => navigate(item)}>
            <span aria-hidden="true">{item.icon}</span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </nav>
    </div>
  );
}
