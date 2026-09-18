import { readFile } from 'node:fs/promises';

let passed = 0;
let failed = 0;
function check(condition, message) {
  if (condition) { console.log(`[PASS] ${message}`); passed += 1; }
  else { console.error(`[FAIL] ${message}`); failed += 1; }
}

const wrapper = await readFile(new URL('../src/components/GlobalWorkScheduleCompatibleCenter.jsx', import.meta.url), 'utf8');
const center = await readFile(new URL('../src/components/GlobalWorkScheduleCenter.jsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/components/GlobalWorkScheduleTimelineV2.css', import.meta.url), 'utf8').catch(() => '');
const nav = await readFile(new URL('../src/components/GlobalTtcmNavigationTab.jsx', import.meta.url), 'utf8');

// Existing schedule business flows must remain intact.
check(center.includes('File mẫu'), 'preserves template download action');
check(center.includes('Upload lịch'), 'preserves schedule upload action');
check(center.includes('Thêm lịch'), 'preserves manual add action');
check(center.includes('work-schedule-drawer'), 'preserves event detail drawer');
check(center.includes('work-schedule-modal import-modal'), 'preserves import preview modal');
check(center.includes('work-schedule-modal editor-modal'), 'preserves create/edit modal');

// Dedicated timeline behavior / markup from the approved mockup.
check(center.includes("const [timelineCategory, setTimelineCategory] = useState('all')"), 'adds interactive timeline category state');
check(center.includes('scheduleCategoryForEvent'), 'classifies schedule events into mockup categories');
check(center.includes('work-schedule-category-filters'), 'renders real category filter chips');
check(center.includes("['all', 'Tất cả'"), 'includes all category filter');
check(center.includes("['meeting', 'Họp'"), 'includes meeting category filter');
check(center.includes("['training', 'Đào tạo'"), 'includes training category filter');
check(center.includes("['student', 'Học sinh'"), 'includes student category filter');
check(center.includes("['deadline', 'Hạn nộp'"), 'includes deadline category filter');
check(center.includes("['other', 'Khác'"), 'includes other category filter');
check(center.includes('work-schedule-timeline-board'), 'renders the dedicated illustrated weekly timeline board');
check(center.includes('work-schedule-editorial-stage'), 'uses a dedicated editorial timeline renderer for embedded TTCM');
check(center.includes('work-schedule-day-track'), 'renders independent day tracks instead of calendar table cells');
check(center.includes('work-schedule-day-label'), 'groups weekday, date and today state into one day header');
check(center.includes('work-schedule-event-copy'), 'uses a dedicated readable event-copy block');
check(center.includes('work-schedule-more-chip'), 'uses a compact continuation chip beside each day timeline');
check(center.includes('work-schedule-timeline-day'), 'renders styled day columns');
check(center.includes('work-schedule-timeline-rail'), 'renders vertical rails for day events');
check(center.includes('work-schedule-timeline-event'), 'renders timeline event cards');
check(center.includes('work-schedule-event-location'), 'shows event location inside timeline cards');
check(center.includes('work-schedule-empty-day'), 'renders the friendly empty-day panel');
check(center.includes('work-schedule-timeline-more'), 'renders per-day continuation control');
check(center.includes('embedded && dayEvents.length > 3'), 'shows continuation only when a day has hidden events');
check(center.includes('work-schedule-hero-art'), 'adds a semantic hero artwork hook');
check(center.includes('work-schedule-quote-footer'), 'adds the illustrated quote footer hook');
check(center.includes('work-schedule-day-date'), 'renders a neutral date label that avoids inherited today-pill styling');
check(center.includes('>{date.getDate()}</span>'), 'uses the real day number in every timeline day orb');
check(!center.includes("today ? date.getDate() : '⌖'"), 'removes decorative crosshair day markers');
check(center.includes('Lịch làm việc khoa học'), 'preserves the approved footer quote');
check(center.includes('Giáo dục là hành trình'), 'preserves the handwritten footer message');

// Production selector fidelity: style the actual TTCM host, not an unrelated wrapper.
check(wrapper.includes("import './GlobalWorkScheduleTimelineV2.css';"), 'loads the high-fidelity TTCM schedule skin');
check(css.includes('.ttcm-m3-schedule-host .work-schedule-center'), 'scopes the visual design to the production TTCM schedule host');
check(css.includes('.work-schedule-hero-art'), 'styles the hero illustration');
check(css.includes('data:image/svg+xml'), 'preserves approved calendar / plants / books artwork as deploy-safe SVG');
check(css.includes('.work-schedule-category-filters'), 'styles real category filter chips');
check(/\.work-schedule-metrics\s*\{[^}]*padding-right\s*:\s*0/.test(css), 'balances metric cards across the full timeline width');
check(/\.work-schedule-toolbar\s*\{[^}]*min-height\s*:\s*16[0-8]px/.test(css), 'reduces hero height so more timeline content is visible above the fold');
check(/\.work-schedule-timeline-event[^}]*min-height\s*:\s*8[2-9]px/.test(css), 'gives timeline event cards more breathing room');
check(/\.work-schedule-timeline-event>span:not\(\.work-schedule-event-icon\)[^}]*font-size\s*:\s*1[0-1](?:\.5)?px/.test(css), 'improves event title readability');
check(/\.work-schedule-category-filters button[^}]*min-height\s*:\s*3[6-9]px/.test(css), 'makes category chips easier to scan and click');
check(css.includes('.work-schedule-timeline-board'), 'styles the seven-column timeline board');
check(/grid-template-columns\s*:\s*repeat\(7\s*,\s*minmax\(0\s*,\s*1fr\)\)/.test(css), 'fits all seven timeline days inside the desktop board');
check(/\.work-schedule-timeline-board \.work-schedule-grid[^}]*min-width\s*:\s*0/.test(css), 'avoids desktop horizontal clipping of Sunday');
check(/\.work-schedule-event-icon[^}]*width\s*:\s*28px/.test(css), 'reduces event icon footprint to give titles more room');
check(/\.work-schedule-event-icon[^}]*font-size\s*:\s*0/.test(css), 'simplifies category artwork into a quiet visual marker');
check(!center.includes('▣ {event.location}'), 'removes the redundant location glyph from event metadata');
check(/\.work-schedule-timeline-more[^}]*position\s*:\s*relative/.test(css), 'keeps hidden-event continuation close to the last visible card');
check(/\.work-schedule-empty-day[^}]*min-height\s*:\s*11[0-9]px/.test(css), 'uses a compact empty-day card instead of a full-height panel');
check(/\.work-schedule-event-location[^}]*font-size\s*:\s*9px/.test(css), 'improves event metadata readability');
check(/border-left\s*:\s*1px\s+dashed/.test(css), 'draws the vertical timeline rails');
check(css.includes('.work-schedule-timeline-event.is-meeting'), 'styles meeting events');
check(css.includes('.work-schedule-timeline-event.is-training'), 'styles training events');
check(css.includes('.work-schedule-timeline-event.is-student'), 'styles student events');
check(css.includes('.work-schedule-timeline-event.is-deadline'), 'styles deadline events');
check(css.includes('.work-schedule-empty-day'), 'styles the friendly empty-day card');
check(css.includes('.work-schedule-quote-footer'), 'styles the scenic education footer');
check(css.includes('.work-schedule-editorial-stage'), 'styles the editorial timeline canvas');
check(/\.work-schedule-editorial-stage\s*\{[^}]*gap\s*:\s*1[0-4]px/.test(css), 'separates day tracks with editorial whitespace instead of table borders');
check(/\.work-schedule-day-track\s*\{[^}]*border-radius\s*:\s*1[4-9]px/.test(css), 'renders each day as an independent rounded track');
check(/\.work-schedule-day-track\s*\{[^}]*border\s*:\s*0/.test(css), 'removes the full-height calendar cell border treatment');
check(/\.work-schedule-event-copy strong[^}]*font-size\s*:\s*1[1-3]px/.test(css), 'keeps event titles readable in the editorial cards');
check(nav.includes("querySelector('.ttcm-m3-schedule-view')") && nav.includes('scrollTop = 0'), 'resets schedule scroll position so the approved hero is visible on entry');
check(/@media\s*\(max-width\s*:\s*900px\)/.test(css), 'keeps the timeline usable on narrow screens');

console.log(`\nTTCM schedule timeline mockup contract: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);
