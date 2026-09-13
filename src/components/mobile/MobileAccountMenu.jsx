import React, { useEffect } from 'react';
import { Bell, ChevronRight, CircleHelp, LogOut, Settings, UserRound } from 'lucide-react';
import { isAdminRole } from '../../utils/roles.js';
import '../../styles/mobile/mobile-account-menu.css';

function displayName(currentUser) {
  return currentUser?.name || currentUser?.full_name || currentUser?.email || 'Brian English';
}

function userInitial(currentUser) {
  return String(displayName(currentUser)).trim().slice(0, 1).toUpperCase() || 'B';
}

function roleLabel(currentUser) {
  if (isAdminRole(currentUser?.role)) return 'Quản trị viên';
  const role = String(currentUser?.role || '').toLowerCase().replace(/_/g, '-');
  if (['department-head', 'ttcm', 'head'].includes(role)) return 'Tổ trưởng chuyên môn';
  if (['teacher', 'gv', 'giáo-viên'].includes(role)) return 'Giáo viên';
  return 'Thành viên';
}

function MenuItem({ icon: Icon, title, description, onClick, danger = false }) {
  return (
    <button
      type="button"
      className={`bes-mobile-account-menu__item${danger ? ' is-danger' : ''}`}
      onClick={onClick}
      aria-label={title}
    >
      <span className="bes-mobile-account-menu__item-icon" aria-hidden="true"><Icon size={20} strokeWidth={2.1} /></span>
      <span className="bes-mobile-account-menu__item-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      {!danger ? <ChevronRight size={18} strokeWidth={2.2} aria-hidden="true" /> : null}
    </button>
  );
}

export default function MobileAccountMenu({
  open,
  currentUser,
  onClose,
  onProfile,
  onSettings,
  onNotifications,
  onHelp,
  onLogout,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !currentUser) return null;

  return (
    <div
      className="bes-mobile-account-menu-layer"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}
    >
      <section className="bes-mobile-account-menu" role="dialog" aria-label="Menu tài khoản">
        <div className="bes-mobile-account-menu__caret" aria-hidden="true" />
        <header className="bes-mobile-account-menu__profile">
          <span className="bes-mobile-account-menu__avatar" aria-hidden="true">{userInitial(currentUser)}</span>
          <span className="bes-mobile-account-menu__identity">
            <strong>{displayName(currentUser)}</strong>
            <small>{roleLabel(currentUser)}</small>
            {currentUser?.email ? <span>{currentUser.email}</span> : null}
          </span>
        </header>

        <div className="bes-mobile-account-menu__actions">
          <MenuItem icon={UserRound} title="Tài khoản của tôi" description="Xem và chỉnh sửa hồ sơ" onClick={onProfile} />
          <MenuItem icon={Settings} title="Cài đặt" description="Giao diện, ngôn ngữ, tùy chọn" onClick={onSettings} />
          <MenuItem icon={Bell} title="Thông báo" description="Xem thông báo mới" onClick={onNotifications} />
          <MenuItem icon={CircleHelp} title="Trợ giúp & hướng dẫn" description="Hướng dẫn sử dụng, FAQ" onClick={onHelp} />
        </div>

        <div className="bes-mobile-account-menu__logout">
          <MenuItem icon={LogOut} title="Đăng xuất" description="Thoát khỏi tài khoản" onClick={onLogout} danger />
        </div>
      </section>
    </div>
  );
}
