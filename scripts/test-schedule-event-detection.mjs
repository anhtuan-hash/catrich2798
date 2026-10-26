import assert from 'node:assert/strict';
import { detectScheduleEvent, draftFromScheduleRow, extractScheduleCandidates } from '../src/utils/scheduleEventDetection.mjs';
import { scheduleRowsFromGrid, parseDelimitedText } from '../src/utils/workScheduleImport.js';

const fixture = [
  ['Ngày','Bắt đầu','Kết thúc','Nội dung công việc','Địa điểm','Người phụ trách','Thành phần','Ghi chú','Mức độ'],
  ['26/10/2026','08:30','09:30','Họp BTC SHNK báo cáo tiến độ', 'Cơ sở 3','BGH, BĐH, TTCM các tổ','', '', 'Cao'],
  ['27/10/2026','14:00','','TTCM gửi báo cáo công tác tháng 10', '', 'TTCM, TPCM', '', '', 'Bình thường'],
  ['28/10/2026','08:15','09:00','Thao giảng môn AV - thầy Nguyễn Anh Tuấn lớp 11.3', 'B201, CS3','BGH, TCM','','',''],
  ['28/10/2026','09:15','','Thao giảng tiếng Anh lớp 8.8', 'CS2','BGH, TCM','','',''],
  ['30/10/2026','13:55','15:50','Tổ chức sinh hoạt chuyên đề Halloween cho học sinh khối 11','','Tổ TA THPT','','',''],
  ['31/10/2026','','','Gửi báo cáo bồi dưỡng HSG cho BGH','','Các TTCM','','',''],
];
const parsed = scheduleRowsFromGrid(fixture, { fileName: 'tuan15.csv' });
assert.equal(parsed.ok, true);
assert.equal(parsed.validRows.length, 6);
const detected = extractScheduleCandidates(parsed.validRows);
assert.equal(detected.length, 5, 'THCS thao giảng must not be targeted');
const missing = detected.find(({row})=>row.title.includes('bồi dưỡng HSG'));
assert.ok(missing?.detection.needsTimeReview, 'Missing time must remain a review issue');
assert.equal(draftFromScheduleRow(missing.row,missing.detection), null, 'Missing time cannot be invented');
const halloween = detected.find(({row})=>row.title.includes('Halloween'));
assert.equal(halloween.detection.audience,'english_thpt');
const draft = draftFromScheduleRow(halloween.row, halloween.detection, new Date('2026-10-26T01:00:00Z'));
assert.equal(draft.category,'Sinh hoạt chuyên đề');
assert.equal(draft.school_year,'2026-2027');
assert.equal(draft.venue_type,'offline');
assert.ok(draft.event_end_at > draft.event_start_at);
assert.ok(draft.description.includes('tuan15.csv'));
assert.equal(detectScheduleEvent({title:'Thao giảng tiếng Anh lớp 8.8',ownerText:'BGH, TCM'}), null);
assert.ok(detectScheduleEvent({title:'Họp TT-TPCM', ownerText:'BGH, TTCM các tổ'}));
assert.ok(detectScheduleEvent({title:'Họp tổng kết',ownerText:'Tổ Tiếng Anh THPT'}));
const csv = 'Ngày,Bắt đầu,Nội dung công việc,Người phụ trách\n26/10/2026,09:00,Họp TTCM,TTCM\n';
assert.equal(parseDelimitedText(csv).length,2);
console.log('PASS: TTCM/English THPT event detection, missing-time review, no false THCS events');
