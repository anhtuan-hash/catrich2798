import { APPS } from './data/apps.js';

export const TESOL_METHOD_SLUG = 'tesol-method';
export const TESOL_METHOD_HASH = '#/tool/tesol-method';

// Register Phương pháp TESOL as a first-class Brian tool before main.jsx and
// permissions.js build their route/tool registries. The actual approved content
// is still loaded from the external-app store by ExternalAppsIntegration.
if (!APPS.some((item) => item?.slug === TESOL_METHOD_SLUG)) {
  APPS.push({
    slug: TESOL_METHOD_SLUG,
    icon: '🌐',
    tone: 'blue',
    group: 'Professional Learning',
    groupVi: 'Phát triển chuyên môn',
    title: 'TESOL Methods',
    titleVi: 'Phương pháp TESOL',
    desc: 'Open the approved TESOL methods resource as a dedicated Brian route.',
    descVi: 'Mở học liệu Phương pháp TESOL đã duyệt bằng một route riêng trong Brian.',
    status: 'Dedicated route · Approved content',
    statusVi: 'Route riêng · Nội dung đã duyệt',
    api: false,
    featured: true,
  });
}
