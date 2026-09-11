import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeExtraClassActivity, normalizeSupplementalActivity, filterAttendanceActivities } from '../src/attendance/attendanceActivity.js';

const supplemental = normalizeSupplementalActivity({ id:'s1',kind:'recurring',title:'Ôn Toán',subject:'Toán',teacherName:'GV A',attendanceDate:'2026-09-11',startTime:'16:45',endTime:'18:00',room:'A1',participantCount:12,status:'scheduled' });
assert.deepEqual(supplemental,{id:'s1',source:'supplemental',activityType:'supplemental',title:'Ôn Toán',subject:'Toán',teacherName:'GV A',date:'2026-09-11',timeRange:'16:45–18:00',room:'A1',participantCount:12,status:'scheduled',supplementalKind:'recurring'});
const extra = normalizeExtraClassActivity({id:'e1',class_type:'enrichment',class_name:'BD Anh 12',subject:'Anh',teacher_name:'GV B',attendance_date:'2026-09-11',teaching_time_range:'16:45–18:00',teaching_room:'B1',total_students:9,session_status:'completed'});
assert.equal(extra.activityType,'enrichment');
assert.equal(extra.source,'extra');
assert.equal(filterAttendanceActivities([supplemental,extra],'supplemental').length,1);
const api = await readFile(new URL('../src/attendance/supplementalLearningApi.js', import.meta.url),'utf8');
assert.match(api,/bes_list_supplemental_attendance/);
assert.match(api,/bes_begin_supplemental_attendance/);
assert.match(api,/bes_confirm_supplemental_attendance/);
assert.match(api,/\.map\(normalizeSupplementalActivity\)/);
console.log('supplemental learning activity contract: ok');
