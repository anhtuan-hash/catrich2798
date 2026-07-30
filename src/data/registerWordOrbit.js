import { APPS } from './apps.js';
import { APP_DESIGN_PROFILES } from './designProfiles.js';

const WORD_ORBIT_APP = {
  slug: 'word-orbit',
  icon: 'WO',
  tone: 'blue',
  group: 'Teaching Activities',
  groupVi: 'Hoạt động lớp học',
  title: 'Word Orbit',
  titleVi: 'Quỹ Đạo Từ Vựng',
  desc: 'Guide vocabulary capsules into the correct meaning stations through a projector-ready orbital game with energy, combos and offline lesson editing.',
  descVi: 'Điều khiển viên nang từ vựng vào đúng trạm nghĩa trong trò chơi quỹ đạo dành cho máy chiếu, có năng lượng, combo và trình soạn offline.',
  status: 'Google-style · Touch · Projector',
  statusVi: 'Phong cách Google · Cảm ứng · Máy chiếu',
  api: false,
  featured: true,
};

if (!APPS.some((app) => app.slug === WORD_ORBIT_APP.slug)) {
  const activityIndex = APPS.findIndex((app) => app.slug === 'knowledge-train');
  APPS.splice(activityIndex >= 0 ? activityIndex + 1 : APPS.length, 0, WORD_ORBIT_APP);
}

APP_DESIGN_PROFILES['word-orbit'] = {
  accent: '#0B57D0',
  soft: '#E8F0FE',
  ink: '#10264A',
  icon: 'game',
  style: 'Orbital vocabulary mission',
  styleVi: 'Nhiệm vụ từ vựng quỹ đạo',
};
