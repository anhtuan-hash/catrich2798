import { APPS } from './apps.js';
import './registerTeachingToolHub.js';

const seatingChartStudio = {
  slug: 'seating-chart-studio',
  icon: 'SC',
  tone: 'blue',
  group: 'Classroom Utilities',
  groupVi: 'Tiện ích lớp học',
  title: 'Seating Chart Studio V10',
  titleVi: 'Seating Chart Studio V10',
  desc: 'Build, randomize and present classroom seating charts with hidden front/back row constraints, local class storage, drag-and-drop and print view.',
  descVi: 'Tạo, xáo trộn và trình chiếu sơ đồ chỗ ngồi với điều kiện hàng đầu/hàng cuối bí mật, lưu lớp cục bộ, kéo thả và in sơ đồ.',
  status: 'No AI · Local data · Projector',
  statusVi: 'Không AI · Dữ liệu cục bộ · Máy chiếu',
  api: false,
  featured: true,
};

if (!APPS.some((item) => item.slug === seatingChartStudio.slug)) {
  APPS.push(seatingChartStudio);
}

export default seatingChartStudio;
