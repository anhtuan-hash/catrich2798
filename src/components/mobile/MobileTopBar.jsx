import React from 'react';
import { Bell, FileText, Menu, Search, UserRound } from 'lucide-react';
import '../../pages/AuthPageMobileRedesign.css';
import '../../pages/AuthPageMobileHeroRemoval.css';
import '../../styles/mobile/mobile-brand-logo.css';

function userInitial(currentUser) {
  const source = currentUser?.name || currentUser?.full_name || currentUser?.email || 'B';
  return String(source).trim().slice(0, 1).toUpperCase() || 'B';
}

/**
 * A single compact, global mobile toolbar. Module titles belong to each
 * module's own page header, not the site navigation.
 */
export default function MobileTopBar({
  language = 'vi',
  onMenu,
  onHome,
  onSearch,
  onReports,
  onNotifications,
  onAccount,
  accountOpen = false,
  currentUser,
  canAccessReports = false,
  reportActive = false,
  hasUnread = false,
}) {
  const vi = language !== 'en';
  return (
    <header className="bes-mobile-topbar bes-mobile-topbar--compact" data-bes-mobile-topbar="true">
      <button
        type="button"
        className="bes-mobile-icon-button bes-mobile-topbar__menu"
        onClick={onMenu}
        aria-label={vi ? 'Mở menu điều hướng' : 'Open navigation'}
        title={vi ? 'Menu' : 'Menu'}
      >
        <Menu size={21} strokeWidth={2.1} />
      </button>

      <button
        type="button"
        className="bes-mobile-brand bes-mobile-brand--compact"
        onClick={onHome}
        aria-label={vi ? 'Về Trang chủ Brian English' : 'Go to Brian English Home'}
        title={vi ? 'Trang chủ' : 'Home'}
      >
        <span className="bes-mobile-brand__mark" aria-hidden="true">
          <img className="bes-mobile-brand__logo" src="/brian-english-brand-logo.png" alt="" />
        </span>
        <span className="bes-mobile-brand__copy"><strong>BRIAN</strong></span>
      </button>

      <div className="bes-mobile-topbar__actions">
        {currentUser ? (
          <button
            type="button"
            className="bes-mobile-icon-button bes-mobile-topbar__search"
            onClick={onSearch}
            aria-label={vi ? 'Tìm kiếm' : 'Search'}
            title={vi ? 'Tìm kiếm' : 'Search'}
          >
            <Search size={20} strokeWidth={2} />
          </button>
        ) : null}
        {currentUser && canAccessReports ? (
          <button
            type="button"
            className={`bes-mobile-icon-button bes-mobile-topbar__reports${reportActive ? ' is-active' : ''}`}
            onClick={onReports}
            aria-label={vi ? 'Mở Báo cáo' : 'Open Reports'}
            title={vi ? 'Báo cáo' : 'Reports'}
            aria-current={reportActive ? 'page' : undefined}
          >
            <FileText size={20} strokeWidth={2} />
          </button>
        ) : null}
        {currentUser ? (
          <button
            type="button"
            className="bes-mobile-icon-button bes-mobile-notification-button"
            onClick={onNotifications}
            aria-label={vi ? 'Thông báo' : 'Notifications'}
            title={vi ? 'Thông báo' : 'Notifications'}
          >
            <Bell size={20} strokeWidth={2} />
            {hasUnread ? <span className="bes-mobile-unread-dot" aria-hidden="true" /> : null}
          </button>
        ) : null}
        <button
          type="button"
          className="bes-mobile-avatar-button"
          onClick={onAccount}
          aria-label={currentUser ? (vi ? 'Tài khoản' : 'Account') : (vi ? 'Đăng nhập' : 'Sign in')}
          aria-haspopup={currentUser ? 'dialog' : undefined}
          aria-expanded={currentUser ? accountOpen : undefined}
          title={currentUser ? (vi ? 'Tài khoản' : 'Account') : (vi ? 'Đăng nhập' : 'Sign in')}
        >
          {currentUser ? <span>{userInitial(currentUser)}</span> : <UserRound size={20} />}
        </button>
      </div>
    </header>
  );
}
