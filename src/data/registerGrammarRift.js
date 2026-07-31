import { APPS } from './apps.js';
import { APP_DESIGN_PROFILES } from './designProfiles.js';

const GRAMMAR_RIFT_APP = {
  slug: 'grammar-rift',
  icon: 'GR',
  tone: 'violet',
  group: 'Teaching Activities',
  groupVi: 'Hoạt động lớp học',
  title: 'Grammar Rift',
  titleVi: 'Cổng Không Gian Ngữ Pháp',
  desc: 'Repair broken English timelines through five projector-ready grammar missions with team battles, powers, combos and visual explanations.',
  descVi: 'Sửa chữa các dòng thời gian tiếng Anh qua 5 nhiệm vụ ngữ pháp dành cho máy chiếu, có đấu đội, quyền trợ giúp, combo và giải thích trực quan.',
  status: 'Offline · Touch · Projector · Team Battle',
  statusVi: 'Ngoại tuyến · Cảm ứng · Máy chiếu · Đấu đội',
  api: false,
  featured: true,
};

if (!APPS.some((app) => app.slug === GRAMMAR_RIFT_APP.slug)) {
  const orbitIndex = APPS.findIndex((app) => app.slug === 'word-orbit');
  const activityIndex = APPS.findIndex((app) => app.slug === 'knowledge-train');
  const insertAt = orbitIndex >= 0 ? orbitIndex + 1 : activityIndex >= 0 ? activityIndex + 1 : APPS.length;
  APPS.splice(insertAt, 0, GRAMMAR_RIFT_APP);
}

APP_DESIGN_PROFILES['grammar-rift'] = {
  accent: '#7C3AED',
  soft: '#F3E8FF',
  ink: '#25113D',
  icon: 'game',
  style: 'Grammar timeline adventure',
  styleVi: 'Phiêu lưu dòng thời gian ngữ pháp',
};
