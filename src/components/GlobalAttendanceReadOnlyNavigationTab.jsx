import GlobalAttendanceNavigationTab from './GlobalAttendanceNavigationTab.jsx';
import { withAttendanceReadOnlyAccess } from '../utils/attendanceReadonlyAccess.js';

/**
 * Global Attendance entry point.
 *
 * Every authenticated account receives Calendar + History visibility here.
 * Existing explicit Attendance permissions remain untouched, so quick
 * attendance, class management and reports continue to be available only to
 * accounts that already have those grants (or admins, as handled downstream).
 */
export default function GlobalAttendanceReadOnlyNavigationTab({ currentUser, ...props }) {
  const attendanceUser = withAttendanceReadOnlyAccess(currentUser);
  return <GlobalAttendanceNavigationTab {...props} currentUser={attendanceUser} />;
}
