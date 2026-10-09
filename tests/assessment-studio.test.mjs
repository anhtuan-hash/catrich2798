import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULES, parseQuestions, gradeObjective, gradeSpeaking, gradeManual, gradeReading, gradeRubric, gradeSelfRatings, parseManualPrompts, parseReadingQuestions, safeHttpUrl, summarizeResults, comparePairedOutcomes, csvEscape } from '../src/features/assessmentStudio/assessmentMath.js';

const quiz = [
  'She enjoys ___ books. | read | reading | to read | reads | B | Gerund',
  'He decided ___ abroad. | study | studying | to study | studied | C | Infinitive',
].join('\n');

test('catalog exposes 12 teacher-operated workflows', () => {
  assert.equal(MODULES.length, 12);
  assert.equal(MODULES.filter(x => x.status === 'ready').length,12);
});

test('question import validates correct column count and answer key', () => {
  const questions = parseQuestions(quiz);
  assert.equal(questions.length, 2);
  assert.equal(questions[1].correct,'C');
  assert.throws(() => parseQuestions('Missing fields | A | B'), /Dòng 1/);
  assert.throws(() => parseQuestions('Question | A | B | C | D | E | Topic'), /Dòng 1/);
});

test('objective scoring returns the correct score and per-topic breakdown', () => {
  const result = gradeObjective(parseQuestions(quiz),'BA');
  assert.equal(result.score,1);
  assert.equal(result.maxScore,2);
  assert.deepEqual(result.topics.Gerund,{achieved:1,total:1});
  assert.deepEqual(result.topics.Infinitive,{achieved:0,total:1});
  assert.throws(()=>gradeObjective(parseQuestions(quiz),'B'),/chính xác 2/);
});

test('speaking rubric rejects out-of-range and fractional values', () => {
  assert.equal(gradeSpeaking({Pronunciation:3,Fluency:2,Vocabulary:4,Grammar:3,Content:4}).score,16);
  assert.throws(()=>gradeSpeaking({Pronunciation:5,Fluency:2,Vocabulary:4,Grammar:3,Content:4}),/0 đến 4/);
  assert.throws(()=>gradeSpeaking({Pronunciation:1.5,Fluency:2,Vocabulary:4,Grammar:3,Content:4}),/0 đến 4/);
});

test('analytics uses actual saved responses only', () => {
  const summary = summarizeResults([
    {score:1,max_score:2,breakdown:{topics:{Gerund:{achieved:1,total:1}}}},
    {score:2,max_score:2,breakdown:{topics:{Gerund:{achieved:1,total:1}}}},
  ]);
  assert.equal(summary.count,2);
  assert.equal(summary.average,75);
  assert.deepEqual(summary.topics.Gerund,{achieved:2,total:2});
  assert.equal(summarizeResults([]).average,0);
});

test('CSV escaping prevents spreadsheet formula injection', () => {
  assert.equal(csvEscape('=HYPERLINK("test")'),'"\'=HYPERLINK(""test"")"');
  assert.equal(csvEscape('An Tuấn'),'"An Tuấn"');
});

test('pre/post comparison only pairs matching student codes', () => {
  const before = [
    {student_code:'A01',score:6,max_score:10},
    {student_code:'A02',score:8,max_score:10},
    {student_code:'',score:2,max_score:10},
  ];
  const after = [
    {student_code:'A01',score:8,max_score:10},
    {student_code:'A02',score:9,max_score:10},
    {student_code:'A03',score:10,max_score:10},
  ];
  const comparison = comparePairedOutcomes(before,after);
  assert.equal(comparison.pairs,2);
  assert.equal(comparison.beforeAverage,70);
  assert.equal(comparison.afterAverage,85);
  assert.equal(comparison.change,15);
  assert.equal(comparePairedOutcomes(before,[]).pairs,0);
});

import { buildAssessmentConfig, scoreAssessmentSubmission, startingDraft } from '../src/features/assessmentStudio/assessmentWorkflow.js';

test('manual correction requires teacher judgments and preserves responses',()=>{
  const questions=parseManualPrompts('Rewrite in the past. | She went home. | Past Simple');
  const result=gradeManual(questions,['She go home.'],[false]);
  assert.equal(result.score,0);
  assert.equal(result.detail[0].studentResponse,'She go home.');
  const scoring=scoreAssessmentSubmission({kind:'rewrite',config:{questions}}, {manualResponses:['She went home.'],manualAccepted:[true]});
  assert.equal(scoring.score,1);
  assert.equal(scoring.breakdown.assessmentType,'teacher_marked');
  assert.throws(()=>parseManualPrompts('Only prompt'),/Dòng 1/);
});

test('reading evidence requires both correct option and correct paragraph',()=>{
  const draft={passage:'First paragraph.\n\nSecond paragraph.', questions:'Where? | A | B | C | D | B | Scanning | P2'};
  const config=buildAssessmentConfig('reading',draft);
  assert.equal(config.paragraphs.length,2);
  const grade=gradeReading(config.questions,'B','P1');
  assert.equal(grade.score,1);
  assert.equal(grade.maxScore,2);
  assert.equal(grade.detail[0].evidenceOk,false);
  assert.throws(()=>buildAssessmentConfig('reading',{...draft,questions:draft.questions.replace('P2','P4')}),/P1–P2/);
});

test('human rubric and self-report are distinct and validated',()=>{
  const writing=scoreAssessmentSubmission({kind:'writing',config:{}},{
    studentText:'I think that public transport is important.',marks:{'Task Achievement':3,Organization:3,Vocabulary:2,Grammar:4}});
  assert.equal(writing.score,12);
  assert.equal(writing.breakdown.studentText.length>0,true);
  assert.throws(()=>scoreAssessmentSubmission({kind:'writing',config:{}},{marks:{}}),/nội dung bài viết/);
  const peer=scoreAssessmentSubmission({kind:'peer',config:{}},{assessor:'Học sinh 01',marks:{Preparation:2,Participation:2,Communication:2,Responsibility:2}});
  assert.equal(peer.score,8);
  assert.equal(peer.breakdown.assessor,'Học sinh 01');
  assert.throws(()=>scoreAssessmentSubmission({kind:'peer',config:{}},{}),/người đánh giá/);
  assert.throws(()=>scoreAssessmentSubmission({kind:'peer',config:{}},{assessor:'HS 01'}),/0–4/);
  const self=scoreAssessmentSubmission({kind:'self',config:{statements:['I can summarise texts.','I can speak.']}},{selfRatings:[3,4]});
  assert.equal(self.score,7);
  assert.equal(self.breakdown.assessmentType,'self_report');
  assert.throws(()=>gradeSelfRatings(['I can read.'],[0]),/1 đến 4/);
  assert.throws(()=>gradeRubric('project',{Content:9,'Language Use':2,Delivery:2,Collaboration:2}),/0–4/);
});

test('12 kinds have valid deterministic configuration and appropriate constraints',()=>{
  const initial=startingDraft();
  assert.equal(initial.kind,'diagnostic');
  const kinds=MODULES.map(m=>m.id);
  assert.equal(new Set(kinds).size,12);
  for(const kind of kinds){
    const draft={...initial,kind,questions:quiz,prompts:'Rewrite. | Answer. | Grammar',passage:'Paragraph 1.\n\nParagraph 2.',
      audioUrl:'https://example.org/audio.mp3'};
    if(kind==='reading')draft.questions='What? | A | B | C | D | B | Scanning | P1';
    const config=buildAssessmentConfig(kind,draft);
    assert.ok(config && typeof config==='object',kind);
  }
  assert.equal(safeHttpUrl('https://example.org/a.mp3'),'https://example.org/a.mp3');
  assert.throws(()=>safeHttpUrl('javascript:alert(1)'),/http/);
  assert.throws(()=>buildAssessmentConfig('exit',{questions:quiz+'\n'+quiz}),/tối đa 3/);
});

import { buildEvidenceHtml } from '../src/features/assessmentStudio/evidenceReport.js';

test('evidence report escapes stored content and masks student names by default',()=>{
  const config=buildAssessmentConfig('diagnostic',{questions:quiz});
  const report=buildEvidenceHtml({
    assessment:{kind:'diagnostic',title:'Test <script>alert(1)</script>',class_label:'12.6',objective:'Grammar',config},
    results:[{student_name:'Nguyen Secret Name',score:1,max_score:2,breakdown:{topics:{Gerund:{achieved:1,total:1}}}}],
    adjustments:[],preparedAt:new Date('2026-10-09T00:00:00Z')
  });
  assert.ok(report.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!report.includes('Nguyen Secret Name'));
  assert.ok(report.includes('Đánh giá lại và nhận xét'));
  assert.ok(report.includes('Điều chỉnh hoạt động dạy học'));
});

test('rubrics and teacher judgments require explicit human input',()=>{
  assert.throws(()=>scoreAssessmentSubmission({kind:'speaking',config:{}},{}),/0–4/);
  assert.throws(()=>scoreAssessmentSubmission({kind:'self',config:{statements:['I can read.']}},{}),/1 đến 4/);
  assert.throws(()=>scoreAssessmentSubmission({kind:'error',config:{questions:parseManualPrompts('Spot the error. | had | Grammar')}},{}),/Đạt\/Chưa đạt/);
  assert.throws(()=>buildAssessmentConfig('listening',{questions:quiz}),/đường dẫn audio/);
});

import { prepareBulkRows } from '../src/features/assessmentStudio/bulkImport.js';

test('bulk import scores only validated rows and rejects duplicates or bad answers',()=>{
  const assessment={kind:'diagnostic',config:{questions:parseQuestions(quiz)}};
  const rows=prepareBulkRows(assessment,'S001\tNguyễn Văn A\tBC\nS002 | Trần Thị B | BA');
  assert.equal(rows.length,2);
  assert.equal(rows[0].score,2);
  assert.equal(rows[1].score,1);
  assert.deepEqual(rows.map(x=>x.student_code),['S001','S002']);
  assert.throws(()=>prepareBulkRows(assessment,'S001 | A | BC\nS001 | B | BB'),/trùng/);
  assert.throws(()=>prepareBulkRows(assessment,'S003 | C | A'),/Dòng 1/);
});

test('bulk import reading also validates evidence per student',()=>{
  const assessment={kind:'reading',config:buildAssessmentConfig('reading',{
    passage:'First paragraph.\n\nSecond paragraph.',
    questions:'Where? | A | B | C | D | B | Scanning | P2'
  })};
  const rows=prepareBulkRows(assessment,'S001 | Nguyễn Văn A | B | P2');
  assert.equal(rows[0].score,2);
  assert.throws(()=>prepareBulkRows(assessment,'S001 | Nguyễn Văn A | B'),/4 cột/);
});

import { normalizeStudentCode, ensureNewStudentCodes, assertScoredResult } from '../src/features/assessmentStudio/recordIntegrity.js';
import { buildBlankStudentHandout } from '../src/features/assessmentStudio/studentHandout.js';
import { readFileSync } from 'node:fs';

test('student codes are normalized and duplicates are rejected',()=>{
  assert.equal(normalizeStudentCode(' 000145 '),'000145');
  assert.equal(normalizeStudentCode(' s-001 '),'S-001');
  assert.deepEqual(ensureNewStudentCodes(['a001','a002'],[{student_code:'A003'}]),['A001','A002']);
  assert.throws(()=>normalizeStudentCode('  '),/bắt buộc/);
  assert.throws(()=>normalizeStudentCode('A 01'),/bắt buộc/);
  assert.throws(()=>ensureNewStudentCodes(['s001','S001']),/Trùng/);
  assert.throws(()=>ensureNewStudentCodes(['s001'],[{student_code:'S001'}]),/đã có kết quả/);
  assertScoredResult({score:6,max_score:10});
  assert.throws(()=>assertScoredResult({score:6,maxScore:10}),/không hợp lệ/);
});

test('import normalizes lower-case codes and preserves leading zeros',()=>{
  const assessment={kind:'diagnostic',config:{questions:parseQuestions(quiz)}};
  assert.equal(prepareBulkRows(assessment,' 000123 | Student | BC')[0].student_code,'000123');
  assert.equal(prepareBulkRows(assessment,' s001 | Student | BC')[0].student_code,'S001');
});

test('printable handouts never reveal scoring keys or sample answers',()=>{
  const quizConfig=buildAssessmentConfig('diagnostic',{questions:'Choose. | Alpha | Beta | Gamma | Delta | C | Grammar'});
  const quizHtml=buildBlankStudentHandout({kind:'diagnostic',title:'Test',config:quizConfig});
  assert.ok(quizHtml.includes('Alpha'));
  assert.ok(!quizHtml.includes('correctAnswer'));
  assert.ok(!quizHtml.includes('Gamma | C'));
  assert.ok(!quizHtml.includes('Đáp án đúng'));
  const manualConfig=buildAssessmentConfig('rewrite',{prompts:'Rewrite sentence. | TOPSECRETANSWER | Word order'});
  const manualHtml=buildBlankStudentHandout({kind:'rewrite',title:'Rewrite',config:manualConfig});
  assert.ok(manualHtml.includes('Rewrite sentence.'));
  assert.ok(!manualHtml.includes('TOPSECRETANSWER'));
  const readingConfig=buildAssessmentConfig('reading',{
    passage:'First paragraph.\n\nSecond paragraph.',
    questions:'Question? | X | Y | Z | Q | C | Evidence | P2'
  });
  const readingHtml=buildBlankStudentHandout({kind:'reading',title:'Reading',config:readingConfig});
  assert.ok(readingHtml.includes('First paragraph.'));
  assert.ok(readingHtml.includes('Vị trí dẫn chứng em chọn'));
  assert.ok(!readingHtml.includes('correctEvidence'));
  const rubric=buildBlankStudentHandout({kind:'speaking',title:'Speaking',config:{}});
  assert.ok(rubric.includes('Pronunciation'));
  const script=buildBlankStudentHandout({kind:'exit',title:'<script>alert(7)</script>',config:quizConfig});
  assert.ok(script.includes('&lt;script&gt;'));
});

test('release requires a server unique index and read/insert-only owner policies',()=>{
  const migration=readFileSync(new URL('../supabase/brian_assessment_studio_integrity.sql',import.meta.url),'utf8');
  assert.match(migration,/create unique index if not exists bes_assessment_results_unique_student_per_test/i);
  assert.match(migration,/revoke update, delete on public\.bes_assessment_results from authenticated/i);
  assert.match(migration,/for insert to authenticated/i);
  assert.match(migration,/for select to authenticated/i);
  const ui=readFileSync(new URL('../src/pages/AssessmentStudio.jsx',import.meta.url),'utf8');
  assert.match(ui,/max_score: grade\.max_score/);
  assert.match(ui,/ensureNewStudentCodes/);
});

import { evidenceReadiness } from '../src/features/assessmentStudio/evidenceReadiness.js';

test('evidence readiness does not treat a planned adjustment as completed',()=>{
  const assessment={class_label:'12.6',objective:'Comparisons'};
  const rows=[{score:4,max_score:5}];
  const planned=[{status:'planned',action_taken:'Give remedial practice',implementation_date:null}];
  const first=evidenceReadiness(assessment,rows,planned,{pairs:0});
  assert.equal(first.completed,false);
  assert.equal(first.checks.find(c=>c.id==='results').ok,true);
  assert.equal(first.checks.find(c=>c.id==='action').ok,false);
  const completed=evidenceReadiness(assessment,rows,[{
    status:'reviewed',action_taken:'Practice activity',implementation_date:'2026-10-09',
    evidence_note:'Worksheets on file',followup_assessment_id:'a000',
    followup_result:'Observed improvement in the paired assessment'
  }],{pairs:5});
  assert.equal(completed.completed,true);
  assert.equal(completed.count,5);
});

test('report can include readiness states without implying official points',()=>{
  const config=buildAssessmentConfig('diagnostic',{questions:quiz});
  const readiness=evidenceReadiness({class_label:'12.6',objective:'Comparisons'},[],[],{pairs:0});
  const html=buildEvidenceHtml({
    assessment:{kind:'diagnostic',title:'Demo',class_label:'12.6',objective:'Comparisons',config},
    readiness,preparedAt:new Date('2026-10-09T00:00:00Z')
  });
  assert.ok(html.includes('Tình trạng hoàn thiện hồ sơ'));
  assert.ok(html.includes('Không thay thế kết luận của hội đồng thi đua'));
});

test('result migration guards both duplicate codes and any silent edits',()=>{
  const sql=readFileSync(new URL('../supabase/brian_assessment_studio_integrity.sql',import.meta.url),'utf8');
  assert.ok(sql.includes('having count(*) > 1'));
  for(const table of ['bes_assessments','bes_assessment_results','bes_assessment_adjustments']) {
    assert.ok(sql.includes('revoke update, delete on public.'+table+' from authenticated;'));
  }
});

import { rubricDescription, LEVEL_NAMES } from '../src/features/assessmentStudio/rubricDescriptors.js';

test('Speaking has five published proficiency anchors per criterion',()=>{
  assert.equal(LEVEL_NAMES.length,5);
  for(const criterion of ['Pronunciation','Fluency','Vocabulary','Grammar','Content']){
    const descriptors=[0,1,2,3,4].map(n=>rubricDescription('speaking',criterion,n));
    assert.equal(new Set(descriptors).size,5);
    assert.ok(descriptors.every(x=>x.length>=20));
  }
  assert.ok(rubricDescription('writing','Organization',3).length>10);
  assert.throws(()=>rubricDescription('speaking','Fluency',5),/0 đến 4/);
});

test('evidence PDF includes explicit rubric anchors for speaking',()=>{
  const html=buildEvidenceHtml({
    assessment:{kind:'speaking',title:'Oral Presentation',class_label:'12.6',
      objective:'Presentation skills',config:{criteria:['Pronunciation','Fluency','Vocabulary','Grammar','Content']}},
    results:[],adjustments:[],
  });
  assert.ok(html.includes('Mô tả mức điểm'));
  assert.ok(html.includes('Phát âm rõ'));
  assert.ok(html.includes('Nói trôi chảy'));
});

test('Assessment Studio has no AI SDK imports or direct AI endpoints',()=>{
  const files=[
    '../src/pages/AssessmentStudio.jsx',
    '../src/features/assessmentStudio/catalogue.js',
    '../src/features/assessmentStudio/assessmentWorkflow.js',
    '../src/features/assessmentStudio/assessmentMath.js',
    '../src/features/assessmentStudio/AssessmentForms.jsx',
    '../src/features/assessmentStudio/evidenceReport.js',
    '../src/features/assessmentStudio/studentHandout.js',
    '../src/features/assessmentStudio/bulkImport.js',
    '../src/features/assessmentStudio/recordIntegrity.js',
    '../src/features/assessmentStudio/evidenceReadiness.js',
    '../src/features/assessmentStudio/rubricDescriptors.js',
  ];
  for(const path of files) {
    const source=readFileSync(new URL(path,import.meta.url),'utf8');
    assert.doesNotMatch(source,/from\s*['"][^'"]*(openai|anthropic|gemini|aiProviders|llmClient)[^'"]*['"]/i,path);
    assert.doesNotMatch(source,/https:\/\/api\.(openai|anthropic)\.com/i,path);
    assert.doesNotMatch(source,/\bfetch\s*\(/,path);
  }
});
