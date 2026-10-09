import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 TWO_TIER_SAMPLE,TWO_TIER_EMPTY_ADJUST,parseTwoTierQuestions,gradeTwoTier,
 validateTwoTierSetup,makeTwoTierRecord,importTwoTierBatch,summarizeTwoTier,
 pairedTwoTier,twoTierReadiness,twoTierCSV,twoTierBackup,restoreTwoTierBackup
} from '../src/features/assessmentStudio/twoTierCore.js';

const meta={title:'Two-Tier Gerund',teacher:'Teacher A',className:'12.6',objective:'Check grammar reasoning',date:'2026-10-09'};
const validated=()=>validateTwoTierSetup({meta,preRaw:TWO_TIER_SAMPLE,postRaw:TWO_TIER_SAMPLE.replace('She enjoys ___ novels.','She enjoys ___ poetry.'),repeat:false});
const config=()=>{const {meta:_,...cfg}=validated();return cfg;};
test('two-tier parser enforces answer keys, rationale keys and uniqueness',()=>{
 const qs=parseTwoTierQuestions(TWO_TIER_SAMPLE);
 assert.equal(qs.length,3);
 assert.deepEqual(qs.map(x=>x.answer),['B','C','C']);
 assert.deepEqual(qs.map(x=>x.reasonAnswer),['B','C','C']);
 assert.throws(()=>parseTwoTierQuestions('Invalid | A | B'),/13 trường/);
 assert.throws(()=>parseTwoTierQuestions(TWO_TIER_SAMPLE+'\n'+TWO_TIER_SAMPLE.split('\n')[0]),/Trùng/);
 assert.throws(()=>parseTwoTierQuestions(TWO_TIER_SAMPLE.replace('reading | to read','reading | reading')),/khác nhau/);
});
test('all four knowledge categories are scored without credit for answer-only guesses',()=>{
 const q=[parseTwoTierQuestions(TWO_TIER_SAMPLE)[0]];
 assert.deepEqual(gradeTwoTier(q,'BB').counts,{understood:1,answerOnly:0,reasonOnly:0,misconception:0});
 assert.deepEqual(gradeTwoTier(q,'BA').counts,{understood:0,answerOnly:1,reasonOnly:0,misconception:0});
 assert.deepEqual(gradeTwoTier(q,'AB').counts,{understood:0,answerOnly:0,reasonOnly:1,misconception:0});
 assert.deepEqual(gradeTwoTier(q,'AA').counts,{understood:0,answerOnly:0,reasonOnly:0,misconception:1});
 assert.equal(gradeTwoTier(q,'BA').score,0);
 assert.equal(gradeTwoTier(q,'BB').percent,100);
 assert.throws(()=>gradeTwoTier(q,'BB CC'),/1 cặp/);
 assert.throws(()=>gradeTwoTier(q,'BE'),/1 cặp/);
});
test('pre and post must be explicitly configured with matching number of items',()=>{
 assert.throws(()=>validateTwoTierSetup({meta,preRaw:TWO_TIER_SAMPLE,postRaw:'',repeat:false}),/1–40/);
 assert.equal(validated().pre.length,validated().post.length);
 assert.equal(validateTwoTierSetup({meta,preRaw:TWO_TIER_SAMPLE,postRaw:'',repeat:true}).repeat,true);
});
test('batch import binds identical student codes, calculates grades and rejects duplicates',()=>{
 const cfg=config();
 const pre=importTwoTierBatch({raw:'A01 | Nguyễn Văn A | BB CC CC\nA02 | Trần Văn B | BA CA AA',config:cfg,phase:'pre'});
 assert.equal(pre.newStudents.length,2);
 assert.equal(pre.newRecords[0].score,3);
 assert.equal(pre.newRecords[1].score,0);
 assert.throws(()=>importTwoTierBatch({raw:'A01 | Different | BB CC CC',config:cfg,phase:'pre',roster:pre.newStudents,records:pre.newRecords}),/Họ tên không khớp/);
 assert.throws(()=>importTwoTierBatch({raw:'A01 | Nguyễn Văn A | BB CC CC',config:cfg,phase:'pre',roster:pre.newStudents,records:pre.newRecords}),/Trùng kết quả/);
 assert.throws(()=>importTwoTierBatch({raw:'NEW | Someone | BB CC CC',config:cfg,phase:'post',roster:pre.newStudents,records:pre.newRecords}),/Chưa có/);
 const post=importTwoTierBatch({raw:'A01 | Nguyễn Văn A | BB CC CC',config:cfg,phase:'post',roster:pre.newStudents,records:pre.newRecords});
 assert.equal(pairedTwoTier([...pre.newRecords,...post.newRecords]).count,1);
 assert.equal(summarizeTwoTier(pre.newRecords,'pre').count,2);
});
test('readiness checks reflect teacher adjustments, paired scores and DEMO flag',()=>{
 const cfg=config();
 const records=[makeTwoTierRecord({code:'A01',config:cfg,phase:'pre',answers:'BA CA AA'}),
   makeTwoTierRecord({code:'A01',config:cfg,phase:'post',answers:'BB CC CC'})];
 const adjustment={finding:'Guessing without rules',action:'Remedial grammar',implementedDate:'2026-10-09',evidence:'Lesson plan 4',comparability:'Equal objectives',reflection:'Compared matched students'};
 assert.equal(twoTierReadiness({meta,config:cfg,records,adjustment}).complete,true);
 assert.equal(twoTierReadiness({meta,config:cfg,records,adjustment,demo:true}).complete,false);
 assert.equal(twoTierReadiness({meta,config:cfg,records:records.slice(0,1),adjustment}).complete,false);
 assert.equal(twoTierReadiness({meta,config:cfg,records,adjustment:TWO_TIER_EMPTY_ADJUST}).complete,false);
});
test('JSON backup verifies answers against keys and refuses altered scores',()=>{
 const cfg=config();
 const state={meta,config:cfg,roster:[{code:'A01',name:'Student'}],records:[makeTwoTierRecord({code:'A01',config:cfg,phase:'pre',answers:'BB CC CC'})],
  adjustment:TWO_TIER_EMPTY_ADJUST,demo:false};
 const parsed=JSON.parse(twoTierBackup(state));
 assert.equal(restoreTwoTierBackup(parsed).records[0].score,3);
 parsed.records[0].score=999;
 assert.throws(()=>restoreTwoTierBackup(parsed),/không khớp/);
 parsed.records[0].score=3;parsed.records.push(parsed.records[0]);
 assert.throws(()=>restoreTwoTierBackup(parsed),/trùng/);
});
test('csv exports sanitized values and demo flag',()=>{
 const cfg=config();
 const csv=twoTierCSV([{code:'S1',name:'=HYPERLINK("x")'}],[makeTwoTierRecord({code:'S1',config:cfg,phase:'pre',answers:'BB CC CC'})],true);
 assert.match(csv,/DEMO/);
 assert.match(csv,/'=HYPERLINK/);
 assert.match(csv,/100\.0/);
});
test('native BRIAN route exposes lazy two-tier tool without AI or persistent storage',()=>{
 const page=readFileSync(new URL('../src/pages/AssessmentPreview.jsx',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/features/assessmentStudio/TwoTierStudio.jsx',import.meta.url),'utf8');
 const core=readFileSync(new URL('../src/features/assessmentStudio/twoTierCore.js',import.meta.url),'utf8');
 assert.match(page,/TwoTierStudio = lazy/);
 assert.match(page,/openTwoTier/);
 assert.match(page,/twoTierVisited/);
 assert.match(ui,/Hồ sơ PDF/);
 assert.match(ui,/Sao lưu JSON/);
 assert.doesNotMatch(core+ui,/\bfetch\s*\(|\blocalStorage\b|\bsessionStorage\b|supabase|gemini|openrouter/i);
});
