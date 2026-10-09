import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 SPEAKING_CRITERIA,SPEAKING_ANCHORS,EMPTY_MARKS,
 normalizeCode,normalizeStudent,parseRoster,scoreMarks,buildRecord,pairedComparison,stats,
 checklist,csvCell,makeCsv,createBackup,verifyBackup,recordKey
} from '../src/features/assessmentStudio/speakingCore.js';
const fixtureMarks={pronunciation:3,fluency:2,vocabulary:4,grammar:3,content:4};
const record=(code,phase,values=[3,2,3,3,3])=>buildRecord({
 code,phase,marks:Object.fromEntries(SPEAKING_CRITERIA.map((c,i)=>[c.id,values[i]])),
 comment:'Teacher entered',assessor:'Teacher A',
 at:'2026-10-09T08:00:00.000Z'
});

test('five scored speaking criteria have meaningful five-level published anchors',()=>{
 assert.equal(SPEAKING_CRITERIA.length,5);
 for(const criterion of SPEAKING_CRITERIA){
   assert.equal(SPEAKING_ANCHORS[criterion.id]?.length,5);
   assert.ok(SPEAKING_ANCHORS[criterion.id].every(s=>s.length>=20));
 }
});
test('human rubric scoring requires five explicitly selected marks',()=>{
 assert.deepEqual(scoreMarks(fixtureMarks),{marks:fixtureMarks,score:16,maxScore:20,percentage:80});
 assert.throws(()=>scoreMarks(EMPTY_MARKS),/Cần chọn đủ/);
 assert.throws(()=>scoreMarks({...fixtureMarks,fluency:5}),/0–4/);
 assert.throws(()=>scoreMarks({...fixtureMarks,fluency:2.5}),/0–4/);
 assert.equal(scoreMarks(Object.fromEntries(SPEAKING_CRITERIA.map(c=>[c.id,0]))).score,0);
});
test('teacher roster import preserves codes with leading zeros and prevents duplicates',()=>{
 assert.equal(normalizeCode(' 000142 '),'000142');
 assert.equal(normalizeStudent({code:' s_001 ',name:'  Student  '}).name,'Student');
 assert.deepEqual(parseRoster('00001 | Student A\n00002\tStudent B').map(x=>x.code),['00001','00002']);
 assert.throws(()=>parseRoster('s001 | A\nS001 | B'),/trùng/);
 assert.throws(()=>parseRoster('S001 | B',[{code:'S001',name:'A'}]),/trùng/);
 assert.throws(()=>parseRoster('Invalid row'),/Dòng 1/);
 assert.throws(()=>normalizeCode('A 12'),/Mã học sinh/);
});
test('only same student code pairs are compared before and after',()=>{
 const records=[
   record('S001','pre',[2,2,2,2,2]),
   record('S002','pre',[2,2,3,2,3]),
   record('S001','post',[3,3,3,3,3]),
   record('S003','post',[4,4,4,4,4])
 ];
 const result=pairedComparison(records);
 assert.equal(result.count,1);
 assert.equal(result.preAverage,10);
 assert.equal(result.postAverage,15);
 assert.equal(result.delta,5);
 assert.equal(stats(records,'pre').count,2);
 assert.equal(stats([],'post').average,null);
});
test('checklist never treats demo data as official completion',()=>{
 const meta={className:'12.6',objective:'Fluency',task:'Short talk'};
 const intervention={finding:'',action:'Speaking practice',date:'2026-10-09',evidence:'Worksheet 1',reflection:'Checked post results'};
 const records=[record('S001','pre'),record('S001','post')];
 const state={meta,roster:[{code:'S001',name:'Demo'}],records,intervention};
 assert.equal(checklist({...state,demo:false}).complete,true);
 assert.equal(checklist({...state,demo:true}).complete,false);
 assert.equal(checklist({...state,records:[record('S001','pre')],demo:false}).complete,false);
});
test('CSV guards spreadsheet formula injection; exports student code and scores correctly',()=>{
 assert.equal(csvCell('=HYPERLINK("bad")'),'"\'=HYPERLINK(""bad"")"');
 assert.match(makeCsv([{code:'S001',name:'Student A'}],[record('S001','pre')]),/S001/);
 assert.match(makeCsv([{code:'S001',name:'Demo'}],[record('S001','pre')],true),/DEMO - KHÔNG PHẢI DỮ LIỆU THẬT/);
});
test('verified JSON backup round-trip retains scores, pairing and revision history',()=>{
 const state={meta:{title:'Oral Test',className:'12.6',objective:'Speaking',task:'Presentation',teacher:'T',date:'2026-10-09'},
 roster:[{code:'S001',name:'Học sinh 1'}],
 records:[record('S001','pre'),record('S001','post')],
 intervention:{finding:'Fluency',action:'Practice',date:'2026-10-09',evidence:'Sheet',reflection:'Reviewed'},
 revisions:[{code:'S001',phase:'pre',reason:'Correction',before:10,after:12,at:'2026-10-09'}],demo:false};
 const restored=verifyBackup(JSON.parse(createBackup(state)));
 assert.equal(restored.records.length,2);
 assert.equal(restored.records[0].score,14);
 assert.equal(restored.revisions[0].reason,'Correction');
 assert.equal(pairedComparison(restored.records).count,1);
});
test('import rejects altered grades, duplicate records and unknown student codes',()=>{
 const state={meta:{},roster:[{code:'S001',name:'Student'}],records:[record('S001','pre')],
 intervention:{},revisions:[],demo:false};
 const parsed=JSON.parse(createBackup(state));
 parsed.records[0].score=999;
 assert.throws(()=>verifyBackup(parsed),/khác điểm tính/);
 parsed.records[0].score=14;
 parsed.records.push({...parsed.records[0]});
 assert.throws(()=>verifyBackup(parsed),/kết quả trùng/);
 parsed.records[1].code='S002';
 assert.throws(()=>verifyBackup(parsed),/không tồn tại/);
});
test('production BRIAN card has accessible SpeakScale full workflow and no AI/network call',()=>{
 const page=readFileSync(new URL('../src/pages/AssessmentPreview.jsx',import.meta.url),'utf8');
 const form=readFileSync(new URL('../src/features/assessmentStudio/SpeakScaleStudio.jsx',import.meta.url),'utf8');
 const preview=readFileSync(new URL('../public/assessment-studio-preview.html',import.meta.url),'utf8');
 assert.match(page,/SpeakScaleStudio/);
 assert.match(page,/speakingVisited/);
 assert.match(page,/ref=\{frameRef\}/);
 assert.match(preview,/id="full-speaking"/);
 assert.match(preview,/BRIAN_OPEN_SPEAKSCALE/);
 assert.match(form,/Xuất CSV/);
 assert.match(form,/Sao lưu JSON/);
 assert.match(form,/In hồ sơ \/ PDF/);
 assert.match(form,/Lý do điều chỉnh điểm/);
 assert.doesNotMatch(form,/\bfetch\s*\(|\.from\(['"]bes_assessment_/);
 assert.doesNotMatch(form,/\blocalStorage\b|\bsessionStorage\b/);
});
