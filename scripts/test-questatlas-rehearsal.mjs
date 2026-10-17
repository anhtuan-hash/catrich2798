import assert from 'node:assert/strict';
import fs from 'node:fs';
import { demoRecords } from '../src/features/questatlas/questModel.mjs';
import { createRehearsal,joinRehearsal,controlRehearsal,submitRehearsal,
  resetRehearsalTeam,rehearsalBoard,rehearsalReport,rehearsalCsv } from '../src/features/questatlas/localLiveSimulator.mjs';

const fixture=demoRecords();
const quest=fixture.quests[0];
const puzzles=fixture.puzzles;
assert.throws(()=>createRehearsal(quest,puzzles,1),/2 đến 8/);
assert.throws(()=>createRehearsal(quest,puzzles,9),/2 đến 8/);
assert.throws(()=>createRehearsal(quest,[],4),/ít nhất một câu hỏi/);
assert.throws(()=>createRehearsal(quest,[{...puzzles[0],correct_answer:'wrong'}],4),/trùng/);
let r=createRehearsal(quest,puzzles,8);
assert.equal(r.status,'waiting');
assert.equal(r.teams.length,8);
assert.equal(r.stages.length,2);
assert.equal(r.mode,'offline-rehearsal');
assert.throws(()=>controlRehearsal(r,'start'),/tối thiểu hai đội/);
assert.throws(()=>submitRehearsal(r,1,'who'),/chưa nhận/);
const original=r;
r=joinRehearsal(r,1,'Orion');
r=joinRehearsal(r,2,'Galactic');
assert.equal(original.teams[0].joined,false,'state must be immutable');
r=controlRehearsal(r,'start');
assert.equal(r.position,1);
assert.equal(r.status,'active');
assert.throws(()=>controlRehearsal(r,'start'),/không phù hợp/);
assert.throws(()=>submitRehearsal(r,3,'who'),/chưa tham gia/);
r=submitRehearsal(r,1,'WHO');
r=submitRehearsal(r,2,'__QUESTATLAS_WRONG_SIMULATION__');
assert.throws(()=>submitRehearsal(r,1,'who'),/đã trả lời/);
assert.equal(rehearsalBoard(r)[0].score,10);
assert.equal(rehearsalBoard(r)[1].score,0);
assert.deepEqual(rehearsalBoard(r).map(x=>x.no),[1,2]);
r=controlRehearsal(r,'pause');
assert.throws(()=>submitRehearsal(r,2,'who'),/chưa nhận/);
r=controlRehearsal(r,'resume');
r=controlRehearsal(r,'next');
assert.equal(r.position,2);
r=submitRehearsal(r,1,'Surprised');
r=submitRehearsal(r,2,'surprised');
assert.equal(rehearsalBoard(r)[0].score,20);
assert.equal(rehearsalBoard(r)[1].score,10);
r=resetRehearsalTeam(r,1);
assert.equal(r.teams[0].joined,false);
assert.equal(r.teams[0].answers.length,0);
assert.equal(rehearsalBoard(r).length,1);
r=joinRehearsal(r,1,'Orion restored');
assert.equal(r.teams[0].answers.length,0,'reset must remove previous attempts');
assert.equal(rehearsalBoard(r)[0].score,10);
r=controlRehearsal(r,'next');
assert.equal(r.status,'finished');
assert.throws(()=>controlRehearsal(r,'start'),/không phù hợp/);
assert.throws(()=>resetRehearsalTeam(r,1),/đã kết thúc/);

let full=createRehearsal(quest,puzzles,8);
for(let i=1;i<=8;i++)full=joinRehearsal(full,i,'Đội '+i);
full=controlRehearsal(full,'start');
for(let i=1;i<=8;i++)full=submitRehearsal(full,i,puzzles[0].correct_answer);
assert.equal(rehearsalBoard(full).reduce((total,t)=>total+t.score,0),80);
assert.equal(new Set(full.teams.map(t=>t.no)).size,8);
assert.equal(rehearsalBoard(full).every(t=>t.submitted),true);

// Export is explicit, post-rehearsal, private and has no puzzle keys.
const report=rehearsalReport(r);
assert.equal(report.completed,true);
assert.equal(report.totalStages,2);
assert.equal(report.maxScore,20);
assert.equal(report.entries[0].scale10,5);
assert.equal(report.entries[0].answered,2);
const csv=rehearsalCsv(r);
assert.equal(csv.charCodeAt(0),0xFEFF,'CSV must carry Excel-compatible UTF-8 BOM');
assert.match(csv,/"Rank","Team #","Team name","Points","Scale \(10\)","Answered","Correct"/);
assert.ok(!csv.includes(puzzles[0].stem),'CSV must exclude all questions');
assert.ok(!csv.includes(puzzles[1].correct_answer),'CSV must exclude answer keys');
const attack=joinRehearsal(createRehearsal(quest,puzzles,2),1,'  =2+2');
const attackCsv=rehearsalCsv(attack);
assert.ok(attackCsv.includes('"'+"'"+'=2+2"'),'CSV should neutralize formula injection');
assert.ok(!attackCsv.includes('"=2+2"'));
assert.throws(()=>rehearsalReport(null),/không hợp lệ/);
assert.match(fs.readFileSync('src/features/questatlas/ClassroomRehearsal.jsx','utf8'),
  /onClick=\{exportCsv\}/,'teacher must explicitly trigger the CSV export');
// This is a teacher-only in-memory rehearsal, not a network session.
const engine=fs.readFileSync('src/features/questatlas/localLiveSimulator.mjs','utf8');
const ui=fs.readFileSync('src/features/questatlas/ClassroomRehearsal.jsx','utf8');
const teacher=fs.readFileSync('src/features/questatlas/LiveTeacher.jsx','utf8');
for(const source of [engine,ui]){
  assert.doesNotMatch(source,/supabase|\.rpc\s*\(|\bfetch\s*\(|localStorage|indexedDB|WebSocket|import\s+.*ai-sdk/i,
    'rehearsal cannot persist, call cloud or use AI');
}
assert.match(teacher,/<ClassroomRehearsal quests=\{quests\} puzzles=\{puzzles\}/);
assert.match(fs.readFileSync('src/features/questatlas/QuestAtlas.jsx','utf8'),
  /<LiveTeacher quests=\{records\.quests\} puzzles=\{records\.puzzles\}/);
console.log('QuestAtlas 0-cost Classroom Live rehearsal PASS: eight-team flow, idempotency, reset, offline-only isolation.');
