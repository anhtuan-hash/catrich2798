import { APPS } from './apps.js';

const teachingToolHub = {
  slug: 'teaching-tool-hub',
  icon: 'TH',
  tone: 'blue',
  group: 'Classroom Utilities',
  groupVi: 'Tiện ích lớp học',
  title: 'Teaching Tool Hub',
  titleVi: 'Teaching Tool Hub',
  desc: 'A curated teaching website hub managed by the department head and opened directly inside Brian.',
  descVi: 'Hub website dạy học do TTCM quản lý, cho phép giáo viên mở và sử dụng công cụ trực tiếp bên trong Brian.',
  status: 'TTCM curated · Embedded websites · No AI',
  statusVi: 'TTCM quản lý · Nhúng website · Không AI',
  api: false,
  featured: true,
};

if (!APPS.some((item) => item.slug === teachingToolHub.slug)) {
  APPS.push(teachingToolHub);
}

export default teachingToolHub;
