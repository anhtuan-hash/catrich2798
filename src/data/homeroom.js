export const HOMEROOM_ROUTE = 'homeroom';
export const HOMEROOM_PERMISSION_ID = 'route:homeroom';

export const HOMEROOM_APP = {
  slug: 'homeroom-hub',
  route: HOMEROOM_ROUTE,
  icon: 'HR',
  tone: 'green',
  group: 'Class Management',
  groupVi: 'Công tác chủ nhiệm',
  title: 'Homeroom Teacher Workspace',
  titleVi: 'Giáo viên chủ nhiệm',
  desc: 'Manage student profiles, attendance, weekly work, class meetings, parent communication and homeroom reports.',
  descVi: 'Quản lý hồ sơ học sinh, điểm danh, lịch tuần, sinh hoạt lớp, liên lạc phụ huynh và báo cáo chủ nhiệm.',
  status: 'Complete · Offline-first homeroom workspace',
  statusVi: 'Hoàn thiện · Nhận diện ngoại tuyến, không dùng AI',
  api: false,
  featured: true,
};

export const HOMEROOM_PERMISSION_ITEM = {
  id: HOMEROOM_PERMISSION_ID,
  type: 'homeroom',
  section: 'homeroom',
  title: 'Homeroom Teacher Workspace',
  titleVi: 'Không gian Giáo viên chủ nhiệm',
  desc: 'Manage the signed-in teacher’s homeroom class, students, attendance, schedules, parent contacts and reports.',
  descVi: 'Quản lý lớp chủ nhiệm, học sinh, điểm danh, lịch công việc, liên lạc phụ huynh và báo cáo theo tài khoản giáo viên.',
};

export const HOMEROOM_TABS = [
  { key: 'overview', icon: '▦', titleVi: 'Tổng quan', title: 'Overview' },
  { key: 'classes', icon: '▥', titleVi: 'Lớp & năm học', title: 'Classes & years' },
  { key: 'search', icon: '⌕', titleVi: 'Tìm kiếm', title: 'Search' },
  { key: 'students', icon: '♙', titleVi: 'Học sinh', title: 'Students' },
  { key: 'support', icon: '◎', titleVi: 'Hỗ trợ HS', title: 'Student support' },
  { key: 'attendance', icon: '✓', titleVi: 'Điểm danh', title: 'Attendance' },
  { key: 'learning', icon: '∑', titleVi: 'Học tập', title: 'Learning analytics' },
  { key: 'feedback', icon: '↔', titleVi: 'GV bộ môn', title: 'Subject feedback' },
  { key: 'competition', icon: '◆', titleVi: 'Thi đua', title: 'Competition' },
  { key: 'conduct', icon: '100', titleVi: 'Rèn luyện', title: 'Conduct' },
  { key: 'schedule', icon: '◷', titleVi: 'Lịch công việc', title: 'Schedule' },
  { key: 'meetings', icon: '☰', titleVi: 'Sinh hoạt lớp', title: 'Class meetings' },
  { key: 'parents', icon: '✉', titleVi: 'Phụ huynh', title: 'Parents' },
  { key: 'announcements', icon: '☷', titleVi: 'Thông báo', title: 'Announcements' },
  { key: 'portals', icon: '◎', titleVi: 'Cổng kết nối', title: 'Portals' },
  { key: 'records', icon: '▤', titleVi: 'Hồ sơ & báo cáo', title: 'Records' },
  { key: 'safety', icon: '⌾', titleVi: 'An toàn dữ liệu', title: 'Data safety' },
  { key: 'schoolStats', icon: '▥', titleVi: 'Toàn trường', title: 'School statistics', adminOnly: true },
];

export const ATTENDANCE_STATUSES = [
  { id: 'present', labelVi: 'Có mặt', label: 'Present', symbol: '✓' },
  { id: 'late', labelVi: 'Đi trễ', label: 'Late', symbol: '◷' },
  { id: 'excused', labelVi: 'Vắng phép', label: 'Excused', symbol: 'P' },
  { id: 'unexcused', labelVi: 'Vắng không phép', label: 'Unexcused', symbol: '!' },
  { id: 'early', labelVi: 'Về sớm', label: 'Left early', symbol: '↗' },
];

export const SCHEDULE_CATEGORIES = [
  'Sinh hoạt lớp', 'Họp phụ huynh', 'Kiểm tra', 'Hoạt động trải nghiệm',
  'Ngoại khóa', 'Lao động', 'Trực tuần', 'Tư vấn học sinh', 'Hồ sơ', 'Khác',
];

export const CONTACT_CHANNELS = ['Zalo', 'Điện thoại', 'Email', 'Trực tiếp', 'Tin nhắn', 'Khác'];
export const RECORD_TYPES = ['Báo cáo tuần', 'Báo cáo tháng', 'Kế hoạch chủ nhiệm', 'Biên bản sinh hoạt lớp', 'Biên bản họp phụ huynh', 'Danh sách học sinh', 'Báo cáo chuyên cần', 'Nhận xét học sinh'];
