import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 SAMPLE_QUESTIONS,EMPTY_DIAGNOSTIC_META,
 parseDiagnosticQuestions,gradeDiagnostic,scoreDiagnosticRecord,scorePhase,pairedDiagnostic,
 validateDiagnosticConfig,parseBulkDiagnostic,diagnosticReadiness,diagnosticBackup,verifyDiagnosticBackup,diagnosticCsv
} from '../src/features/assessmentStudio/diagnosticCore.js';

const meta={title:'Diagnostic Grammar',className:'12.6',objective:'Gerund and infinitive',teacher:'Teacher',date:'2026-10-09'};
const config=()=>{const {meta:_,...validated}=validateDiagnosticConfig({meta,preRaw:SAMPLE_QUESTIONS,postRaw:'',useSamePost:true});return validated;};
test('parse grammar MCQ with unique answer and teacher-labelled topic',()=>{
 const questions=parseDiagnosticQuestions(SAMPLE_QUESTIONS);
 assert.equal(questions.length,5);
 assert.deepEqual(questions.map(q=>q.answer),['B','C','A','B','C']);
 assert.deepEqual([...new Set(questions.map(q=>q.topic))],['Gerund','To-infinitive','Bare infinitive']);
 assert.throws(()=>parseDiagnosticQuestions('Bad | A | A | C | D | B | Grammar'),/khác nhau/);
 assert.throws(()=>parseDiagnosticQuestions('Missing | A | B | C'),/7 trường/);
 assert.throws(()=>parseDiagnosticQuestions('Bad | A | B | C | D | X | Grammar'),/A, B, C hoặc D/);
 assert.throws(()=>parseDiagnosticQuestions(SAMPLE_QUESTIONS+'\n'+SAMPLE_QUESTIONS.split('\n')[0]),/trùng/);
});
test('objective scoring is deterministic and analytic by topic',()=>{
 const q=config().preQuestions;
 const grade=gradeDiagnostic(q,'B C A B C');
 assert.equal(grade.score,5);
 assert.equal(grade.total,5);
 assert.equal(grade.percent,100);
 assert.equal(grade.topics.Gerund.achieved,2);
 assert.equal(grade.topics['Bare infinitive'].total,1);
 const fail=gradeDiagnostic(q,'AAAAA');
 assert.equal(fail.score,1);
 assert.throws(()=>gradeDiagnostic(q,'ABC'),/đúng 5 đáp án/);
 assert.throws(()=>gradeDiagnostic(q,'ABCDE'),/đúng 5 đáp án/);
});
test('pre-post comparisons only pair matching codes with normalized percentages',()=>{
 const c=config();
 const records=[
 scoreDiagnosticRecord({code:'001',phase:'pre',answers:'AAAAA',config:c}),
 scoreDiagnosticRecord({code:'002',phase:'pre',answers:'BCABC',config:c}),
 scoreDiagnosticRecord({code:'001',phase:'post',answers:'BCABC',config:c}),
 scoreDiagnosticRecord({code:'003',phase:'post',answers:'BCABC',config:c}),
 ];
 const paired=pairedDiagnostic(records);
 assert.equal(paired.count,1);
 assert.equal(paired.preAverage,20);
 assert.equal(paired.postAverage,100);
 assert.equal(paired.delta,80);
 assert.equal(scorePhase(records,'pre').count,2);
 assert.equal(scorePhase([], 'pre').average,null);
});
test('bulk teacher import validates every student before returning and prevents duplicates',()=>{
 const c=config();
 const batch=parseBulkDiagnostic('S001\tNguyễn Văn A\tBCABC\nS002 | Trần Thị B | AAAAA',c,'pre',[],[]);
 assert.equal(batch.newStudents.length,2);
 assert.equal(batch.records[0].score,5);
 assert.equal(batch.records[1].score,1);
 assert.throws(()=>parseBulkDiagnostic('S001 | A | BCABC\ns001 | B | BCABC',c,'pre',[],[]),/đã có kết quả/);
 assert.throws(()=>parseBulkDiagnostic('S001 | A | ABC',c,'pre',[],[]),/Dòng 1/);
 assert.throws(()=>parseBulkDiagnostic('S001 | A | BCABC',c,'pre',[{code:'S001',name:'Other'}],[]),/khác danh sách/);
});
test('post requires explicitly provided new questions unless teacher selects same set',()=>{
 assert.throws(()=>validateDiagnosticConfig({meta,preRaw:SAMPLE_QUESTIONS,postRaw:'',useSamePost:false}),/1–100/);
 assert.equal(config().useSamePost,true);
 const other=validateDiagnosticConfig({meta,preRaw:SAMPLE_QUESTIONS,postRaw:'Question? | A | B | C | D | C | Topic',useSamePost:false});
 assert.equal(other.postQuestions[0].answer,'C');
});
test('readiness never presents the demonstration as official evidence',()=>{
 const c=config();
 const records=[scoreDiagnosticRecord({code:'S001',phase:'pre',answers:'AAAAA',config:c}),scoreDiagnosticRecord({code:'S001',phase:'post',answers:'BCABC',config:c})];
 const adjustment={finding:'Gerunds',action:'Practice',date:'2026-10-09',evidence:'Worksheet file',reflection:'After test result',comparability:'Same skill'};
 const good=diagnosticReadiness({meta,config:c,records,adjustment});
 assert.equal(good.complete,true);
 assert.equal(good.count,6);
 assert.equal(diagnosticReadiness({meta,config:c,records,adjustment,demo:true}).complete,false);
 assert.equal(diagnosticReadiness({meta,config:c,records:[records[0]],adjustment}).complete,false);
});
test('JSON export/import verifies every answer against the teacher answer key',()=>{
 const c=config();
 const state={meta,config:c,roster:[{code:'0001',name:'A'}],records:[scoreDiagnosticRecord({code:'0001',phase:'pre',answers:'BCABC',config:c})],
 adjustment:{finding:'',action:'',date:'',evidence:'',reflection:'',comparability:''},revisions:[],demo:false};
 const valid=verifyDiagnosticBackup(JSON.parse(diagnosticBackup(state)));
 assert.equal(valid.records[0].score,5);
 const tampered=JSON.parse(diagnosticBackup(state));
 tampered.records[0].score=999;
 assert.throws(()=>verifyDiagnosticBackup(tampered),/điểm bị thay đổi/);
 tampered.records[0].score=5;
 tampered.records.push({...tampered.records[0]});
 assert.throws(()=>verifyDiagnosticBackup(tampered),/Bản ghi trùng/);
});
test('CSV is a deterministic local teacher-only export',()=>{
 const c=config();
 const csv=diagnosticCsv([{code:'0001',name:'Student'}],[scoreDiagnosticRecord({code:'0001',phase:'pre',answers:'BCABC',config:c})],true);
 assert.match(csv,/0001/);
 assert.match(csv,/DEMO/);
 assert.match(csv,/100.0/);
});
test('production card links to full DiagnosticScan and no network calls',()=>{
 const page=readFileSync(new URL('../src/pages/AssessmentPreview.jsx',import.meta.url),'utf8');
 const frontend=readFileSync(new URL('../src/features/assessmentStudio/DiagnosticScan.jsx',import.meta.url),'utf8');
 const catalogue=readFileSync(new URL('../public/assessment-studio-preview.html',import.meta.url),'utf8');
 assert.match(page,/DiagnosticScan = lazy/);
 assert.match(page,/diagnosticVisited/);
 assert.match(page,/BRIAN_OPEN_DIAGNOSTIC/);
 assert.match(catalogue,/id="full-diagnostic"/);
 assert.match(frontend,/Khóa đáp án/);
 assert.match(frontend,/Chấm và lưu kết quả/);
 assert.match(frontend,/Sao lưu JSON/);
 assert.doesNotMatch(frontend,/\bfetch\s*\(|\.from\(['"]bes_assessment_/);
 assert.doesNotMatch(frontend,/\blocalStorage\b|\bsessionStorage\b/);
});
