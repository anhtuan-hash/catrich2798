import { readFile } from 'node:fs/promises';

let passed = 0;
let failed = 0;

function check(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed += 1;
  } else {
    console.error(`[FAIL] ${message}`);
    failed += 1;
  }
}

const component = await readFile(new URL('../src/components/GlobalTtcmNavigationTab.jsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/components/GlobalTtcmTeacherReaderV2.css', import.meta.url), 'utf8');

check(!component.includes('className="ttcm-reader-sidebar"'), 'removes the fixed mailbox sidebar from the feed workspace');
check(component.includes('ttcm-reader-filter-chips'), 'moves mailbox filters into a horizontal chip row');
check(component.includes("const [feedQuery, setFeedQuery] = useState('')"), 'adds feed search state');
check(component.includes("const [feedSort, setFeedSort] = useState('newest')"), 'adds feed sort state');
check(component.includes('className="ttcm-reader-search"'), 'shows a notification search field');
check(component.includes('className="ttcm-reader-sort"'), 'shows a feed sort selector');
check(component.includes('ttcm-reader-card-status'), 'uses compact card status pills instead of repeating deadline blocks');
check(!component.includes('className="ttcm-reader-detail-due"'), 'removes the oversized deadline block from detail view');
check(component.includes("isOverdueItem(selectedItem) ? 'Hết hạn'"), 'keeps overdue state visible as compact metadata');
check(component.includes('ttcm-reader-response-preview'), 'shows a compact response preview in the detail panel');
check(component.includes('.slice(0, 2).map((entry)'), 'limits inline response preview to two recent rows');
check(component.includes('markAllRead') && component.includes('ttcm-reader-mark-all-quiet'), 'preserves mark-all-read as a quiet list action');

check(css.includes('grid-template-columns: minmax(390px, .96fr) minmax(0, 1.04fr);'), 'uses a balanced two-column desktop workspace');
check(css.includes('.ttcm-reader-filter-chips'), 'styles horizontal filter chips');
check(css.includes('.ttcm-reader-detail-tools'), 'styles search and sort controls in the detail toolbar');
check(css.includes('.ttcm-reader-card-status.is-overdue'), 'styles overdue state as a compact pill');
check(css.includes('.ttcm-reader-response-preview'), 'styles response preview rows');
check(css.includes('@media (max-width: 900px)'), 'keeps a responsive single-column reader on narrow screens');

console.log(`\nTTCM reader two-column UI contract: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);
