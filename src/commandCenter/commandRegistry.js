import { isAdminRole, isDepartmentLeaderRole } from '../utils/roles.js';

const providers = new Map();

export function registerCommandProvider(id, provider) {
  if (!id || typeof provider !== 'function') return () => {};
  providers.set(id, provider);
  return () => providers.delete(id);
}

export function collectRegisteredCommands(context) {
  const output = [];
  providers.forEach((provider) => {
    try {
      const entries = provider(context);
      if (Array.isArray(entries)) output.push(...entries);
    } catch (error) {
      console.warn('[CommandCenter] provider failed', error);
    }
  });
  return output.filter((entry) => entry?.id && entry?.title);
}

function routeCommand(id, title, subtitle, icon, color, target, keywords, extra = {}) {
  return {
    id,
    kind: 'command',
    title,
    subtitle,
    icon,
    color,
    keywords,
    priority: 24,
    commandAction: { type: 'route', target },
    ...extra,
  };
}

function homeroomCommand(id, title, subtitle, icon, tab, keywords, extra = {}) {
  return {
    id,
    kind: 'command',
    title,
    subtitle,
    icon,
    color: '#0b57d0',
    keywords,
    priority: 30,
    commandAction: { type: 'homeroom.navigate', tab },
    ...extra,
  };
}

function selectClassCommand(id, title, subtitle, icon, tab, keywords) {
  return {
    id,
    kind: 'command',
    title,
    subtitle,
    icon,
    color: '#0b57d0',
    keywords,
    priority: 32,
    commandAction: { type: 'select-class', tab },
  };
}

registerCommandProvider('system', ({ language = 'vi' }) => {
  const vi = language === 'vi';
  return [
    {
      id: 'command:ai',
      kind: 'command',
      title: vi ? 'Mở Brian AI' : 'Open Brian AI',
      subtitle: vi ? 'Trò chuyện với trợ lí AI' : 'Chat with the AI assistant',
      icon: '✦',
      color: '#2bb7b3',
      keywords: 'ai brian chat assistant tro li chatbot',
      priority: 28,
      commandAction: { type: 'event', name: 'bes-ai-open' },
    },
    {
      id: 'command:launcher',
      kind: 'command',
      title: vi ? 'Tùy biến Launcher' : 'Customize Launcher',
      subtitle: vi ? 'Sắp xếp, ghim, ẩn và tạo nhóm ứng dụng' : 'Sort, pin, hide and group apps',
      icon: '▦',
      color: '#f05a7e',
      keywords: 'launcher customize edit apps group pin hide sap xep ghim an nhom',
      priority: 24,
      commandAction: { type: 'launcher.edit' },
    },
    routeCommand(
      'command:settings',
      vi ? 'Mở Cài đặt' : 'Open Settings',
      vi ? 'Giao diện, tài khoản và hiệu năng' : 'Appearance, account and performance',
      '⚙',
      '#123c69',
      '#/settings',
      'settings configuration cai dat cau hinh performance',
    ),
    routeCommand(
      'command:apps',
      vi ? 'Mở danh mục ứng dụng' : 'Open app directory',
      vi ? 'Xem toàn bộ ứng dụng được cấp quyền' : 'Browse all permitted apps',
      '▦',
      '#4285f4',
      '#/apps',
      'apps applications ung dung danh muc',
    ),
    {
      id: 'command:clear-command-history',
      kind: 'command',
      title: vi ? 'Xóa lịch sử Command K' : 'Clear Command K history',
      subtitle: vi ? 'Chỉ xóa lịch sử cục bộ, không xóa dữ liệu lớp' : 'Clears local history only, never class data',
      icon: '↺',
      color: '#a142f4',
      keywords: 'xoa lich su clear command history reset recent',
      priority: 12,
      commandAction: { type: 'local.clear-history' },
      confirm: {
        title: vi ? 'Xóa lịch sử Command K?' : 'Clear Command K history?',
        message: vi ? 'Thao tác chỉ ảnh hưởng lịch sử tìm kiếm trên thiết bị này và có thể hoàn tác ngay.' : 'This only affects local command history and can be undone immediately.',
        confirmLabel: vi ? 'Xóa lịch sử' : 'Clear history',
      },
    },
  ];
});

registerCommandProvider('homeroom-global', ({ language = 'vi' }) => {
  const vi = language === 'vi';
  return [
    selectClassCommand('command:select-class-attendance', vi ? 'Điểm danh một lớp…' : 'Take attendance for a class…', vi ? 'Chọn lớp ở bước tiếp theo' : 'Choose a class in the next step', '✓', 'attendance', 'diem danh mot lop attendance class'),
    selectClassCommand('command:select-class-learning', vi ? 'Mở bảng điểm một lớp…' : 'Open a class gradebook…', vi ? 'Chọn lớp ở bước tiếp theo' : 'Choose a class in the next step', 'Σ', 'learning', 'bang diem mot lop gradebook class'),
    selectClassCommand('command:select-class-students', vi ? 'Mở danh sách học sinh một lớp…' : 'Open a class roster…', vi ? 'Chọn lớp ở bước tiếp theo' : 'Choose a class in the next step', '♙', 'students', 'hoc sinh danh sach lop roster students'),
    selectClassCommand('command:select-class-conduct', vi ? 'Mở rèn luyện một lớp…' : 'Open class conduct records…', vi ? 'Chọn lớp ở bước tiếp theo' : 'Choose a class in the next step', '100', 'conduct', 'ren luyen hanh kiem conduct class'),
  ];
});

registerCommandProvider('homeroom-context', ({ language = 'vi', currentRoute, currentUser }) => {
  if (currentRoute !== 'homeroom') return [];
  const vi = language === 'vi';
  const commands = [
    homeroomCommand('command:homeroom-overview', vi ? 'Mở tổng quan lớp' : 'Open class overview', vi ? 'Tóm tắt lớp đang mở' : 'Summary of the current class', '▦', 'overview', 'tong quan overview lop class'),
    homeroomCommand('command:homeroom-attendance', vi ? 'Điểm danh lớp đang mở' : 'Take attendance', vi ? 'Chuyển thẳng đến thẻ Điểm danh' : 'Open the Attendance tab', '✓', 'attendance', 'diem danh attendance chuyen can'),
    homeroomCommand('command:homeroom-students', vi ? 'Mở danh sách học sinh' : 'Open student roster', vi ? 'Tìm, thêm và cập nhật hồ sơ' : 'Find, add and update students', '♙', 'students', 'hoc sinh student roster danh sach'),
    homeroomCommand('command:homeroom-learning', vi ? 'Mở bảng điểm' : 'Open gradebook', vi ? 'Điểm số và kết quả học tập' : 'Grades and learning results', 'Σ', 'learning', 'bang diem gradebook hoc tap learning'),
    homeroomCommand('command:homeroom-conduct', vi ? 'Mở rèn luyện' : 'Open conduct records', vi ? 'Theo dõi hạnh kiểm và rèn luyện' : 'Conduct and behaviour records', '100', 'conduct', 'ren luyen hanh kiem conduct behaviour'),
    homeroomCommand('command:homeroom-feedback', vi ? 'Mở nhận xét' : 'Open feedback', vi ? 'Ghi nhận xét và phản hồi' : 'Write feedback and comments', '✎', 'feedback', 'nhan xet feedback comment'),
  ];
  if (isAdminRole(currentUser?.role) || isDepartmentLeaderRole(currentUser?.role)) {
    commands.push(homeroomCommand(
      'command:homeroom-classes',
      vi ? 'Quản lý lớp và năm học' : 'Manage classes and school years',
      vi ? 'Chuyển lớp, tạo lớp hoặc lưu trữ lớp' : 'Switch, create or archive classes',
      '▥',
      'classes',
      'quan ly lop nam hoc classes school year',
    ));
  }
  return commands;
});

registerCommandProvider('help', ({ language = 'vi' }) => {
  const vi = language === 'vi';
  const items = [
    ['help:commands', '>', vi ? 'Chỉ tìm lệnh' : 'Search commands only', vi ? 'Ví dụ: > điểm danh' : 'Example: > attendance'],
    ['help:people', '@', vi ? 'Tìm học sinh hoặc giáo viên' : 'Search people', vi ? 'Ví dụ: @ Nguyễn Minh Anh' : 'Example: @ Alex Nguyen'],
    ['help:classes', '#', vi ? 'Tìm lớp' : 'Search classes', vi ? 'Ví dụ: # 12.6' : 'Example: # 12.6'],
    ['help:apps', '/', vi ? 'Tìm trang hoặc ứng dụng' : 'Search apps and pages', vi ? 'Ví dụ: / thư viện' : 'Example: / library'],
  ];
  return items.map(([id, icon, title, subtitle]) => ({
    id,
    kind: 'help',
    title,
    subtitle,
    icon,
    color: '#5f6368',
    keywords: `${icon} ${title} ${subtitle}`,
    priority: 10,
    commandAction: { type: 'fill-query', value: `${icon} ` },
  }));
});
