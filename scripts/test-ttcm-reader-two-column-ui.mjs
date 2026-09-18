import { readFile } from 'node:fs/promises';

// Regression contract for the polished two-column TTCM reader.
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
check(component.includes('className="ttcm-reader-list-tools"'), 'moves search and sort controls into the list header');
check(component.includes('className="ttcm-reader-search"'), 'shows a notification search field');
check(component.includes('className="ttcm-reader-sort"'), 'shows a feed sort selector');
check(component.includes('formatReaderTimestamp(item.created_at || item.updated_at)'), 'uses compact date-first timestamps on list cards');
check(component.includes('ttcm-reader-card-status'), 'uses compact card status pills instead of repeating deadline blocks');
check(!component.includes('className="ttcm-reader-detail-due"'), 'removes the oversized deadline block from detail view');
check(component.includes("isOverdueItem(selectedItem) ? 'Hết hạn'"), 'keeps overdue state visible as compact metadata');
check(component.includes('ttcm-reader-response-preview'), 'shows a compact response preview in the detail panel');
check(component.includes('.slice(0, 2).map((entry)'), 'limits inline response preview to two recent rows');
check(component.includes('>Xem phản hồi</button>'), 'uses a non-duplicated response footer label');
check(component.includes('deleteCommunication(selectedItem)'), 'exposes delete for manager-owned TTCM content');
check(component.includes("isActionItem(selectedItem) ? 'Xóa việc đã giao' : 'Xóa nội dung'"), 'labels assigned-work deletion clearly');
check(component.includes("setResponses((current) => current.filter"), 'clears deleted-item responses from local TTCM state');
check(component.includes('responseAttachments = responsesForItem(item.id)'), 'cleans response attachments when deleting assigned work');
check(css.includes('.ttcm-reader-danger'), 'styles the destructive TTCM delete action separately');
check(component.indexOf('>Chỉnh sửa</button>') < component.indexOf('>Xem phản hồi</button>'), 'places edit before response viewer in manager footer');
check(component.indexOf('>Xem phản hồi</button>') < component.lastIndexOf("'Phản hồi / hoàn thành'"), 'keeps the primary response action last');
check(component.includes('markAllRead') && component.includes('ttcm-reader-mark-all-quiet'), 'preserves mark-all-read as a quiet list action');

// Mockup fidelity: graphical treatment implemented with lightweight CSS geometry.
check(css.includes('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);'), 'uses the equal two-panel desktop composition from the mockup');
check(css.includes('.ttcm-reader-shell .ttcm-m3-topbar::before'), 'adds the abstract pastel header artwork layer');
check(css.includes('.ttcm-reader-shell .ttcm-m3-topbar::after') && css.includes('Kết nối'), 'adds the subtle TTCM header motto');
check(css.includes('.ttcm-reader-toolbar .ttcm-m3-workspace-tabs button.is-selected::after'), 'uses an active-tab underline treatment');
check(css.includes('.ttcm-reader-workspace') && css.includes('gap: 12px;'), 'separates list and detail into individual cards');
check(css.includes('.ttcm-reader-list,') && css.includes('.ttcm-reader-detail {') && css.includes('border-radius: 18px;'), 'rounds both main reader panels');
check(css.includes('.ttcm-reader-card::after') && css.includes("content: '›';"), 'adds the circular card chevron from the approved mockup');
check(css.includes('.ttcm-reader-detail-card::before'), 'adds soft ambient artwork to the detail panel');
check(css.includes('.ttcm-reader-detail-card::after') && css.includes('rotate(8deg)'), 'adds the floating document illustration using CSS geometry');
check(css.includes('linear-gradient(135deg'), 'uses layered pastel gradients rather than a flat white header');
check(css.includes('box-shadow: 0 18px 42px'), 'uses soft premium panel shadows');
check(css.includes('.ttcm-reader-list-tools'), 'styles list-level search and sort controls');
check(css.includes('.ttcm-reader-detail-head {') && css.includes('display: none;'), 'hides the redundant detail toolbar on desktop');
check(css.includes('@media (max-width: 900px)') && css.includes('.ttcm-reader-detail-head { display: flex;'), 'restores the back toolbar on narrow screens');
check(css.includes('.ttcm-reader-card.is-selected') && css.includes('inset 4px 0 0 #0b67eb'), 'gives the selected card the stronger mockup left accent');
check(css.includes('font-size: clamp(25px, 1.9vw, 32px);'), 'uses the approved detail-title scale');
check(css.includes('.ttcm-reader-detail-card { min-height: auto;'), 'removes forced empty height from detail card');
check(css.includes('.ttcm-reader-filter-chips button') && css.includes('font-size: 11px;'), 'improves filter-chip readability');
check(css.includes('.ttcm-reader-card-status.is-overdue'), 'styles overdue state as a compact pill');
check(css.includes('.ttcm-reader-response-preview'), 'styles response preview rows');
check(css.includes('@media (max-width: 900px)'), 'keeps a responsive single-column reader on narrow screens');

console.log(`\nTTCM reader mockup-fidelity contract: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);
