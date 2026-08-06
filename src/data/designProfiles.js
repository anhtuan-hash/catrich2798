import { APPS } from './apps.js';

const TOP_FIVE_ARENA_APP = {
  slug: 'top-five-arena',
  icon: 'T5',
  tone: 'blue',
  group: 'Teaching Activities',
  groupVi: 'Hoạt động lớp học',
  title: 'Brian Top 5 Arena',
  titleVi: 'Brian Top 5 Arena',
  desc: 'Run a complete Top 5 classroom match with answer entry, smart matching, team turns, scoring, strikes, timers, history and presentation mode.',
  descVi: 'Tổ chức trận Top 5 hoàn chỉnh với nhập đáp án, dò gần đúng, lượt đội, chấm điểm, lỗi, đồng hồ, lịch sử và chế độ trình chiếu.',
  status: 'macOS · Smart matching · Projector',
  statusVi: 'macOS · Dò đáp án · Máy chiếu',
  api: false,
  featured: true,
};

if (!APPS.some((app) => app.slug === TOP_FIVE_ARENA_APP.slug)) {
  APPS.unshift(TOP_FIVE_ARENA_APP);
}

export const APP_DESIGN_PROFILES = {
  'classroom-screen': {
    accent: '#4285F4',
    soft: '#EAF4FF',
    ink: '#17324D',
    icon: 'classroom-stage',
    style: 'Google-style teaching board',
    styleVi: 'Bảng dạy học phong cách Google'},

  'work-dashboard': {
    accent: '#315FC4',
    soft: '#EAF3FF',
    ink: '#10264A',
    icon: 'dashboard',
    style: 'Role-aware operations dashboard',
    styleVi: 'Bảng điều hành theo vai trò'},

  'thpt-practice-hub': {
    accent: '#D85F2A',
    soft: '#FFF0DF',
    ink: '#3B1B0D',
    icon: 'exam',
    style: 'Interactive THPT practice library',
    styleVi: 'Kho luyện thi THPT tương tác'},
  'textlab-activities': {
    accent: '#2F73D9',
    soft: '#DDEBFF',
    ink: '#0B2A55',
    icon: 'activity',
    style: 'Interactive activity lab',
    styleVi: 'Phòng tạo hoạt động tương tác'},
  'lesson-plan-ai': {
    accent: '#E86D1F',
    soft: '#FFE3CD',
    ink: '#211510',
    icon: 'lesson',
    style: 'Lesson canvas',
    styleVi: 'Khung giáo án sáng tạo'},
  'exam-studio': {
    accent: '#123C69',
    soft: '#DCEBFA',
    ink: '#07192C',
    icon: 'exam',
    style: 'Assessment dashboard',
    styleVi: 'Bảng kiểm tra rõ cấu trúc'},
  'game-hub': {
    accent: '#5B2A86',
    soft: '#E9DAFF',
    ink: '#20102F',
    icon: 'game',
    style: 'Flat arcade panel',
    styleVi: 'Bảng game arcade phẳng'},
  'flying-words': {
    accent: '#6944D8',
    soft: '#EEE9FF',
    ink: '#2A195C',
    icon: 'game',
    style: 'Flying sentence game',
    styleVi: 'Trò chơi câu chữ chuyển động'},
  'knowledge-train': {
    accent: '#6D4CC7',
    soft: '#EEE9FF',
    ink: '#24154F',
    icon: 'game',
    style: 'Linked knowledge train game',
    styleVi: 'Trò chơi đoàn tàu kiến thức liên hoàn'},
  'crossword-trial': {
    accent: '#0B57D0',
    soft: '#E8F0FE',
    ink: '#202124',
    icon: 'game',
    style: 'Google-style crossword classroom game',
    styleVi: 'Trò chơi ô chữ lớp học phong cách Google'},
  'top-five-arena': {
    accent: '#2B6FF5',
    soft: '#EAF2FF',
    ink: '#0C1C3F',
    icon: 'game',
    style: 'macOS-style ranked answer arena',
    styleVi: 'Đấu trường đáp án xếp hạng phong cách macOS'},
  word2graph: {
    accent: '#2E9E5D',
    soft: '#DDF6E6',
    ink: '#0F2D1C',
    icon: 'wordgraph',
    style: 'Vocabulary network',
    styleVi: 'Mạng từ vựng'},

  'vietnam-tax': {
    accent: '#1769AA',
    soft: '#E8F3FF',
    ink: '#0D355C',
    icon: 'tax',
    style: 'Salary and tax simulator',
    styleVi: 'Mô phỏng lương và thuế'},
  'news-reader': {
    accent: '#167D78',
    soft: '#DDF5F1',
    ink: '#083B38',
    icon: 'news',
    style: 'Live editorial reader',
    styleVi: 'Trình đọc báo trực tiếp'},
  'reading-studio': {
    accent: '#D99A1E',
    soft: '#FFF0C8',
    ink: '#392406',
    icon: 'reading',
    style: 'Magazine reading page',
    styleVi: 'Trang đọc kiểu magazine'},
  textcare: {
    accent: '#B8332A',
    soft: '#FFE0DD',
    ink: '#35110E',
    icon: 'textcare',
    style: 'Clean document stack',
    styleVi: 'Chồng văn bản chuẩn hoá'},
  'homeroom-hub': {
    accent: '#1F8F70',
    soft: '#DDF7ED',
    ink: '#0B382B',
    icon: 'homeroom',
    style: 'Homeroom command center',
    styleVi: 'Trung tâm công tác chủ nhiệm'},
  'student-practice': {
    accent: '#FF7A54',
    soft: '#FFE4DA',
    ink: '#361509',
    icon: 'practice',
    style: 'Practice sprint card',
    styleVi: 'Thẻ luyện tập tốc độ'},
  'games-hub': {
    accent: '#5B2A86',
    soft: '#E9DAFF',
    ink: '#20102F',
    icon: 'game',
    style: 'Game launcher',
    styleVi: 'Trình mở trò chơi'},
  'admin-hub': {
    accent: '#D13438',
    soft: '#FFE1E3',
    ink: '#351014',
    icon: 'admin',
    style: 'Control room',
    styleVi: 'Phòng điều khiển'}};

export function getAppDesignProfile(slug) {
  return APP_DESIGN_PROFILES[slug] || {
    accent: '#191515',
    soft: '#F3DFD8',
    ink: '#191515',
    icon: 'apps',
    style: 'Creative app window',
    styleVi: 'Cửa sổ ứng dụng sáng tạo'};
}
