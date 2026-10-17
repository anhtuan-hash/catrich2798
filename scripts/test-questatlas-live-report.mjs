import assert from 'node:assert/strict';
import fs from 'node:fs';
import {liveResultsCsv,liveResultsReport} from '../src/features/questatlas/liveReport.mjs';
const room={id:'private-session-id',status:'finished',join_code:'CODE12345678',
  puzzle_snapshot:Array.from({length:8},(_,i)=>({
    position:i+1,points:10,stem:'PRIVATE PUZZLE',correct_answer:'PRIVATE ANSWER'
  }))};
const teams=[
  {id:'t1',team_no:1,display_name:'=SUM(1,2)'},
  {id:'t2',team_no:2,display_name:'Science Team'},
];
const attempts=[
  ...Array.from({length:7},(_,i)=>({team_id:'t1',puzzle_position:i+1,points:10,is_correct:true})),
  {team_id:'t1',puzzle_position:8,points:0,is_correct:false},
  {team_id:'t2',puzzle_position:1,points:10,is_correct:true},
];
assert.throws(()=>liveResultsReport({...room,status:'active'},teams,attempts),/kết thúc/);
const report=liveResultsReport(room,teams,attempts);
assert.equal(report.maximum,80);
assert.deepEqual(report.entries.map(x=>x.score),[70,10]);
assert.equal(report.entries[0].scale10,8.75);
assert.equal(report.entries[0].answered,8);
assert.equal(report.entries[0].correct,7);
const csv=liveResultsCsv(room,teams,attempts);
assert.equal(csv.charCodeAt(0),0xFEFF);
assert.ok(csv.includes('"8.75"'));
assert.ok(csv.includes('"'+"'"+'=SUM(1,2)"'),'formula injected team name must be neutralized');
for(const secret of ['PRIVATE PUZZLE','PRIVATE ANSWER','CODE12345678','private-session-id','t1','t2']){
  assert.ok(!csv.includes('"'+secret+'"'),'report leaked private session/answer value '+secret);
}
const source=fs.readFileSync('src/features/questatlas/liveReport.mjs','utf8');
assert.doesNotMatch(source,/\bfetch\s*\(|supabase|openai|ai-sdk|anthropic/i);
const teacher=fs.readFileSync('src/features/questatlas/LiveTeacher.jsx','utf8');
assert.match(teacher,/board\.length < 2/,'UI should block start for one team');
assert.match(teacher,/liveResultsCsv\(current,teams,attempts\)/,'teacher exports only completed room data');
const sql=fs.readFileSync('supabase/migrations/20261017093000_questatlas_classroom_live.sql','utf8');
assert.match(sql,/At least two teams must join before starting/);
assert.match(sql,/p_action='finish' and s\.status in \('active','paused'\)/);
console.log('QuestAtlas Live readiness PASS: two-team host gate, safe report, no answer keys, 70/80 -> 8.75.');
