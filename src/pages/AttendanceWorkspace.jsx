import React from 'react';
import GlobalAttendanceReadOnlyNavigationTab from '../components/GlobalAttendanceReadOnlyNavigationTab.jsx';
import './AttendanceWorkspace.css';
import './AttendanceWorkspaceRebuilt.css';
import './AttendanceWorkspaceHero.css';
import './AttendanceQuickLayoutFix.css';
import './AttendanceMobileAudit.css';
import './AttendanceHistoryIphoneViewportFix.css';

/**
 * A first-class attendance workspace at #/attendance.
 *
 * Reuses the existing authentication, RLS, attendance queries, permissions,
 * and action handlers. The legacy overlay stays available for older event
 * integrations, but normal access is now an inline page, not a modal.
 */
export default function AttendanceWorkspace({currentUser}) {
  return <div className="attendance-workspace-page">
    <GlobalAttendanceReadOnlyNavigationTab currentUser={currentUser} standalone />
  </div>;
}
