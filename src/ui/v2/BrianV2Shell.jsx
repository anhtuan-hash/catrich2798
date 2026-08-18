import React from 'react';
import './tokens.css';
import './BrianV2Shell.css';

const NAV_GROUPS = [
  {
    label: 'TEACH',
    items: [
      ['⌂', 'Trang chủ'],
      ['▦', 'Ứng dụng'],
      ['◫', 'Teaching tools'],
      ['▶', 'Trò chơi'],
      ['▤', 'Kho học liệu'],
    ],
  },
  {
    label: 'MANAGE',
    items: [
      ['◎', 'Chủ nhiệm'],
      ['♙', 'Lớp học'],
      ['▥', 'Học sinh'],
    ],
  },
  {
    label: 'WORK',
    items: [
      ['◧', 'Dashboard'],
      ['▱', 'Báo cáo'],
    ],
  },
];

export default function BrianV2Shell({ children, active = 'Trang chủ', currentUser = null }) {
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
              {group.items.map(([icon, label]) => (
                <button className={`b2-nav-item ${active === label ? 'is-active' : ''}`} key={label} type="button">
                  <span aria-hidden="true">{icon}</span>
                  <strong>{label}</strong>
                </button>
              ))}
            </section>
          ))}
        </nav>

        <div className="b2-rail-footer">
          <button className="b2-nav-item" type="button"><span>⚙</span><strong>Cài đặt</strong></button>
        </div>
      </aside>

      <div className="b2-main">
        <header className="b2-topbar">
          <div className="b2-command-search">
            <span aria-hidden="true">⌕</span>
            <span>Tìm lớp học, học sinh, công cụ…</span>
            <kbd>⌘ K</kbd>
          </div>
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
    </div>
  );
}
