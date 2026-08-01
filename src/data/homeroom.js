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
  desc: 'Manage class information, students, attendance, learning, competition and conduct.',
  descVi: 'Quản lý thông tin lớp, học sinh, điểm danh, học tập, thi đua và rèn luyện.',
  status: 'Focused · Offline-first homeroom workspace',
  statusVi: 'Tinh gọn · Nhận diện ngoại tuyến, không dùng AI',
  api: false,
  featured: true,
};

export const HOMEROOM_PERMISSION_ITEM = {
  id: HOMEROOM_PERMISSION_ID,
  type: 'homeroom',
  section: 'homeroom',
  title: 'Homeroom Teacher Workspace',
  titleVi: 'Không gian Giáo viên chủ nhiệm',
  desc: 'Manage the signed-in teacher’s class, students, attendance, learning, competition and conduct.',
  descVi: 'Quản lý lớp chủ nhiệm, học sinh, điểm danh, học tập, thi đua và rèn luyện theo tài khoản giáo viên.',
};

export const HOMEROOM_TABS = [
  { key: 'overview', icon: '▦', titleVi: 'Tổng quan', title: 'Overview' },
  { key: 'classes', icon: '▥', titleVi: 'Lớp & năm học', title: 'Classes & years' },
  { key: 'search', icon: '⌕', titleVi: 'Tìm kiếm', title: 'Search' },
  { key: 'students', icon: '♙', titleVi: 'Học sinh', title: 'Students' },
  { key: 'attendance', icon: '✓', titleVi: 'Điểm danh', title: 'Attendance' },
  { key: 'learning', icon: '∑', titleVi: 'Học tập', title: 'Learning analytics' },
  { key: 'feedback', icon: '↔', titleVi: 'GV bộ môn', title: 'Subject feedback' },
  { key: 'competition', icon: '◆', titleVi: 'Thi đua', title: 'Competition' },
  { key: 'conduct', icon: '100', titleVi: 'Rèn luyện', title: 'Conduct' },
  { key: 'portals', icon: '◎', titleVi: 'Cổng kết nối', title: 'Portals' },
  { key: 'safety', icon: '⌾', titleVi: 'An toàn dữ liệu', title: 'Data safety' },
  { key: 'schoolStats', icon: '▥', titleVi: 'Toàn trường', title: 'School statistics', adminOnly: true },
];

export const ATTENDANCE_STATUSES = [
  { id: 'present', labelVi: 'Có mặt', label: 'Present', symbol: '✓' },
  { id: 'late', labelVi: 'Đi trễ', label: 'Late', symbol: '◷' },
  { id: 'excused', labelVi: 'Vắng phép', label: 'Excused', symbol: 'P' },
  { id: 'absent_one_period', labelVi: 'Vắng 1 tiết', label: 'Absent 1 period', symbol: '1' },
  { id: 'absent_two_periods', labelVi: 'Vắng 2 tiết', label: 'Absent 2 periods', symbol: '2' },
  { id: 'unexcused', labelVi: 'Vắng không phép', label: 'Unexcused', symbol: '!' },
  { id: 'early', labelVi: 'Về sớm', label: 'Left early', symbol: '↗' },
];

export const SCHEDULE_CATEGORIES = [
  'Sinh hoạt lớp', 'Họp phụ huynh', 'Kiểm tra', 'Hoạt động trải nghiệm',
  'Ngoại khóa', 'Lao động', 'Trực tuần', 'Tư vấn học sinh', 'Hồ sơ', 'Khác',
];

export const CONTACT_CHANNELS = ['Zalo', 'Điện thoại', 'Email', 'Trực tiếp', 'Tin nhắn', 'Khác'];
export const RECORD_TYPES = ['Báo cáo tuần', 'Báo cáo tháng', 'Kế hoạch chủ nhiệm', 'Biên bản sinh hoạt lớp', 'Biên bản họp phụ huynh', 'Danh sách học sinh', 'Báo cáo chuyên cần', 'Nhận xét học sinh'];
