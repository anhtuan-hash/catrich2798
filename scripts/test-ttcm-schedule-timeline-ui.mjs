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

// Dedicated daily timeline behavior / markup from the approved mockup.
check(center.includes("const [dailyCursor, setDailyCursor] = useState"), 'adds dedicated selected-day state for embedded TTCM');
check(center.includes('work-schedule-daily-shell'), 'renders the approved single-day schedule shell');
check(center.includes('work-schedule-daily-nav'), 'renders previous/day/next/today navigation');
check(center.includes('work-schedule-daily-main'), 'renders the large left daily timeline');
check(center.includes('work-schedule-daily-sidebar'), 'renders the right summary rail');
check(center.includes('work-schedule-daily-event'), 'renders full-width readable daily event cards');
check(center.includes('work-schedule-daily-time'), 'renders start/end time beside the daily rail');
check(center.includes('work-schedule-daily-card-copy'), 'renders event title and metadata without weekly-column compression');
check(center.includes('work-schedule-daily-summary'), 'renders Hoạt động hôm nay summary');
check(center.includes('work-schedule-daily-summary-grid'), 'renders category counts for the selected day');
check(center.includes('work-schedule-daily-quote'), 'renders the middle inspirational quote card');
check(center.includes('work-schedule-daily-next'), 'renders the Tiếp theo card');
check(center.includes('work-schedule-daily-footer-note'), 'renders the bottom illustrated education note');
check(center.includes("['all', 'Tất cả'"), 'preserves all category filter');
check(center.includes("['meeting', 'Họp'"), 'preserves meeting category filter');
check(center.includes("['training', 'Đào tạo'"), 'preserves training category filter');
check(center.includes("['student', 'Học sinh'"), 'preserves student category filter');
check(center.includes("['deadline', 'Hạn nộp'"), 'preserves deadline category filter');
check(center.includes("['other', 'Khác'"), 'preserves other category filter');
check(center.includes('scheduleCategoryForEvent'), 'preserves schedule classification');
check(!center.includes('work-schedule-editorial-stage'), 'removes the seven-column editorial week renderer from TTCM');
check(!center.includes('work-schedule-day-track'), 'removes cramped weekly day cards from TTCM');
check(center.includes('File mẫu'), 'keeps schedule template flow available');
check(center.includes('Upload lịch'), 'keeps upload flow available');
check(center.includes('Thêm lịch'), 'keeps add schedule flow available');
check(center.includes('work-schedule-embedded-actions'), 'shows schedule management actions inside embedded TTCM daily view');
check(center.includes('⇧ Tải lên lịch'), 'restores a visible upload action in embedded TTCM schedule');
check(center.includes('accept=".xlsx,.csv"'), 'keeps XLSX and CSV upload support');

// Production selector fidelity: match the approved daily mockup.
check(wrapper.includes("import './GlobalWorkScheduleTimelineV2.css';"), 'loads the TTCM schedule skin');
check(css.includes('.ttcm-m3-schedule-host .work-schedule-center'), 'scopes the design to TTCM schedule host');
check(css.includes('.work-schedule-daily-shell'), 'styles the daily shell');
check(css.includes('.work-schedule-embedded-actions'), 'styles compact embedded schedule management controls');
check(css.includes('.work-schedule-embedded-actions button.is-upload'), 'visually prioritizes the restored upload action');
check(/\.work-schedule-daily-shell\s*\{[^}]*grid-template-columns\s*:\s*minmax\(0\s*,\s*2fr\)\s+minmax\(300px\s*,\s*1fr\)/.test(css), 'uses a two-thirds timeline and one-third summary rail');
check(/\.work-schedule-daily-event\s*\{[^}]*min-height\s*:\s*7[0-9]px/.test(css), 'gives daily events comfortable card height');
check(/\.work-schedule-daily-card-copy strong[^}]*font-size\s*:\s*1[3-5]px/.test(css), 'keeps daily event titles readable');
check(/\.work-schedule-daily-time\s*\{[^}]*width\s*:\s*7[0-9]px/.test(css), 'reserves a stable time column');
check(/\.work-schedule-daily-summary-grid\s*\{[^}]*grid-template-columns\s*:\s*repeat\(5\s*,\s*1fr\)/.test(css), 'uses five category summary cells');
check(/\.work-schedule-daily-next-item\s*\{[^}]*min-height\s*:\s*5[4-9]px/.test(css), 'styles compact next-event cards');
check(css.includes('.work-schedule-daily-footer-note'), 'styles the illustrated bottom note');
check(/@media\s*\(max-width\s*:\s*1000px\)/.test(css), 'stacks daily summary below timeline on smaller screens');
check(nav.includes("querySelector('.ttcm-m3-schedule-view')") && nav.includes('scrollTop = 0'), 'keeps schedule scroll reset on entry');

console.log(`\nTTCM schedule timeline mockup contract: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);
