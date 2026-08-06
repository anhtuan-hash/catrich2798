import { getAppDesignProfile } from '../data/designProfiles.js';
import { getRoutePermissionId, getToolPermissionId, hasRouteAccess, hasToolAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import { ROUTE_APP_SHORTCUTS } from '../data/appVisibilityRegistry.js';

export const APP_ORDER = [
  'hidden-apps-vault', 'thpt-practice-hub', 'resource-library-hub', 'lesson-plan-ai', 'textlab-activities', 'flying-words', 'exam-studio', 'reading-studio',
  'news-reader', 'vietnam-tax', 'word2graph', 'textcare', 'student-practice', 'game-hub',
  'homeroom-hub', 'games-hub', 'admin-hub',
];
export const ROUTE_APPS = ROUTE_APP_SHORTCUTS;

export const copy = {
  vi: {
    brand: 'Brian English', kicker: 'Creative App Directory', titleA: 'cửa sổ', titleB: 'ứng dụng', titleC: 'sáng tạo',
    subtitle: 'Khám phá, sắp xếp và mở nhanh toàn bộ công cụ dạy học trong một không gian trực quan, gọn gàng và đồng nhất.',
    open: 'Mở ứng dụng', locked: 'Cần quyền', aiOn: 'Hệ thống sẵn sàng', aiOff: 'Cài AI', role: 'Vai trò', total: 'Công cụ',
    browse: 'Duyệt ứng dụng', browseHint: 'Xem toàn bộ công cụ', pinned: 'Ứng dụng đã ghim', flow: 'Các ứng dụng yêu thích được truy cập nhanh tại đây.',
    customize: 'Tùy biến launcher', finish: 'Thoát chỉnh sửa', save: 'Lưu thay đổi', reset: 'Khôi phục mặc định', all: 'Tất cả', hidden: 'Đã ẩn',
    addGroup: 'Tạo nhóm ứng dụng', groupName: 'Tên nhóm mới', create: 'Tạo nhóm',
    dragHint: 'Kéo thẻ để sắp xếp · dùng các nút trên thẻ để ghim, ẩn, đưa lên thanh điều hướng hoặc đổi nhóm.',
    pin: 'Ghim', unpin: 'Bỏ ghim', hide: 'Ẩn', show: 'Hiện', navOn: 'Đưa lên thanh điều hướng', navOff: 'Gỡ khỏi thanh điều hướng', group: 'Nhóm',
    saved: 'Đã lưu và đồng bộ cấu hình launcher toàn hệ thống.', savedLocal: 'Đã lưu trên thiết bị. Hãy chạy migration launcher để đồng bộ toàn hệ thống.',
    saving: 'Đang lưu…', navLimit: 'Thanh điều hướng tối đa 12 mục.', empty: 'Chưa có ứng dụng phù hợp.',
    search: 'Tìm ứng dụng', searchPlaceholder: 'Tìm theo tên hoặc chức năng…', density: 'Mật độ', comfortable: 'Thoáng', compact: 'Gọn',
    command: 'Tìm nhanh toàn hệ thống', noSearch: 'Không có ứng dụng phù hợp với từ khóa.',
    launcherStyleTitle: 'Tùy biến launcher', launcherStyleHint: 'Chọn cách các ứng dụng đã ghim xuất hiện trong launcher.',
    radialLauncher: 'Launcher tròn', radialLauncherDesc: 'Ứng dụng được sắp xếp quanh một dock tròn, rõ ràng và dễ chọn.',
    waterLauncher: 'Hộp nước', waterLauncherDesc: 'Ứng dụng nổi và chuyển động nhẹ bên trong một hộp nước mềm mại.',
    chooseStyle: 'Chọn kiểu này', selectedStyle: 'Đang sử dụng', previewTitle: 'Không gian ứng dụng', previewHint: 'Mọi công cụ ở đúng vị trí bạn cần.',
    ready: 'Sẵn sàng', pinnedLabel: 'Đã ghim', navLabel: 'Điều hướng',
    nav: { home: 'Trang chủ', apps: 'Ứng dụng', games: 'Trò chơi', admin: 'Quản trị' },
  },
  en: {
    brand: 'Brian English', kicker: 'Creative App Directory', titleA: 'creative', titleB: 'app', titleC: 'windows',
    subtitle: 'Discover, organize and launch every teaching tool from one polished, consistent workspace.',
    open: 'Open app', locked: 'Locked', aiOn: 'AI ready', aiOff: 'Set up AI', role: 'Role', total: 'Tools',
    browse: 'Browse apps', browseHint: 'View every tool', pinned: 'Pinned apps', flow: 'Favorite apps stay within quick reach.',
    customize: 'Customize launcher', finish: 'Exit editor', save: 'Save changes', reset: 'Restore defaults', all: 'All', hidden: 'Hidden',
    addGroup: 'Create app group', groupName: 'New group name', create: 'Create group',
    dragHint: 'Drag cards to reorder. Use card controls to pin, hide, add to navigation or move between groups.',
    pin: 'Pin', unpin: 'Unpin', hide: 'Hide', show: 'Show', navOn: 'Add to navigation', navOff: 'Remove from navigation', group: 'Group',
    saved: 'Launcher configuration saved and synced.', savedLocal: 'Saved on this device. Run the launcher migration for system-wide sync.',
    saving: 'Saving…', navLimit: 'The navigation supports up to 12 items.', empty: 'No apps are available yet.',
    search: 'Search apps', searchPlaceholder: 'Search by name or function…', density: 'Density', comfortable: 'Comfortable', compact: 'Compact',
    command: 'Search the whole system', noSearch: 'No app matches this search.',
    launcherStyleTitle: 'Customize launcher', launcherStyleHint: 'Choose how pinned apps appear in the launcher.',
    radialLauncher: 'Circular launcher', radialLauncherDesc: 'Apps orbit a circular dock for a clear, playful launcher.',
    waterLauncher: 'Water box', waterLauncherDesc: 'Apps float gently inside a soft liquid container.',
    chooseStyle: 'Use this style', selectedStyle: 'In use', previewTitle: 'App workspace', previewHint: 'Every tool, exactly where you need it.',
    ready: 'Ready', pinnedLabel: 'Pinned', navLabel: 'Navigation',
    nav: { home: 'Home', apps: 'Apps', games: 'Games', admin: 'Admin' },
  },
};

export function titleOf(item, language) { return language === 'vi' ? item.titleVi || item.title : item.title; }
export function descOf(item, language) { return language === 'vi' ? item.descVi || item.desc : item.desc; }
export function statusOf(item, language) {
  const profile = getAppDesignProfile(item.slug);
  return language === 'vi' ? profile.styleVi || item.statusVi || item.status : profile.style || item.status;
}
export function shortDesc(item, language) {
  const vi = {
    'lesson-plan-ai': 'Giáo án, học liệu, năng lực số.', 'textlab-activities': '18 hoạt động tương tác từ văn bản.', 'flying-words': 'Sắp xếp câu bằng các thẻ từ chuyển động.', textcare: 'Chuẩn hoá văn bản hành chính.',
    'reading-studio': 'Bài đọc, câu hỏi và từ vựng.', 'news-reader': 'Tin giáo dục Việt Nam và báo tiếng Anh.',
    'vietnam-tax': 'Thuế TNCN, bảo hiểm và lương Net 2026.', word2graph: 'Word family và collocation.',
    'exam-studio': 'Đề kiểm tra, cloze, word form.', 'student-practice': 'Bài luyện có chấm điểm.', 'homeroom-hub': 'Học sinh, điểm danh và phụ huynh.',
    'resource-library-hub': 'Kho học liệu dùng chung trên Drive TTCM.',
    'games-hub': 'Game lớp học và launcher.', 'admin-hub': 'Người dùng, quyền, cấu hình.',
  };
  const en = {
    'lesson-plan-ai': 'Lessons, materials and competencies.', 'textlab-activities': '18 interactive activities from text.', 'flying-words': 'Build sentences from moving word cards.', textcare: 'Clean official documents.',
    'reading-studio': 'Readings and vocabulary.', 'news-reader': 'Vietnam education and English news.',
    'vietnam-tax': 'Vietnam PIT, insurance and 2026 net salary.', word2graph: 'Word families and collocations.',
    'exam-studio': 'Tests, cloze and word form.', 'student-practice': 'Scored learner practice.', 'homeroom-hub': 'Students, attendance and parents.',
    'resource-library-hub': 'Shared department Drive resources.',
    'games-hub': 'Classroom game launchers.', 'admin-hub': 'Users and permissions.',
  };
  return (language === 'vi' ? vi[item.slug] : en[item.slug]) || descOf(item, language);
}
export function targetFor(item) { return item.route ? `#/${item.route}` : `#/tool/${item.slug}`; }
export function launch(target, label, color, sourceEl = null) { launchRoute({ target, label, color: color || '#191515', sourceEl }); }
export function navLaunch(route, label, color, sourceEl) { launch(route.startsWith('#/') ? route : `#/${route}`, label, color, sourceEl); }
export function defaultGroupOf(item) {
  if (['lesson-plan-ai', 'textcare', 'resource-library-hub'].includes(item.slug)) return 'plan';
  if (item.slug === 'homeroom-hub') return 'manage';
  if (['textlab-activities', 'flying-words', 'reading-studio', 'news-reader', 'vietnam-tax', 'word2graph', 'game-hub', 'games-hub'].includes(item.slug)) return 'create';
  if (['thpt-practice-hub', 'exam-studio', 'student-practice'].includes(item.slug)) return 'assess';
  return 'manage';
}
export function permissionFor(item) {
  if (!item.route) return getToolPermissionId(item.slug);
  if (item.route === 'department' && item.slug) return getToolPermissionId(item.slug);
  return getRoutePermissionId(item.route) || '';
}
export function lockedFor(item, currentUser) {
  if (!currentUser || currentUser.role === 'admin') return false;
  if (item.adminOnly) return true;
  if (item.route) return !hasRouteAccess(currentUser, item.route, item);
  return !hasToolAccess(currentUser, item.slug);
}
