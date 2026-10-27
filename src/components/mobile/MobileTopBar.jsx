import React from 'react';
import { Bell, CalendarCheck2, FileText, Menu, UserRound, UsersRound } from 'lucide-react';
import '../../pages/AuthPageMobileRedesign.css';
import '../../pages/AuthPageMobileHeroRemoval.css';
import '../../styles/mobile/mobile-brand-logo.css';

function userInitial(currentUser) {
  const source = currentUser?.name || currentUser?.full_name || currentUser?.email || 'B';
  return String(source).trim().slice(0, 1).toUpperCase() || 'B';
}

/**
 * Site-wide mobile quick navigation: Menu, original BRIAN logo,
 * Reports, TTCM, Attendance, Notifications and Account.
 * Keep verbose page/module titles inside their own content instead.
 */
export default function MobileTopBar({
  language = 'vi',
  onMenu,
  onHome,
  onReports,
  onTtcm,
  onAttendance,
  onNotifications,
  onAccount,
  accountOpen = false,
  currentUser,
  canAccessReports = false,
  canAccessTtcm = false,
  canAccessAttendance = false,
  reportActive = false,
  attendanceActive = false,
  hasUnread = false,
}) {
  const vi = language !== 'en';
  const quickLabel = {
    reports: vi ? 'Báo cáo' : 'Reports',
    ttcm: vi ? 'TTCM · Trao đổi tổ' : 'Department communications',
    attendance: vi ? 'Điểm danh' : 'Attendance',
    notifications: vi ? 'Thông báo' : 'Notifications',
  };

  return (
    <header className="bes-mobile-topbar bes-mobile-topbar--compact" data-bes-mobile-topbar="true">
      <button
        type="button"
        className="bes-mobile-icon-button bes-mobile-topbar__menu"
        onClick={onMenu}
        aria-label={vi ? 'Mở menu điều hướng' : 'Open navigation menu'}
        title={vi ? 'Menu' : 'Menu'}
      >
        <Menu size={21} strokeWidth={2.1} />
      </button>

      <button
        type="button"
        className="bes-mobile-brand bes-mobile-brand--compact"
        onClick={onHome}
        aria-label={vi ? 'Về Trang chủ' : 'Go to Home'}
        title={vi ? 'Trang chủ' : 'Home'}
      >
        <span className="bes-mobile-brand__mark" aria-hidden="true">
          <img className="bes-mobile-brand__logo" src="/brian-english-brand-logo.png" alt="" />
        </span>
      </button>

      <nav className="bes-mobile-topbar__actions" aria-label={vi ? 'Truy cập nhanh' : 'Quick access'}>
        {currentUser && canAccessReports ? (
          <button
            type="button"
            className={`bes-mobile-icon-button bes-mobile-topbar__reports${reportActive ? ' is-active' : ''}`}
            onClick={onReports}
            aria-label={quickLabel.reports}
            title={quickLabel.reports}
            aria-current={reportActive ? 'page' : undefined}
          >
            <FileText size={21} strokeWidth={2.1} />
          </button>
        ) : null}
        {currentUser && canAccessTtcm ? (
          <button
            type="button"
            className="bes-mobile-icon-button bes-mobile-topbar__ttcm"
            onClick={onTtcm}
            aria-label={quickLabel.ttcm}
            title={quickLabel.ttcm}
            aria-haspopup="dialog"
          >
            <UsersRound size={22} strokeWidth={2.05} />
            <small aria-hidden="true">TTCM</small>
          </button>
        ) : null}
        {currentUser && canAccessAttendance ? (
          <button
            type="button"
            className={`bes-mobile-icon-button bes-mobile-topbar__attendance${attendanceActive ? ' is-active' : ''}`}
            onClick={onAttendance}
            aria-label={quickLabel.attendance}
            title={quickLabel.attendance}
            aria-current={attendanceActive ? 'page' : undefined}
          >
            <CalendarCheck2 size={21} strokeWidth={2.1} />
          </button>
        ) : null}
        {currentUser ? (
          <button
            type="button"
            className="bes-mobile-icon-button bes-mobile-notification-button"
            onClick={onNotifications}
            aria-label={quickLabel.notifications}
            title={quickLabel.notifications}
          >
            <Bell size={21} strokeWidth={2.1} />
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
      </nav>
    </header>
  );
}
