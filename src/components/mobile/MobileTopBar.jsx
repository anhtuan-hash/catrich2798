import React from 'react';
import { Bell, Menu, Search, UserRound } from 'lucide-react';

function userInitial(currentUser) {
  const source = currentUser?.name || currentUser?.full_name || currentUser?.email || 'B';
  return String(source).trim().slice(0, 1).toUpperCase() || 'B';
}

export default function MobileTopBar({
  title = 'Brian English',
  onMenu,
  onSearch,
  onNotifications,
  onAccount,
  currentUser,
  hasUnread = false,
}) {
  const homeBrand = title === 'Trang chủ' || title === 'Home';
  const brandTitle = homeBrand ? 'Brian English' : title;
  const brandSubtitle = homeBrand ? 'ENGLISH HUB' : 'Brian English';

  return (
    <header className={`bes-mobile-topbar${homeBrand ? ' is-home' : ''}`} data-bes-mobile-topbar="true">
      <button type="button" className="bes-mobile-icon-button" onClick={onMenu} aria-label="Mở menu">
        <Menu size={22} strokeWidth={2.2} />
      </button>

      <button
        type="button"
        className={`bes-mobile-brand${homeBrand ? ' is-home' : ''}`}
        data-home-brand={homeBrand ? 'true' : undefined}
        onClick={onMenu}
        aria-label="Mở điều hướng Brian English"
      >
        {homeBrand ? (
          <span className="bes-mobile-brand__mark bes-mobile-brand__mark--logo" aria-hidden="true">
            <img src="/favicon.png" alt="" />
          </span>
        ) : <span className="bes-mobile-brand__mark" aria-hidden="true">B</span>}
        <span className="bes-mobile-brand__copy">
          <strong>{brandTitle}</strong>
          <small>{brandSubtitle}</small>
        </span>
      </button>

      <div className="bes-mobile-topbar__actions">
        {!homeBrand ? (
          <button type="button" className="bes-mobile-icon-button" onClick={onSearch} aria-label="Tìm kiếm">
            <Search size={21} strokeWidth={2.2} />
          </button>
        ) : null}
        {currentUser && !homeBrand ? (
          <button type="button" className="bes-mobile-icon-button bes-mobile-notification-button" onClick={onNotifications} aria-label="Thông báo">
            <Bell size={21} strokeWidth={2.2} />
            {hasUnread ? <span className="bes-mobile-unread-dot" aria-hidden="true" /> : null}
          </button>
        ) : null}
        <button type="button" className="bes-mobile-avatar-button" onClick={onAccount} aria-label={currentUser ? 'Tài khoản' : 'Đăng nhập'}>
          {currentUser ? <span>{userInitial(currentUser)}</span> : <UserRound size={20} />}
        </button>
      </div>
    </header>
  );
}
