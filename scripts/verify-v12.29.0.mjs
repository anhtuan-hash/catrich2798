import fs from 'node:fs';
const jsx = fs.readFileSync('src/pages/LessonPack.jsx','utf8');
const css = fs.readFileSync('src/ui-core/styles/lesson-pack-workflow-v1229.css','utf8');
const main = fs.readFileSync('src/main.jsx','utf8');
const version = fs.readFileSync('src/config/version.js','utf8');
const checks = [
  ['six-step workflow', ['Mục tiêu & lớp học','Nguồn học liệu','Khung bài dạy','Hoạt động & AI','Trình chiếu & giao bài','Xuất bản'].every((label)=>jsx.includes(label))],
  ['no sidebar rendered', !jsx.includes('<PackList ') && css.includes('.lp-sidebar{display:none')],
  ['modern hero', jsx.includes('lp29-hero') && jsx.includes('Connected Teaching Suite') && css.includes('.lp29-hero-art')],
  ['interactive workflow steps', jsx.includes('setStep(workflow.id)') && jsx.includes('data-workflow-step')],
  ['connected delivery actions', jsx.includes('classroom-delivery?pack=') && jsx.includes('setLive(true)')],
  ['publish outputs', jsx.includes("fileName(pack.title)}.json") && jsx.includes("fileName(pack.title)}.html")],
  ['workflow css imported', main.includes('lesson-pack-workflow-v1229.css')],
  ['version updated', version.includes("12.29.0")],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? '✓' : '✗'} ${label}`); if (!ok) failed += 1; }
if (failed) process.exit(1);
console.log(`All ${checks.length} V12.29.0 checks passed.`);
