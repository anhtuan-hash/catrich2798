import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {requiredPaperDocs,inspectStudentRecord,buildRecordsReview,recordsReviewFilter} from '../src/utils/homeroom4RecordsReview.js';
assert.deepEqual(requiredPaperDocs('10'),['completionCertificate','birthCertificate','transcript']);
assert.deepEqual(requiredPaperDocs('12'),['completionCertificate','birthCertificate','grade10Admission','transcript']);
const fullyVerified={
 checklist:{completionCertificate:'complete',birthCertificate:'complete',grade10Admission:'complete',transcript:'complete'},
 canonical:{fullName:'Nguyễn Minh Anh',birthDate:'2009-08-15',citizenId:'079123456789'},
 sources:{
  paper:{captures:[{id:'paper1'}]},
  vnedu:{fields:{fullName:'Nguyen Minh Anh',birthDate:'15/08/2009',citizenId:'079123456789'}},
  moet:{fields:{fullName:'NGUYEN MINH ANH',birthDate:'15-08-2009',citizenId:'079123456789'}},
 },
 verifiedAt:'2026-10-12T00:00:00.000Z',
};
const good=inspectStudentRecord(fullyVerified,'12');
assert.equal(good.paperPercent,100);
assert.equal(good.paperCompleted,4);
assert.equal(good.paperTotal,4);
assert.equal(good.complete,true);
assert.equal(good.verified,true);
assert.equal(good.mismatches.length,0,'Case accents and ISO birth date must normalize');
assert.deepEqual(good.missingSources,[]);
const notReady=inspectStudentRecord({
 checklist:{completionCertificate:'complete',birthCertificate:'missing',transcript:'complete'},
 sources:{
  vnedu:{fields:{fullName:'Nguyễn Minh Anh'}},
  moet:{fields:{fullName:'Trần Minh Anh'}},
 },
 verifiedAt:'2026-10-12',
},'10');
assert.equal(notReady.paperPercent,67);
assert.equal(notReady.missingDocs.length,1);
assert.equal(notReady.missingMoetCitizenId,true);
assert.equal(notReady.mismatches.length,1);
assert.equal(notReady.complete,false,'Manual verified marker cannot excuse missing paper or mismatched sources');
const none=inspectStudentRecord({},'12');
assert.equal(none.paperPercent,0);
assert.equal(none.verified,false);
assert.equal(none.missingSources.length,2);
assert.equal(none.mismatches.length,0,'No fabricated conflicts between absent sources');
assert.equal(none.missingMoetCitizenId,false,'Do not flag missing citizen ID in a source that is completely absent');
const workspace={
 classProfile:{grade:'12'},
 students:[{id:'s1',active:true},{id:'s2',active:true},{id:'s3',active:false}],
 studentRecords:{s1:fullyVerified,s2:{...fullyVerified,sources:{paper:{},vnedu:{fields:{citizenId:'A'}},moet:{fields:{citizenId:'B'}}},verifiedAt:''}},
};
const result=buildRecordsReview(workspace);
assert.equal(result.total,2,'Archived students excluded');
assert.equal(result.complete,1);
assert.equal(result.needs,1);
assert.equal(result.verified,1);
assert.equal(result.mismatches,1);
assert.equal(result.paperReady,2);
assert.equal(result.digitalReady,2);
assert.deepEqual(result.entries.filter(e=>recordsReviewFilter(e,'complete')).map(e=>e.student.id),['s1']);
assert.deepEqual(result.entries.filter(e=>recordsReviewFilter(e,'issues')).map(e=>e.student.id),['s2']);
assert.deepEqual(result.entries.filter(e=>recordsReviewFilter(e,'verified')).map(e=>e.student.id),['s1']);
assert.deepEqual(result.entries.filter(e=>recordsReviewFilter(e,'missing')).map(e=>e.student.id),['s2']);
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const component=read('src/components/homeroom/StudentRecordsTab.jsx');
const css=read('src/components/homeroom/HomeroomRecordsReview.css');
assert.match(component,/buildRecordsReview\(workspace\)/);
assert.match(component,/recordsReviewFilter\(entry,filter\)/);
assert.match(component,/inspectStudentRecord\(record,grade\)\.paperPercent/);
assert.match(component,/className="sr4-review-center"/);
assert.match(component,/Có cả dữ liệu vnEdu và MOET/);
assert.match(component,/'verified','Đã xác nhận'/);
assert.match(component,/<span>Giấy tờ<\/span>/);
assert.doesNotMatch(component,/paperScore\*\.45\+digitalScore\*\.35/, 'Synthetic completion percentage must no longer drive student status');
assert.match(component,/recognizeStudentRecordImage/,'Keep OCR flow untouched');
assert.match(component,/cleanupStudentRecordCloudOrphans/,'Keep private media cleanup');
assert.match(component,/readVneduExcelFile/);
assert.match(component,/readMoetExcelFile/);
assert.match(component,/readPaperRecordsExcelFile/);
assert.match(css,/\.page\.hr-page\.hr-v4/);
assert.match(css,/prefers-reduced-motion/);
assert.doesNotMatch(css,/(^|\n)\s*:root\s*\{/);
console.log('Homeroom 4.0 Phase 5 Records Review: objective paper completion, documented conflicts, explicit verification and privacy contracts OK');
