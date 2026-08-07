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
  featured: true};

if (!APPS.some((app) => app.slug === TOP_FIVE_ARENA_APP.slug)) {
  APPS.unshift(TOP_FIVE_ARENA_APP);
}

export const APP_DESIGN_PROFILES = {};

export function getAppDesignProfile(slug) {
  return APP_DESIGN_PROFILES[slug] || {
    accent: '#191515',
    soft: '#F3DFD8',
    ink: '#191515',
    icon: 'apps',
    style: 'Creative app window',
    styleVi: 'Cửa sổ ứng dụng sáng tạo'};
}
