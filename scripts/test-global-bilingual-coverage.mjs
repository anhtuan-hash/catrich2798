// Sitewide i18n regression contract: run with node scripts/test-global-bilingual-coverage.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { lookupLegacyUiEnglish, translateLegacyUi } from '../src/utils/globalI18n.js';

assert.equal(translateLegacyUi('Điểm danh','en'), 'Attendance');
assert.equal(translateLegacyUi('Điểm danh','vi'), 'Điểm danh');
assert.equal(translateLegacyUi('Không xác định','vi'), 'Không xác định');
assert.equal(translateLegacyUi('Thêm câu hỏi thủ công','en'),'Add question manually');
assert.equal(translateLegacyUi('Mật khẩu khóa rèn luyện','en'),'Conduct lock password');
assert.equal(translateLegacyUi('37 học sinh','en'),'37 students');
assert.equal(translateLegacyUi('Nguyễn Lê Thiện','en'),'Nguyễn Lê Thiện');
assert.equal(translateLegacyUi('Bài kiểm tra của cô Lan','en'),'Bài kiểm tra của cô Lan');
assert.equal(lookupLegacyUiEnglish('Ghi chú đánh giá do giáo viên nhập'),null);
assert.equal(translateLegacyUi('Hướng dẫn & Lưu ý nhanh','en'),'Instructions & quick notes');
assert.equal(translateLegacyUi('Hướng dẫn &amp; Lưu ý nhanh','en'),'Instructions &amp; quick notes');
assert.equal(translateLegacyUi('Menu tài khoản','en'),'Account menu');
assert.equal(translateLegacyUi('Lớp 11','en'),'Grade 11');
assert.equal(translateLegacyUi('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM','en'),'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
assert.equal(translateLegacyUi('Nguyễn Văn A','en'),'Nguyễn Văn A');
assert.equal(translateLegacyUi('Đã nhập 8 mục vào lịch làm việc dùng chung.','en'),'Imported 8 entries into the shared work schedule.');
assert.equal(translateLegacyUi('Đã thêm Nguyễn Lê Thiện vào lớp 12.3.','en'),'Added Nguyễn Lê Thiện to class 12.3.');
assert.equal(translateLegacyUi('Còn 2 mục bắt buộc cần hoàn thiện.','en'),'2 required items remain incomplete.');
assert.equal(translateLegacyUi('Đã lưu: 6 câu mới · 3 câu đã có · 1 đề thi.','en'),'Saved: 6 new questions · 3 existing questions · 1 test.');
assert.equal(translateLegacyUi('Đã thêm một con mèo vào phòng 12.3','en'),'Đã thêm một con mèo vào phòng 12.3');

const main = fs.readFileSync('src/main.jsx','utf8');
const bridge = fs.readFileSync('src/components/GlobalLegacyI18nBridge.jsx','utf8');
assert.match(main, /<GlobalLegacyI18nBridge language=\{language\}/);
assert.match(bridge, /element\.tagName === 'OPTION' && !element\.hasAttribute\('value'\)/);
assert.match(bridge, /EXCLUDED_ELEMENTS/);
assert.match(bridge, /MutationObserver/);
assert.match(bridge, /attributesMemory/);
assert.match(bridge, /textMemory/);
assert.match(bridge, /requestAnimationFrame/);
assert.doesNotMatch(bridge, /fetch\s*\(|XMLHttpRequest|sendBeacon/);

const relevant = [
 'src/pages/QuestionBank.jsx',
 'src/pages/PersonnelHub.jsx',
 'src/pages/MonthlyReportsWorkspace.jsx',
 'src/components/GlobalAttendanceNavigationTab.jsx',
 'src/components/GlobalTtcmNavigationTab.jsx',
 'src/components/homeroom/StudentRecordsTab.jsx',
 'src/components/HomeroomConductTab.jsx',
 'src/components/gradebook/GradebookMacEngine.jsx',
];
let covered = 0, total = 0;
const rows = [];
for (const path of relevant) {
  const source = fs.readFileSync(path,'utf8');
  const candidates = [
    ...[...source.matchAll(/>([^<>{}\n]{2,110})</g)].map(x=>x[1].trim()),
    ...[...source.matchAll(/\b(?:placeholder|title|aria-label)="([^"]{2,110})"/g)].map(x=>x[1].trim()),
  ].filter(s => /[À-ỹĐđĂăÂâÊêÔôƠơƯư]/.test(s));
  const translated = candidates.filter(s => lookupLegacyUiEnglish(s) !== null).length;
  total += candidates.length;
  covered += translated;
  rows.push(path+': '+translated+'/'+candidates.length);
}
assert.ok(total >= 700, 'Expected an auditable cross-app sample');
const coverage = covered / total;
assert.ok(coverage >= 0.99, 'Major route labels must remain at least 99% covered: '+(coverage*100).toFixed(1)+'%');
console.log('Global bilingual UI contract passed: '+covered+'/'+total+' audited static labels ('+(coverage*100).toFixed(1)+'%).');
