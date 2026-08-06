import { APPS } from './apps.js';
import { APP_DESIGN_PROFILES } from './designProfiles.js';

const ACTIVITY_GRAPH_APP = {
  slug: 'activity-graph',
  icon: 'AG',
  tone: 'blue',
  group: 'Teaching Design',
  groupVi: 'Thiết kế dạy học',
  title: 'Brian Activity Graph',
  titleVi: 'Brian Activity Graph',
  desc: 'Map learning objectives, activities, resources, skills and assessment on an interactive connected canvas.',
  descVi: 'Thiết kế mạch mục tiêu, hoạt động, học liệu, kĩ năng và đánh giá trên canvas sơ đồ tương tác.',
  status: 'No AI · Visual planning · Offline export',
  statusVi: 'Không AI · Sơ đồ trực quan · Xuất offline',
  api: false,
  featured: true,
};

if (!APPS.some((app) => app.slug === ACTIVITY_GRAPH_APP.slug)) {
  const anchorIndex = APPS.findIndex((app) => app.slug === 'textlab-activities');
  APPS.splice(anchorIndex >= 0 ? anchorIndex + 1 : APPS.length, 0, ACTIVITY_GRAPH_APP);
}

APP_DESIGN_PROFILES['activity-graph'] = {
  accent: '#0B57D0',
  soft: '#E8F0FE',
  ink: '#10264A',
  icon: 'activity',
  style: 'Connected activity canvas',
  styleVi: 'Canvas hoạt động liên kết',
};
