import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  scheduleWeekWindow, moveScheduleWeek, eligibleScheduleWeekRows,
  isImportedScheduleItem, isLegacyScheduleItem, isWeekDeletableScheduleItem,
  deletionPreviewIsCurrent, scheduleDeleteBatches,
} from '../src/utils/scheduleWeekBulkDelete.mjs';

const w = scheduleWeekWindow('2026-10-30');
assert.equal(w.monday,'2026-10-26');
assert.equal(w.sunday,'2026-11-01');
assert.equal(w.endExclusive,'2026-11-02');
assert.equal(w.startAt,'2026-10-25T17:00:00.000Z');
assert.equal(w.endAt,'2026-11-01T17:00:00.000Z');
assert.equal(scheduleWeekWindow('2026-11-01').monday,'2026-10-26');
assert.equal(scheduleWeekWindow('2026-11-02').monday,'2026-11-02');
assert.equal(scheduleWeekWindow('2027-01-01').monday,'2026-12-28');
assert.equal(moveScheduleWeek('2026-12-31',1),'2027-01-04');
assert.throws(()=>scheduleWeekWindow('2026-02-29'),/Invalid/);
assert.throws(()=>scheduleWeekWindow('not-a-date'),/Invalid/);

const schedule=(id,time,metadata={schedule_source_file:'week15.csv'})=>({
  id,title:'Lịch '+id,item_type:'schedule',due_at:time,metadata,
});
const rows=[
  schedule('start',w.startAt),
  schedule('inside','2026-10-30T06:55:00.000Z',{schedule_import_id:'import-week15'}),
  schedule('last','2026-11-01T16:59:59.999Z'),
  schedule('future',w.endAt),
  schedule('past','2026-10-25T16:59:59.999Z'),
  schedule('manual','2026-10-26T02:00:00Z',{schedule_manual:true}),
  { ...schedule('ordinaryTask','2026-10-26T02:00:00Z'),item_type:'task' },
  { ...schedule('mismatchedMetadata','2026-10-26T02:00:00Z'), item_type:'assignment',
    metadata:{schedule_import_id:'wrong-kind'} },
  schedule('legacy','2026-10-27T02:00:00Z',{}),
];
assert.deepEqual(eligibleScheduleWeekRows(rows,w).map(x=>x.id),['start','inside','last']);
assert.deepEqual(eligibleScheduleWeekRows(rows,w,true).map(x=>x.id),['start','inside','last','manual','legacy']);
assert.equal(isImportedScheduleItem(rows[5]),false);
assert.equal(isImportedScheduleItem(rows[1]),true);
const legacySchedule = {
  ...schedule('legacy-import', '2026-10-26T02:00:00Z', { schedule_event:true, schedule_import_id:'week15' }),
  item_type:'task', source_module:'work-schedule-import-v1168',
};
assert.equal(isLegacyScheduleItem(legacySchedule),true);
assert.equal(isWeekDeletableScheduleItem(legacySchedule),true);
assert.equal(isImportedScheduleItem(legacySchedule),true);
assert.deepEqual(eligibleScheduleWeekRows([...rows,legacySchedule],w).map(x=>x.id),['start','inside','last','legacy-import']);
assert.equal(isLegacyScheduleItem({ ...legacySchedule,source_module:'work-hub' }),false);
assert.equal(isLegacyScheduleItem({ ...legacySchedule,metadata:{ schedule_import_id:'week15' } }),false);
assert.equal(isWeekDeletableScheduleItem({ ...legacySchedule,item_type:'task',metadata:{ schedule_event:false } }),false);
assert.equal(deletionPreviewIsCurrent([legacySchedule],[{ ...legacySchedule, item_type:'schedule' }]),false);
assert.equal(deletionPreviewIsCurrent([legacySchedule],[{ ...legacySchedule, source_module:'other' }]),false);
assert.equal(deletionPreviewIsCurrent([legacySchedule],[{ ...legacySchedule, title:'Changed' }]),false);
assert.deepEqual(eligibleScheduleWeekRows([rows[0],rows[0]],w).map(x=>x.id),['start']);

const selected=eligibleScheduleWeekRows(rows,w);
assert.equal(deletionPreviewIsCurrent(selected,[...selected]),true);
assert.equal(deletionPreviewIsCurrent(selected,selected.slice(1)),false);
assert.equal(deletionPreviewIsCurrent(selected,[{...selected[0],due_at:'2026-10-31T02:00:00Z'},...selected.slice(1)]),false);
assert.equal(deletionPreviewIsCurrent(selected,[{...selected[0],title:'Edited'},...selected.slice(1)]),false);
assert.equal(deletionPreviewIsCurrent(selected,[{...selected[0],item_type:'task'},...selected.slice(1)]),false);
assert.deepEqual(scheduleDeleteBatches(rows.slice(0,3),2),[['start','inside'],['last']]);
assert.throws(()=>scheduleDeleteBatches([],101),/Invalid/);

// Contract: week deletion must be explicit, typed-confirmed and server-scoped.
// It must NEVER cascade to the separately managed bes_events / published announcements.
const ui=fs.readFileSync('src/components/GlobalWorkScheduleCenter.jsx','utf8');
assert.match(ui,/deleteWeekConfirm\.trim\(\)\.toUpperCase\(\) !== 'XOA'/);
assert.match(ui,/loadScheduleWeekFromServer\(client, deleteWeekWindow\)/);
assert.match(ui,/deletionPreviewIsCurrent\(deleteWeekTargets, fresh\)/);
assert.match(ui,/\.delete\(\)\.eq\('item_type', itemType\)/);
assert.match(ui,/\.eq\('source_module', LEGACY_SCHEDULE_SOURCE\)/);
assert.match(ui,/\.contains\('metadata', \{ schedule_event: true \}\)/);
assert.match(ui,/for \(const itemType of \[WORK_SCHEDULE_ITEM_TYPE, 'task'\]\)/);
assert.match(ui,/\.gte\('due_at', deleteWeekWindow\.startAt\)\.lt\('due_at', deleteWeekWindow\.endAt\)/);
assert.doesNotMatch(ui.slice(ui.indexOf('async function deleteSelectedWeekItems()'),ui.indexOf('async function deleteEvent(target)')),/from\('bes_events'\)\.delete/);
console.log('Weekly schedule bulk-delete: week boundaries, selection safety, race checks, and no event cascade passed.');
