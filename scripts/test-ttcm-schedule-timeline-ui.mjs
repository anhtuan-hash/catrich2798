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

const wrapper = await readFile(new URL('../src/components/GlobalWorkScheduleCompatibleCenter.jsx', import.meta.url), 'utf8');
const center = await readFile(new URL('../src/components/GlobalWorkScheduleCenter.jsx', import.meta.url), 'utf8');
const timelineCss = await readFile(new URL('../src/components/GlobalWorkScheduleTimeline.css', import.meta.url), 'utf8').catch(() => '');

// Existing business controls must remain intact.
check(center.includes('File mẫu'), 'preserves template download action');
check(center.includes('Upload lịch'), 'preserves schedule upload action');
check(center.includes('Thêm lịch'), 'preserves manual add action');
check(center.includes('work-schedule-drawer'), 'preserves event detail drawer');
check(center.includes('work-schedule-modal import-modal'), 'preserves import preview modal');
check(center.includes('work-schedule-modal editor-modal'), 'preserves create/edit modal');

// Approved graphical timeline skin.
check(wrapper.includes("import './GlobalWorkScheduleTimeline.css';"), 'loads the dedicated TTCM timeline skin');
check(timelineCss.includes('.work-schedule-center::before'), 'adds illustrated pastel hero ambience');
check(timelineCss.includes('data:image/svg+xml'), 'keeps approved graphics as deploy-safe inline SVG');
check(timelineCss.includes('Cùng kiến tạo'), 'keeps the handwritten education slogan in hero art');
check(timelineCss.includes('.work-schedule-metrics article:nth-child(1)::before'), 'adds individual metric icon tiles');
check(timelineCss.includes('.work-schedule-calendar.is-week .work-schedule-grid'), 'targets the weekly view as a timeline');
check(timelineCss.includes('grid-template-columns: repeat(7, minmax(176px, 1fr))'), 'keeps seven equal timeline day columns');
check(timelineCss.includes('.work-schedule-calendar.is-week .work-schedule-grid > article::before'), 'adds weekday labels to timeline columns');
check(timelineCss.includes('border-left: 1px dashed'), 'draws the vertical timeline rails');
check(timelineCss.includes('.work-schedule-calendar.is-week .work-schedule-grid > article.today'), 'highlights the current day column');
check(timelineCss.includes('.work-schedule-calendar.is-week .work-schedule-grid > article > div > button::before'), 'adds timeline event nodes/icons');
check(timelineCss.includes('.work-schedule-filterbar::before'), 'renders the approved category legend beside week navigation');
check(timelineCss.includes('Họp'), 'keeps meeting legend chip');
check(timelineCss.includes('Đào tạo'), 'keeps training legend chip');
check(timelineCss.includes('Học sinh'), 'keeps student legend chip');
check(timelineCss.includes('Hạn nộp'), 'keeps deadline legend chip');
check(timelineCss.includes('.work-schedule-calendar.is-week .work-schedule-grid > article:last-child'), 'styles the Sunday/empty-day state');
check(timelineCss.includes('Không có lịch làm việc'), 'keeps the friendly empty-day message');
check(timelineCss.includes('.work-schedule-center::after'), 'adds the scenic quote footer');
check(timelineCss.includes('Lịch làm việc khoa học'), 'keeps the approved footer quote');
check(timelineCss.includes('Giáo dục là hành trình'), 'keeps the handwritten footer message');
check(timelineCss.includes('@media (max-width: 900px)'), 'keeps a responsive narrow-screen timeline');

console.log(`\nTTCM schedule timeline contract: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);
