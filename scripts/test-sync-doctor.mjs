import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareSyncDoctorSnapshots,isActiveSyncStudent,SYNC_DOCTOR_RULESET} from '../src/utils/syncDoctorRules.mjs';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const baseSources=()=>Object.fromEntries(['canonical','gradebook','homeroom','assessment','assignment'].map(x=>[x,{status:'ok',label:x}]));
const student=(id,code='A101',name='Nguyễn Minh An')=>({rosterStudentId:id,code,fullName:name,birthDate:'2009-01-01',gender:'Nam',active:true});
const roster=(students)=>({roster_key:'class:2026-2027||12.3',school_year:'2026-2027',class_name:'12.3',students});
const gradebook=students=>({school_year:'2026-2027',class_name:'12.3',payload:{students}});
function check(patch={}){
 return compareSyncDoctorSnapshots({schoolYear:'2026-2027',className:'12.3',
  sources:baseSources(),canonical:[roster([student('student-1')])],
  gradebooks:[gradebook([student('student-1')])],homeroom:[],assessmentClasses:[],localQueue:{pending:0},...patch});
}
assert.equal(SYNC_DOCTOR_RULESET,'1.0.0');
assert.equal(check().issues.length,0,'Exact IDs should reconcile without findings.');
assert.ok(check({gradebooks:[gradebook([])]}).issues.some(x=>x.code==='STUDENT_NOT_LINKED'),
 'Missing gradebook association should be diagnosed.');
assert.equal(check({gradebooks:[gradebook([{code:'A101',fullName:'Different'}])]}).issues.length,0,
 'Unique student code may bridge legacy gradebook IDs.');
assert.ok(check({gradebooks:[gradebook([{fullName:'Nguyễn Minh An',birthDate:'2009-01-01',gender:'Nam'}])]}).issues.some(x=>x.code==='AMBIGUOUS_IDENTITY'),
 'Name, DOB and gender are only review evidence.');
assert.ok(check({canonical:[roster([student('s1'),student('s1')])]}).issues.some(x=>x.code==='IDENTITY_DUPLICATE'));
assert.ok(check({canonical:[roster([student('s1','A101'),student('s2','A101')])]}).issues.some(x=>x.code==='STUDENT_CODE_DUPLICATE'));
assert.ok(check({sources:{...baseSources(),canonical:{status:'unauthorized',label:'canonical'}},
 canonical:[],gradebooks:[gradebook([student('s1')])]}).issues.some(x=>x.code==='SOURCE_UNVERIFIED'));
assert.ok(check({localQueue:{pending:2}}).issues.some(x=>x.code==='LOCAL_QUEUE_PENDING'));
assert.ok(!isActiveSyncStudent({...student('s1'),active:false}));
assert.ok(!isActiveSyncStudent({...student('s1'),lifecycleStatus:'deleted'}));
assert.equal(check({schoolYear:'2025-2026'}).issues.length,0,'Wrong-year data should never be compared as current year.');
const adapter=read('src/utils/syncDoctorDiagnostics.js');
const component=read('src/pages/SyncDoctor.jsx');
const permissions=read('src/utils/permissions.js');
const tools=read('src/pages/ToolPage.jsx');
const apps=read('src/data/apps.js');
assert.match(adapter,/runSyncDoctorScan/);
assert.match(adapter,/\.select\(/);
assert.doesNotMatch(adapter,/\.(?:update|insert|delete|upsert)\s*\(/);
assert.match(adapter,/serializeSyncDoctorReport/);
assert.match(component,/isAdminRole/);
assert.match(component,/isDepartmentLeaderRole/);
assert.match(component,/report\\.issues/);
assert.match(component,/No records are created/);
assert.match(permissions,/slug === 'sync-doctor'/);
assert.match(apps,/slug: 'sync-doctor'/);
assert.match(tools,/slug === 'sync-doctor'/);
console.log('PASS Sync Doctor: role gating, deterministic reconciler, read-only sources, missing/ambiguous/duplicate cases, year scope, local queue.');
