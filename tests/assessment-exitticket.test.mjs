import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 EXIT_SAMPLE,EXIT_META,EXIT_ADJUSTMENT,
 parseExitQuestions,makeExitConfig,gradeExit,groupExit,pairExit,bulkExit,
 exitReadiness,exitCsv,exitBackup,loadExitBackup
} from '../src/features/assessmentStudio/exitTicketCore.js';
const meta={title:'Lesson Exit',className:'12.6',lesson:'Gerund and Infinitive',teacher:'Teacher',date:'2026-10-09'};
const makeCfg=()=>{const {meta:_,...c}=makeExitConfig({meta,initialRaw:EXIT_SAMPLE,followupRaw:'',repeatQuestions:true});return c;};
const rec=(code,stage,answers='BCD',confidence=3)=>gradeExit({config:makeCfg(),code,stage,answers,confidence,reflection:'I need more practice.'});
test('requires precisely two or three objective questions with a labelled topic',()=>{
 assert.equal(parseExitQuestions(EXIT_SAMPLE).length,3);
 assert.equal(parseExitQuestions(EXIT_SAMPLE.split('\n').slice(0,2).join('\n')).length,2);
 assert.throws(()=>parseExitQuestions(EXIT_SAMPLE.split('\n')[0]),/2 hoặc 3/);
 assert.throws(()=>parseExitQuestions(EXIT_SAMPLE+'\n'+EXIT_SAMPLE.split('\n')[0]),/trùng|2 hoặc 3/);
 assert.throws(()=>parseExitQuestions('Question? | A | A | C | D | A | Gerund\nOther? | 1 | 2 | 3 | 4 | B | Grammar'),/khác nhau/);
});
test('teacher checks correct answers and tracks self-confidence separately',()=>{
 const c=makeCfg();
 const good=gradeExit({config:c,code:'001',stage:'initial',answers:'BCD',confidence:2,reflection:'Need practice'});
 assert.equal(good.score,3);
 assert.equal(good.percent,100);
 assert.equal(good.confidence,2);
 assert.equal(good.topics.Gerund.achieved,1);
 const incorrect=gradeExit({config:c,code:'002',stage:'initial',answers:'AAA',confidence:4});
 assert.equal(incorrect.score,0);
 assert.equal(incorrect.percent,0);
 assert.throws(()=>gradeExit({config:c,code:'001',stage:'initial',answers:'BCD',confidence:0}),/1–4/);
 assert.throws(()=>gradeExit({config:c,code:'001',stage:'initial',answers:'AB',confidence:3}),/đúng 3 đáp án/);
});
test('record grouping reports actual response counts, topics and self-rating',()=>{
 const data=[rec('S001','initial','BCD',4),rec('S002','initial','AAA',2),rec('S001','followup','BCD',3)];
 const before=groupExit(data,'initial'),after=groupExit(data,'followup');
 assert.equal(before.count,2);
 assert.equal(before.average,50);
 assert.equal(before.confidence,3);
 assert.equal(before.topics.Gerund.total,2);
 assert.equal(after.count,1);
 const paired=pairExit(data);
 assert.equal(paired.count,1);
 assert.equal(paired.delta,0);
 assert.equal(groupExit([],'initial').average,null);
});
test('bulk import allows Excel tab-separated responses, prevents duplicates',()=>{
 const c=makeCfg();
 const batch=bulkExit('S001\tNguyễn Văn A\tBCD\t3\tMore practice\nS002 | Trần Thị B | AAA | 2',c,'initial',[],[]);
 assert.equal(batch.newStudents.length,2);
 assert.equal(batch.newRecords[0].score,3);
 assert.equal(batch.newRecords[1].confidence,2);
 assert.throws(()=>bulkExit('s001 | A | BCD | 3\nS001 | B | BCD | 3',c,'initial',[],[]),/Dòng 2/);
 assert.throws(()=>bulkExit('S001 | A | BC | 3',c,'initial',[],[]),/Dòng 1/);
 assert.throws(()=>bulkExit('S003 | C | BCD | 3',c,'followup',[],[]),/Chưa có Exit Ticket ban đầu/);
});
test('followup questionnaire can be distinct and must be validated',()=>{
 assert.throws(()=>makeExitConfig({meta,initialRaw:EXIT_SAMPLE,followupRaw:'',repeatQuestions:false}),/2 hoặc 3|1–100/);
 const two=EXIT_SAMPLE.split('\n').slice(0,2).join('\n');
 const c=makeExitConfig({meta,initialRaw:EXIT_SAMPLE,followupRaw:two,repeatQuestions:false});
 assert.equal(c.questions.length,3);
 assert.equal(c.followup.length,2);
 assert.equal(gradeExit({config:c,code:'S001',stage:'followup',answers:'BC',confidence:4}).score,2);
});
test('readiness distinguishes real intervention from planned or demo work',()=>{
 const data={meta,config:makeCfg(),records:[rec('S001','initial'),rec('S001','followup')]};
 const planned=exitReadiness({...data,adjustment:{...EXIT_ADJUSTMENT},demo:false});
 assert.equal(planned.complete,false);
 const adjustment={weakness:'Some problems',action:'Remedial lesson',implementedDate:'2026-10-09',evidence:'Worksheet',followupReflection:'Checked',comparability:'Same objectives'};
 const good=exitReadiness({...data,adjustment,demo:false});
 assert.equal(good.complete,true);
 assert.equal(good.count,6);
 assert.equal(exitReadiness({...data,adjustment,demo:true}).complete,false);
});
test('CSV prevents formulas and backup detects forged grades',()=>{
 const cfg=makeCfg();
 const records=[rec('S001','initial')],roster=[{code:'S001',name:'=HYPERLINK("x")'}];
 const csv=exitCsv(roster,records,true);
 assert.match(csv,/DEMO/);
 assert.match(csv,/'=HYPERLINK/);
 const state={meta,config:cfg,roster:[{code:'S001',name:'Student'}],records,
  adjustment:EXIT_ADJUSTMENT,revisions:[],demo:false,draft:{initialRaw:EXIT_SAMPLE,followupRaw:'',repeatQuestions:true}};
 const backup=JSON.parse(exitBackup(state));
 assert.equal(loadExitBackup(backup).records[0].score,3);
 backup.records[0].score=99;
 assert.throws(()=>loadExitBackup(backup),/điểm đã bị chỉnh sửa/);
 backup.records[0].score=3;backup.records.push({...backup.records[0]});
 assert.throws(()=>loadExitBackup(backup),/Bản ghi học sinh trùng/);
});
test('draft-only backups are recoverable and no remote student writes exist',()=>{
 const state={meta:EXIT_META,config:null,roster:[],records:[],adjustment:EXIT_ADJUSTMENT,revisions:[],demo:false,
  draft:{initialRaw:'Unfinished question',followupRaw:'',repeatQuestions:false}};
 assert.equal(loadExitBackup(JSON.parse(exitBackup(state))).draft.initialRaw,'Unfinished question');
 const ui=readFileSync(new URL('../src/features/assessmentStudio/ExitTicket.jsx',import.meta.url),'utf8');
 const route=readFileSync(new URL('../src/pages/AssessmentPreview.jsx',import.meta.url),'utf8');
 const preview=readFileSync(new URL('../public/assessment-studio-preview.html',import.meta.url),'utf8');
 assert.match(ui,/Chấm và lưu/);
 assert.match(ui,/Sao lưu JSON/);
 assert.match(route,/ExitTicket = lazy/);
 assert.match(route,/BRIAN_OPEN_EXIT/);
 assert.match(preview,/id="full-exit"/);
 assert.doesNotMatch(ui,/\bfetch\s*\(|\blocalStorage\b|\bsessionStorage\b|supabase\.from/);
});
