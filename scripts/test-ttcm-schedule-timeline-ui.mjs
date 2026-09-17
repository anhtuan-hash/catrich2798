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
check(center.includes('work-schedule-timeline-day'), 'renders styled day columns');
check(center.includes('work-schedule-timeline-rail'), 'renders vertical rails for day events');
check(center.includes('work-schedule-timeline-event'), 'renders timeline event cards');
check(center.includes('work-schedule-event-location'), 'shows event location inside timeline cards');
check(center.includes('work-schedule-empty-day'), 'renders the friendly empty-day panel');
check(center.includes('work-schedule-timeline-more'), 'renders per-day continuation control');
check(center.includes('work-schedule-hero-art'), 'adds a semantic hero artwork hook');
check(center.includes('work-schedule-quote-footer'), 'adds the illustrated quote footer hook');

// Production selector fidelity: style the actual TTCM host, not an unrelated wrapper.
check(wrapper.includes("import './GlobalWorkScheduleTimelineV2.css';"), 'loads the high-fidelity TTCM schedule skin');
check(css.includes('.ttcm-m3-schedule-host .work-schedule-center'), 'scopes the visual design to the production TTCM schedule host');
check(css.includes('.work-schedule-hero-art'), 'styles the hero illustration');
check(css.includes('data:image/svg+xml'), 'preserves approved calendar / plants / books artwork as deploy-safe SVG');
check(css.includes('.work-schedule-category-filters'), 'styles real category filter chips');
check(css.includes('.work-schedule-timeline-board'), 'styles the seven-column timeline board');
check(css.includes('grid-template-columns: repeat(7, minmax(176px, 1fr))'), 'uses seven equal timeline columns on desktop');
check(css.includes('border-left: 1px dashed'), 'draws the vertical timeline rails');
check(css.includes('.work-schedule-timeline-event.is-meeting'), 'styles meeting events');
check(css.includes('.work-schedule-timeline-event.is-training'), 'styles training events');
check(css.includes('.work-schedule-timeline-event.is-student'), 'styles student events');
check(css.includes('.work-schedule-timeline-event.is-deadline'), 'styles deadline events');
check(css.includes('.work-schedule-empty-day'), 'styles the friendly empty-day card');
check(css.includes('.work-schedule-quote-footer'), 'styles the scenic education footer');
check(css.includes('Lịch làm việc khoa học'), 'preserves the approved footer quote');
check(css.includes('Giáo dục là hành trình'), 'preserves the handwritten footer message');
check(css.includes('@media (max-width: 900px)'), 'keeps the timeline usable on narrow screens');

console.log(`\nTTCM schedule timeline mockup contract: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);
