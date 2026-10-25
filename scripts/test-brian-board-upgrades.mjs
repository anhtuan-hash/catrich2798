import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newLesson,normalizeLesson} from '../src/components/BrianBoard/boardModel.js';
import {createBoardActivity,publicBoardActivity} from '../src/components/BrianBoard/boardActivities.js';
import {boardStudentPayload} from '../src/components/BrianBoard/boardPresentation.js';
import {
 BOARD_BACKUP_FORMAT,BOARD_BACKUP_MAX_BYTES,duplicateBoardLesson,
 exportPrivateBoardBackup,importPrivateBoardBackup,boardActivityRaw,
 reviseBoardActivity,duplicateBoardActivity,moveBoardActivity,
 hideAllBoardActivities,selectBoardNameWithoutRepeat
} from '../src/components/BrianBoard/boardWorkflow.js';
const lesson=newLesson('teacher-abc');
lesson.title='Global Warming';
lesson.pages[0].objects=[
 {id:'private-ink',kind:'text',text:'Teacher-only secret',studentVisible:false},
 {id:'public-ink',kind:'text',text:'Protect our planet',studentVisible:true}
];
const matching=createBoardActivity({type:'matching',title:'Renewables',
 raw:'solar | renewable\ncoal | fossil'});
const ordering=createBoardActivity({type:'ordering',title:'Sentence',raw:'We | should | recycle'});
const sorting=createBoardActivity({type:'sorting',title:'Energy',raw:'wind | clean\ncoal | dirty'});
lesson.pages[0].activities=[matching,ordering,sorting];
const clone=duplicateBoardLesson(lesson,'teacher-abc');
assert.notEqual(clone.id,lesson.id);
assert.notEqual(clone.pages[0].id,lesson.pages[0].id);
assert.notEqual(clone.pages[0].objects[0].id,lesson.pages[0].objects[0].id);
assert.notEqual(clone.pages[0].activities[0].id,matching.id);
assert.equal(clone.ownerId,'teacher-abc');
assert.equal(clone.pages[0].objects.length,2);
assert.equal(clone.pages[0].activities.length,3);
assert.throws(()=>duplicateBoardLesson(lesson,'another-owner'),/owner mismatch/);

const privateText=exportPrivateBoardBackup(lesson,'teacher-abc');
const payload=JSON.parse(privateText);
assert.equal(payload.format,BOARD_BACKUP_FORMAT);
assert.equal(payload.lesson.pages[0].objects[0].text,'Teacher-only secret');
assert.ok(BOARD_BACKUP_MAX_BYTES>=25*1024*1024);
const restored=importPrivateBoardBackup(privateText,'teacher-abc');
assert.notEqual(restored.id,lesson.id);
assert.equal(restored.ownerId,'teacher-abc');
assert.equal(restored.pages[0].activities[0].items[0].answer,'renewable');
assert.deepEqual(restored.pages[0].objects.map(x=>x.text),['Teacher-only secret','Protect our planet']);
assert.equal(normalizeLesson(restored,'teacher-abc').pages[0].activities.length,3);
assert.throws(()=>importPrivateBoardBackup(privateText,'another-owner'),/owner mismatch/);
assert.throws(()=>importPrivateBoardBackup('not json','teacher-abc'),/unreadable/);
assert.throws(()=>importPrivateBoardBackup('{}','teacher-abc'),/Unsupported/);
assert.throws(()=>importPrivateBoardBackup(JSON.stringify({...payload,format:'untrusted'}),'teacher-abc'),/Unsupported/);
assert.throws(()=>importPrivateBoardBackup(JSON.stringify({...payload,lesson:{...lesson,pages:[]}}),'teacher-abc'),/Unsupported/);
assert.throws(()=>exportPrivateBoardBackup(lesson,'another-owner'),/owner mismatch/);

assert.equal(boardActivityRaw(matching),'solar | renewable\ncoal | fossil');
assert.equal(boardActivityRaw(ordering),'We | should | recycle');
const edited=reviseBoardActivity(matching,{type:'matching',title:'Revised',prompt:'Match now',
 raw:'solar | clean\ncoal | fossil'});
assert.equal(edited.id,matching.id);
assert.equal(edited.studentVisible,true);
assert.equal(edited.createdAt,matching.createdAt);
assert.equal(edited.items[0].answer,'clean');
assert.equal(reviseBoardActivity({...matching,studentVisible:false},{
 type:'matching',title:'Hidden',raw:'a | one\nb | two'
}).studentVisible,false);
const newCopy=duplicateBoardActivity(matching);
assert.notEqual(newCopy.id,matching.id);
assert.equal(newCopy.studentVisible,false,'Copies begin unpublished');
assert.equal(publicBoardActivity(newCopy),null);
assert.deepEqual(moveBoardActivity([matching,ordering,sorting],ordering.id,-1).map(x=>x.id),
 [ordering.id,matching.id,sorting.id]);
assert.deepEqual(moveBoardActivity([matching,ordering],matching.id,-1).map(x=>x.id),
 [matching.id,ordering.id]);
assert.deepEqual(moveBoardActivity([matching,ordering],sorting.id,1).map(x=>x.id),
 [matching.id,ordering.id]);
const hidden=hideAllBoardActivities(lesson.pages[0].activities);
assert.equal(hidden.every(x=>x.studentVisible===false),true);
assert.equal(lesson.pages[0].activities[0].studentVisible,true,'Immutable hide-all must not modify teacher source');
const hiddenLesson={...lesson,pages:[{...lesson.pages[0],activities:hidden}]};
assert.equal(boardStudentPayload(hiddenLesson,matching.id).activity,null,'No hidden activity on TV');
const unseen=exportPrivateBoardBackup(hiddenLesson,'teacher-abc');
assert.equal(importPrivateBoardBackup(unseen,'teacher-abc').pages[0].activities.every(x=>x.studentVisible===false),true);

let state={choice:'',used:[]};
const seen=[];
for(let i=0;i<3;i++){
 state=selectBoardNameWithoutRepeat('An\nBinh\nChi',state.used,0);
 seen.push(state.choice);
}
assert.deepEqual(seen,['An','Binh','Chi']);
assert.equal(state.remaining,0);
assert.equal(selectBoardNameWithoutRepeat('An\nBinh\nChi',state.used,.3).choice,'');
assert.deepEqual(selectBoardNameWithoutRepeat('An\nAn\nBinh',[],.9).total,2);
assert.equal(selectBoardNameWithoutRepeat('',[],0).total,0);
assert.equal(selectBoardNameWithoutRepeat('An\nBinh',[],.99).choice,'Binh');

const board=readFileSync(new URL('../src/components/BrianBoard/BrianBoard.jsx',import.meta.url),'utf8');
const style=readFileSync(new URL('../src/components/BrianBoard/BoardActivities.css',import.meta.url),'utf8');
assert.match(board,/importPrivateBoardBackup/);
assert.match(board,/exportPrivateBoardBackup/);
assert.match(board,/duplicateBoardLesson/);
assert.match(board,/library\.filter\(x=>x\.title/);
assert.match(board,/reviseBoardActivity\(original,input\)/);
assert.match(board,/onClick=\{hideEveryActivity\}/);
assert.match(board,/onClick=\{\(\)=>beginActivityEditing\(x\)\}/);
assert.match(board,/onClick=\{\(\)=>duplicateActivity\(x\.id\)\}/);
assert.match(board,/orderActivity\(x\.id,-1\)/);
assert.match(board,/orderActivity\(x\.id,1\)/);
assert.match(board,/\[3,5,10\]\.map/);
assert.match(board,/selectBoardNameWithoutRepeat/);
assert.match(board,/setRandomUsed/);
assert.match(board,/Reset team scores/);
assert.match(board,/ownerRef\.current/,'Import must check current account identity after file read');
assert.match(board,/activities:\(orig\.activities\|\|\[\]\)\.map/,'Page copies need new activity IDs');
assert.match(board,/activity\.id===id&&!activity\.teacherOnly/,'Teacher-only items cannot be published');
assert.match(board,/if\(dirty\.current\)\{await persist\(docRef\.current\);if\(dirty\.current\)/,
 'Backup import must not discard an unsaved lesson');

assert.match(style,/bbd-activity-actions/);
assert.match(style,/bbd-timer-presets/);
assert.ok(!board.includes('dangerouslySetInnerHTML'));
console.log('PASS Brian Board upgrades: owner-private offline backups, new-copy restores, editing, duplication, reorder, hide-all, no-repeat picker and UI contracts.');
