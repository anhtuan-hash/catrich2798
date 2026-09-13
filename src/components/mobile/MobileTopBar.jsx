import React from 'react';
import { Bell, ClipboardCheck, Menu, UserRound } from 'lucide-react';
import { hasAnyAttendanceAccess } from '../../utils/permissions.js';
import { isAdminRole } from '../../utils/roles.js';
import { buildMobileTopbarAction, runMobileNavigationItem } from './mobileNavigation.js';
import '../../pages/AuthPageMobileRedesign.css';
import '../../pages/AuthPageMobileHeroRemoval.css';
import '../../styles/mobile/mobile-ttcm-topbar.css';
import '../../styles/mobile/mobile-brand-logo.css';

function userInitial(currentUser) {
  const source = currentUser?.name || currentUser?.full_name || currentUser?.email || 'B';
  return String(source).trim().slice(0, 1).toUpperCase() || 'B';
}

export default function MobileTopBar({
  title = 'Brian English',
  onMenu,
  onNotifications,
  onAccount,
  currentUser,
  hasUnread = false,
}) {
  const homeBrand = title === 'Trang chủ' || title === 'Home';
  const authBrand = ['Đăng nhập', 'Sign in', 'Đăng ký', 'Register'].includes(title);
  const identityBrand = homeBrand || authBrand;
  const brandTitle = identityBrand ? 'Brian English' : title;
  const brandSubtitle = identityBrand ? 'ENGLISH HUB' : 'Brian English';
  const canAccessAttendance = Boolean(currentUser?.id && (isAdminRole(currentUser?.role) || hasAnyAttendanceAccess(currentUser)));
  const quickAction = buildMobileTopbarAction({
    authenticated: Boolean(currentUser),
    canAccessAttendance,
    language: title === 'Home' ? 'en' : 'vi',
  });
  const attendanceQuickAction = quickAction?.id === 'attendance';

  const handleTtcm = () => {
    window.dispatchEvent(new CustomEvent('bes-ttcm-open', { detail: { view: 'feed' } }));
  };

  const handleQuickAction = () => {
    if (attendanceQuickAction) {
      runMobileNavigationItem(quickAction);
      return;
    }
    onNotifications?.();
  };

  return (
    <header className={`bes-mobile-topbar${homeBrand ? ' is-home' : ''}${authBrand ? ' is-auth' : ''}`} data-bes-mobile-topbar="true">
      <button type="button" className="bes-mobile-icon-button" onClick={onMenu} aria-label="Mở menu">
        <Menu size={22} strokeWidth={2.2} />
      </button>

      <button
        type="button"
        className={`bes-mobile-brand${homeBrand ? ' is-home' : ''}${authBrand ? ' is-auth' : ''}`}
        data-home-brand={homeBrand ? 'true' : undefined}
        data-auth-brand={authBrand ? 'true' : undefined}
        onClick={onMenu}
        aria-label="Mở điều hướng Brian English"
      >
        <span className="bes-mobile-brand__mark" aria-hidden="true">
          <img className="bes-mobile-brand__logo" src="/brian-english-brand-logo.png" alt="" />
        </span>
        <span className="bes-mobile-brand__copy">
          <strong>{brandTitle}</strong>
          <small>{brandSubtitle}</small>
        </span>
      </button>

      <div className="bes-mobile-topbar__actions">
        {currentUser ? (
          <button type="button" className="bes-mobile-ttcm-button" onClick={handleTtcm} aria-label="TTCM">
            TTCM
          </button>
        ) : null}
        {currentUser && quickAction ? (
          <button
            type="button"
            className={`bes-mobile-icon-button ${attendanceQuickAction ? 'bes-mobile-attendance-button' : 'bes-mobile-notification-button'}`}
            onClick={handleQuickAction}
            aria-label={quickAction.label}
          >
            {attendanceQuickAction
              ? <ClipboardCheck size={21} strokeWidth={2.2} />
              : <Bell size={21} strokeWidth={2.2} />}
            {!attendanceQuickAction && hasUnread ? <span className="bes-mobile-unread-dot" aria-hidden="true" /> : null}
          </button>
        ) : null}
        <button type="button" className="bes-mobile-avatar-button" onClick={onAccount} aria-label={currentUser ? 'Tài khoản' : 'Đăng nhập'}>
          {currentUser ? <span>{userInitial(currentUser)}</span> : <UserRound size={20} />}
        </button>
      </div>
    </header>
  );
}
