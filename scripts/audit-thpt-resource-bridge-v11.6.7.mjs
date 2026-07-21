import fs from 'node:fs';
import {
  THPT_RESOURCE_HIDDEN_TAG,
  THPT_RESOURCE_LINK_TAG,
  isApprovedHtmlResource,
  isHtmlResource,
  isResourceLinkedToThpt,
  resourceToThptLesson,
} from '../src/utils/thptResourceBridge.js';

const checks = [];
const add = (name, pass) => checks.push({ name, pass: Boolean(pass) });
const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const page = read('src/pages/THPTPracticeHub.jsx');
const css = read('src/pages/THPTPracticeHub.css');
const library = read('src/pages/ResourceLibrary.jsx');
const bridge = read('src/utils/thptResourceBridge.js');

const approvedThptHtml = {
  id: 'resource-1', cloudId: 'cloud-1', title: 'Reading 01', category: 'thpt-exam',
  status: 'approved', fileName: 'reading.html', mimeType: 'text/html', tags: [], size: 1024,
};
const hidden = { ...approvedThptHtml, tags: [THPT_RESOURCE_HIDDEN_TAG] };
const tagged = { ...approvedThptHtml, category: 'worksheet', tags: [THPT_RESOURCE_LINK_TAG] };

add('Bridge utility exists', fs.existsSync('src/utils/thptResourceBridge.js'));
add('HTML extension recognised', isHtmlResource(approvedThptHtml));
add('Approved HTML recognised', isApprovedHtmlResource(approvedThptHtml));
add('THPT category auto-links', isResourceLinkedToThpt(approvedThptHtml));
add('Hidden tag unlinks without deleting source', !isResourceLinkedToThpt(hidden));
add('Explicit tag links HTML outside THPT folder', isResourceLinkedToThpt(tagged));
add('Pending file stays hidden from teachers', !isResourceLinkedToThpt({ ...approvedThptHtml, status: 'pending' }));
add('Non-HTML file stays out of hub', !isResourceLinkedToThpt({ ...approvedThptHtml, fileName: 'reading.pdf', mimeType: 'application/pdf' }));
add('Resource maps to stable THPT lesson identity', resourceToThptLesson(approvedThptHtml).id === 'resource:cloud-1');
add('Resource mapping preserves source identity', resourceToThptLesson(approvedThptHtml).sourceType === 'resource-library');
add('Hub subscribes to approved Resource Library HTML', page.includes('subscribeApprovedThptResources(setResourceLessons)'));
add('Hub opens Resource Library HTML directly', page.includes('loadThptResourceHtml(item)'));
add('Hub keeps direct uploads and resources as separate sources', page.includes("sourceType: item.sourceType || 'thpt-hub'") && page.includes('THPT_RESOURCE_SOURCE'));
add('Hub offers source filter', page.includes('Tất cả nguồn') && page.includes('Kho học liệu'));
add('TTCM link manager is present', page.includes('Quản lý liên kết HTML') && page.includes('setThptResourceLinked'));
add('Unlink action does not delete original resource', page.includes('File vẫn được giữ nguyên trong Kho học liệu'));
add('Player iframe explicitly permits fullscreen', page.includes('allowFullScreen') && page.includes('allow="fullscreen;'));
add('Resource Library deep-link opens THPT folder', library.includes("params.get('category')") && library.includes('setCategory(normaliseResourceCategory(requestedCategory))'));
add('Bridge uses authenticated same-origin Drive proxy', bridge.includes('/api/google-drive-file?') && bridge.includes('getAccessToken'));
add('Bridge refreshes on resource event and Realtime', bridge.includes('RESOURCE_EVENT') && bridge.includes("table: 'resource_items'"));
add('Connected resource visual badge is styled', css.includes('.thpt-source-badge') && css.includes('.is-resource-linked'));
add('Manager layout is responsive', css.includes('.thpt-resource-manager-list') && css.includes('@media(max-width:720px)'));

checks.forEach((check) => console.log(`${check.pass ? '✓' : '✗'} ${check.name}`));
const failed = checks.filter((check) => !check.pass);
if (failed.length) {
  console.error(`\n❌ THPT Resource Bridge audit FAILED (${checks.length - failed.length}/${checks.length})`);
  process.exit(1);
}
console.log(`\n✅ THPT Resource Bridge audit PASS (${checks.length}/${checks.length})`);
