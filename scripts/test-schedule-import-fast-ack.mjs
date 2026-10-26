import assert from 'node:assert/strict';
import fs from 'node:fs';
import { scheduleRowsFromGrid } from '../src/utils/workScheduleImport.js';
import { detectScheduleEvent } from '../src/utils/scheduleEventDetection.mjs';

const source=fs.readFileSync('src/components/GlobalWorkScheduleCenter.jsx','utf8');
const service=fs.readFileSync('src/features/events/services/scheduleEventDrafts.js','utf8');
const begin=source.indexOf('  async function importSchedule() {');
const finish=source.indexOf('  async function saveEditor(event) {',begin);
assert.ok(begin>=0&&finish>begin);
const flow=source.slice(begin,finish);
const saved=flow.indexOf('setImportOpen(false)');
const draft=flow.indexOf('createDraftsForScheduleItems(candidates,');
const audit=flow.indexOf('recordAuditEvent({');
assert.ok(saved>0&&draft>saved,'UI must close before draft/poster work starts');
assert.ok(audit>saved,'audit logging must not block the import modal');
assert.match(flow,/void createDraftsForScheduleItems/);
assert.doesNotMatch(flow,/await createDraftsForScheduleItems/);
assert.match(flow,/Promise\.allSettled/);
assert.match(flow,/setBusy\(false\)/);
assert.match(source,/fetchServerScheduleFingerprints\(client, parsed\.validRows\)/);
assert.match(source,/serverFingerprints\.has\(row\.fingerprint\)/);
assert.match(source,/eventDraftProgress/);
assert.match(service,/export async function createDraftsForScheduleItems\(items = \[\], \{ onProgress \} = \{\}\)/);
assert.match(service,/completed \+= 1;/);
assert.match(service,/onProgress\(\{/);
// Regression fixture based on week 15 CSV: a 38-row import with four event
// candidates must not require 38 client-side poster rendering requests.
const raw=[['Ngày','Bắt đầu','Kết thúc','Nội dung công việc','Địa điểm','Người phụ trách','Thành phần','Ghi chú','Mức độ']];
for(let n=0;n<38;n++){
  const title=n===0?'Họp TT-TPCM tháng 11':n===1?'Chuyên đề Halloween lớp 11':n===2?'Báo cáo tháng 10 TTCM':n===3?'Bồi dưỡng HSG TTCM':'Công việc chung số '+n;
  raw.push(['26/10/2026',n===3?'': '09:00','10:00',title,'Phòng họp',n<4?'TTCM': 'Văn phòng','','','']);
}
const parsed=scheduleRowsFromGrid(raw,{fileName:'tuan15.csv'});
assert.equal(parsed.validRows.length,38);
assert.equal(parsed.validRows.filter(row=>detectScheduleEvent(row)).length,4);
assert.equal(parsed.validRows.filter(row=>detectScheduleEvent(row)).filter(row=>row.timeKnown).length,3);
console.log('PASS: schedule import acknowledges saved rows before post-processing; 38 rows / 4 event candidates / 1 missing time.');
