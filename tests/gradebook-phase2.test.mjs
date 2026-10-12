import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createXlsxBlob } from '../src/utils/simpleXlsx.js';
import { readGradebookXlsx, previewGradebookExcelImport } from '../src/utils/gradebookExcelImport.js';
import { gradebookFinalizationKey, isGradebookFinalized, setFinalizationState, gradebookFinalizationReadiness, exportGradebookAuditCsv } from '../src/utils/gradebookFinalization.js';

const students=[
{id:'a',fullName:'Nguyễn Văn An',code:'CP-01',active:true},
{id:'b',fullName:'Lê Thị Bình',code:'CP-02',active:true},
{id:'c',fullName:'Trần Chi',code:'CP-03',active:true}
];
const columns=[{id:'a1',label:'Lần 1'},{id:'a2',label:'Lần 2'}];

test('Excel import matches unique student codes, never roster order',()=>{
  const rows=[['Mã','Điểm A','Điểm B'],['CP-03',7.5,8],['CP-01',9,10],['CP-02',4.5,5]];
  const preview=previewGradebookExcelImport({rows,students,columns,firstDataRow:1,studentColumn:0,scoreColumn:1});
  assert.equal(preview.errors.length,0);
  assert.equal(preview.matched,3);
  assert.equal(preview.entries.length,6);
  assert.equal(preview.entries[0].studentId,'c');
  assert.equal(preview.entries[2].studentId,'a');
  assert.equal(preview.entries[2].value,'9');
});
test('match by Vietnamese name ignores casing and diacritics',()=>{
  const rows=[['Tên','Lần 1'],['nguyen van an',8.75]];
  const out=previewGradebookExcelImport({rows,students,columns,matchBy:'name'});
  assert.equal(out.errors.length,0);
  assert.equal(out.entries[0].studentId,'a');
});
test('Excel unknown students, duplicates, ambiguous identifiers and bad scores block apply',()=>{
  const rows=[['ID','Score'],['CP-01','8'],['CP-01','9'],['CP-XX',6],['CP-02',12],['CP-03','-1']];
  const result=previewGradebookExcelImport({rows,students,columns});
  assert.equal(result.entries.length,1);
  assert.equal(result.errors.length,4);
  const duplicateRoster=previewGradebookExcelImport({rows:[['ID','Score'],['CP-01',8]],students:[...students,{id:'d',fullName:'Other',code:'CP-01'}],columns});
  assert.equal(duplicateRoster.entries.length,0);
  assert.equal(duplicateRoster.errors.length,1);
});
test('nonmatching grade columns are errors instead of silently adding data',()=>{
  const result=previewGradebookExcelImport({rows:[['ID','a','b','c'],['CP-01',9,8,7]],students,columns});
  assert.equal(result.entries.length,2);
  assert.equal(result.errors.length,1);
});
test('preview distinguishes overwrites while preserving original score',()=>{
  const result=previewGradebookExcelImport({rows:[['ID','a'],['CP-01','7.5']],students,columns,scores:{a:{a1:'6'}}});
  assert.equal(result.overwrites,1);
  assert.equal(result.entries[0].previous,'6');
  assert.equal(result.entries[0].value,'7.5');
});
test('actual .xlsx workbook is read locally with worksheet selection',async()=>{
  const blob=createXlsxBlob([
    {name:'Điểm HK1',rows:[['Mã HS','TX1'],['CP-01',9],['CP-02',8]]},
    {name:'Điểm HK2',rows:[['Mã HS','TX1'],['CP-01',7],['CP-02',9]]}
  ]);
  const file={name:'diem-test.xlsx',size:blob.size,arrayBuffer:()=>blob.arrayBuffer()};
  const initial=await readGradebookXlsx(file);
  assert.deepEqual(initial.sheetNames,['Điểm HK1','Điểm HK2']);
  assert.equal(initial.rows[1][1],9);
  const later=await readGradebookXlsx(file,{sheet:'Điểm HK2'});
  assert.equal(later.rows[1][1],7);
});
test('Excel import rejects invalid extension and oversized file before parsing',async()=>{
  await assert.rejects(readGradebookXlsx({name:'upload.xlsm',size:100}),/xlsx/);
  await assert.rejects(readGradebookXlsx({name:'big.xlsx',size:3*1024*1024}),/2 MB/);
});
test('readiness only permits chốt when all six components exist for every active student',()=>{
  const sem={regular:Array.from({length:4},()=>({columns:[{id:'a'}],scores:{a:{a:8},b:{a:8}}})),
    midterm:{scores:{a:7,b:8}},final:{scores:{a:9,b:10}}};
  const compute=(r,id)=>r?.scores[id]?.a??null;
  const ready=gradebookFinalizationReadiness({students:students.slice(0,2),semester:sem,computeRoundScore:compute});
  assert.equal(ready.ready,true);
  delete sem.final.scores.b;
  const missing=gradebookFinalizationReadiness({students:students.slice(0,2),semester:sem,computeRoundScore:compute});
  assert.equal(missing.ready,false);
  assert.equal(missing.missing[0].part,'Cuối kỳ');
});
test('finalization is per subject and semester, with mandatory reason on reopening',()=>{
  const source={subjects:{english:{}}};
  const now='2026-10-12T08:00:00.000Z';
  const sealed=setFinalizationState(source,{subject:'english',semester:'semester1',lock:true,actor:'teacher@school.vn',now});
  assert.equal(isGradebookFinalized(sealed,'english','semester1'),true);
  assert.equal(isGradebookFinalized(sealed,'english','semester2'),false);
  assert.equal(isGradebookFinalized(sealed,'math','semester1'),false);
  assert.equal(isGradebookFinalized(source,'english','semester1'),false);
  assert.throws(()=>setFinalizationState(sealed,{subject:'english',semester:'semester1',lock:false,reason:'no',actor:'teacher'}),/8 ký tự/);
  const open=setFinalizationState(sealed,{subject:'english',semester:'semester1',lock:false,reason:'Đã đối chiếu bài kiểm tra',actor:'teacher@school.vn',now:'2026-10-13T08:00:00Z'});
  assert.equal(isGradebookFinalized(open,'english','semester1'),false);
  assert.equal(open.finalizationHistory.length,2);
  assert.equal(gradebookFinalizationKey('math','semester2'),'math|semester2');
});
test('audit CSV escapes spreadsheet formulas and includes before/after values',()=>{
  const csv=exportGradebookAuditCsv([{at:'2026',author:'Teacher',changes:[{subject:'math',term:'semester1',kind:'scores',round:0,studentId:'id1',column:'c1',from:'=HYPERLINK("fake")',to:9}]}]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv,/'=HYPERLINK/);
  assert.match(csv,/"9"/);
});
test('locked status actively disables edit controls (not just styling)',()=>{
  const engine=readFileSync(new URL('../src/components/gradebook/GradebookEngine.jsx',import.meta.url),'utf8');
  const panel=readFileSync(new URL('../src/components/gradebook/GradebookProductivityPanel.jsx',import.meta.url),'utf8');
  assert.match(engine,/if\(finalized\)return;/);
  assert.match(engine,/if \(finalized \|\| !activeRound/);
  assert.match(engine,/<ScoreInput value=\{row\[column.id\]\} disabled=\{finalized\}/);
  assert.match(engine,/<PlusCountInput value=\{plusCount\} disabled=\{finalized\}/);
  assert.match(engine,/<ScoreInput value=\{value\} disabled=\{finalized\}/);
  assert.match(engine,/onSetFinalization=\{updateFinalization\}/);
  assert.match(engine,/gradebookQualityReport\(\{students,semester:activeSemester\}\)\.length>0/);
  assert.match(panel,/qualityIssues\.length>0/);
  assert.match(engine,/gb-finalized-banner/);
  assert.match(panel,/readGradebookXlsx/);
  assert.match(panel,/previewGradebookExcelImport/);
  assert.match(panel,/Đối chiếu & xem trước/);
  assert.match(panel,/Chốt điểm học kỳ/);
});
