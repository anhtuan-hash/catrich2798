import { normalizeCode, normalizeStudent, csvCell } from './speakingCore.js';
import { parseDiagnosticQuestions, gradeDiagnostic } from './diagnosticCore.js';

export const EXIT_SAMPLE=[
 'Which sentence is correct? | She enjoy singing. | She enjoys singing. | She enjoys sing. | She enjoy to sing. | B | Gerund',
 'Which verb is followed by a to-infinitive? | avoid | finish | decide | enjoy | C | Infinitive',
 'Choose the correct form: My teacher made us ___ again. | to try | trying | tried | try | D | Bare infinitive',
].join('\n');
export const EXIT_META={title:'Exit Ticket — Lesson Check',className:'',lesson:'',date:'',teacher:''};
export const EXIT_ADJUSTMENT={weakness:'',action:'',implementedDate:'',evidence:'',followupReflection:'',comparability:''};
export const EXIT_MAX_STUDENTS=200;
export const EXIT_MAX_RECORDS=400;

export function parseExitQuestions(raw) {
  const questions=parseDiagnosticQuestions(raw);
  if(questions.length<2||questions.length>3)throw new Error('ExitTicket yêu cầu đúng 2 hoặc 3 câu hỏi.');
  return questions;
}
export function makeExitConfig({meta,initialRaw,followupRaw,repeatQuestions=false}) {
  const clean=Object.fromEntries(Object.keys(EXIT_META).map(k=>[k,String(meta?.[k]??'').trim().slice(0,200)]));
  if(!clean.title||!clean.className||!clean.lesson)throw new Error('Cần tên bài, lớp và nội dung tiết học.');
  const initial=parseExitQuestions(initialRaw);
  const followup=repeatQuestions?[]:parseExitQuestions(followupRaw);
  return {meta:clean,questions:initial,followup,repeatQuestions:Boolean(repeatQuestions)};
}
export function exitQuestions(config,stage) {
  if(stage==='initial')return config.questions;
  if(stage==='followup')return config.repeatQuestions?config.questions:config.followup;
  throw new Error('Lượt đánh giá không hợp lệ.');
}
export function gradeExit({config,code,stage,answers,confidence,reflection='',at=new Date().toISOString()}) {
  const studentCode=normalizeCode(code);
  const questions=exitQuestions(config,stage);
  const grade=gradeDiagnostic(questions,answers);
  const level=Number(confidence);
  if(!Number.isInteger(level)||level<1||level>4)throw new Error('Hãy chọn mức tự tin 1–4 của học sinh.');
  const response=String(reflection||'').trim();
  if(response.length>500)throw new Error('Phản hồi học sinh tối đa 500 ký tự.');
  return {code:studentCode,stage,answers:grade.answers,score:grade.score,maxScore:grade.total,
    percent:grade.percent,confidence:level,reflection:response,topics:grade.topics,
    assessedAt:at};
}
export function groupExit(records,stage) {
  const arr=(records||[]).filter(r=>r.stage===stage);
  const count=arr.length;
  const topics={};
  arr.forEach(r=>Object.entries(r.topics).forEach(([name,v])=>{
    if(!topics[name])topics[name]={correct:0,total:0};
    topics[name].correct+=v.achieved;topics[name].total+=v.total;
  }));
  return {count,average:count?arr.reduce((sum,r)=>sum+r.percent,0)/count:null,
    confidence:count?arr.reduce((sum,r)=>sum+r.confidence,0)/count:null,topics};
}
export function pairExit(records) {
  const initial=new Map((records||[]).filter(r=>r.stage==='initial').map(r=>[r.code,r]));
  const seen=new Set(),rows=[];
  for(const after of (records||[]).filter(r=>r.stage==='followup')){
    const before=initial.get(after.code);
    if(!before||seen.has(after.code))continue;
    rows.push({code:after.code,before:before.percent,after:after.percent,delta:after.percent-before.percent});
    seen.add(after.code);
  }
  return {rows,count:rows.length,delta:rows.length?rows.reduce((s,r)=>s+r.delta,0)/rows.length:null};
}
export function bulkExit(raw,config,stage,roster,existing) {
  const lines=String(raw||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(!lines.length||lines.length>80)throw new Error('Nhập từ 1 đến 80 học sinh mỗi lượt.');
  const known=new Map(roster.map(s=>[s.code,s]));
  const existingKeys=new Set(existing.map(r=>r.code+'::'+r.stage));
  const pre=new Set(existing.filter(r=>r.stage==='initial').map(r=>r.code));
  const seen=new Set(),newStudents=[],newRecords=[];
  lines.forEach((line,i)=>{
    const parts=line.split(line.includes('\t')?'\t':'|').map(s=>s.trim());
    if(parts.length<4||parts.length>5)throw new Error('Dòng '+(i+1)+': Mã HS | Họ tên | Đáp án | Tự tin (1–4) | Phản hồi (tùy chọn).');
    try {
      const person=normalizeStudent({code:parts[0],name:parts[1]});
      const key=person.code+'::'+stage;
      if(seen.has(key)||existingKeys.has(key))throw new Error('Đã có điểm của '+person.code+' trong lượt này.');
      if(known.has(person.code)&&known.get(person.code).name!==person.name)throw new Error('Họ tên không khớp với '+person.code+'.');
      if(stage==='followup'&&!pre.has(person.code))throw new Error('Chưa có Exit Ticket ban đầu cho '+person.code+'.');
      const score=gradeExit({config,code:person.code,stage,answers:parts[2],confidence:parts[3],reflection:parts[4]||''});
      if(!known.has(person.code)){newStudents.push(person);known.set(person.code,person);}
      seen.add(key);newRecords.push(score);
    } catch(err) {throw new Error('Dòng '+(i+1)+': '+err.message);}
  });
  if(known.size>EXIT_MAX_STUDENTS)throw new Error('Tối đa 200 học sinh trong một lớp.');
  return {newStudents,newRecords};
}
export function exitReadiness({meta,config,records,adjustment,demo}) {
  const paired=pairExit(records);
  const checks=[
    ['Đã khai báo tiết học và mục tiêu',Boolean(meta.className?.trim()&&meta.lesson?.trim()&&config)],
    ['Rubric đáp án và nhãn chủ điểm đã được xác định',Boolean(config?.questions.length>=2)],
    ['Đã ghi kết quả Exit Ticket đầu tiết hoặc cuối tiết',records.some(r=>r.stage==='initial')],
    ['Có biện pháp, ngày triển khai và thông tin minh chứng',Boolean(adjustment.action?.trim()&&adjustment.implementedDate&&adjustment.evidence?.trim())],
    ['Có đối chiếu lại cùng mã học sinh',paired.count>0],
    ['Có nhận xét sau can thiệp và ghi chú tính tương đương',Boolean(adjustment.followupReflection?.trim()&&adjustment.comparability?.trim())],
  ].map(([label,ok])=>({label,ok}));
  return {checks,count:checks.filter(x=>x.ok).length,complete:checks.every(x=>x.ok)&&!demo};
}
export function exitCsv(roster,records,demo=false){
  const students=new Map(roster.map(s=>[s.code,s.name]));
  const columns=['Mã HS','Họ và tên','Lượt','Đáp án','Điểm','Tổng','Tỷ lệ (%)','Mức tự tin','Phản hồi','Ngày'];
  const rows=records.map(r=>[r.code,students.get(r.code)||'',r.stage,r.answers,r.score,r.maxScore,r.percent.toFixed(1),r.confidence,r.reflection,r.assessedAt]);
  return '\uFEFF'+[...(demo?[['DEMO — KHÔNG PHẢI KẾT QUẢ THỰC TẾ']]:[]),columns,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
}
export function exitBackup({meta,config,draft,roster,records,adjustment,revisions,demo}){
  return JSON.stringify({format:'BRIAN_EXIT_TICKET',version:1,exportedAt:new Date().toISOString(),
    meta,config,draft,roster,records,adjustment,revisions,demo:Boolean(demo)},null,2);
}
export function loadExitBackup(data){
  if(data?.format!=='BRIAN_EXIT_TICKET'||data.version!==1)throw new Error('Không phải file sao lưu ExitTicket phiên bản 1.');
  if(!Array.isArray(data.roster)||data.roster.length>EXIT_MAX_STUDENTS
    ||!Array.isArray(data.records)||data.records.length>EXIT_MAX_RECORDS
    ||!Array.isArray(data.revisions)||data.revisions.length>1000)throw new Error('Danh sách hoặc lịch sử vượt giới hạn.');
  const names=new Set();
  const roster=data.roster.map(s=>{const v=normalizeStudent(s);if(names.has(v.code))throw new Error('Trùng mã học sinh trong file.');names.add(v.code);return v;});
  const raw=items=>(items||[]).map(q=>[q.stem,...q.options,q.answer,q.topic].join(' | ')).join('\n');
  if(!data.config&&data.records.length)throw new Error('File có điểm nhưng không có khóa đáp án.');
  const cfg=data.config?makeExitConfig({meta:data.meta,initialRaw:raw(data.config.questions),
    followupRaw:raw(data.config.followup),repeatQuestions:data.config.repeatQuestions}):null;
  const config=cfg?{questions:cfg.questions,followup:cfg.followup,repeatQuestions:cfg.repeatQuestions}:null;
  const already=new Set();
  const records=data.records.map(r=>{
    const x=gradeExit({config,code:r.code,stage:r.stage,answers:r.answers,confidence:r.confidence,
      reflection:r.reflection,at:r.assessedAt});
    const key=x.code+'::'+x.stage;
    if(!names.has(x.code)||already.has(key)||x.score!==r.score||x.maxScore!==r.maxScore)throw new Error('Bản ghi học sinh trùng, lạ hoặc điểm đã bị chỉnh sửa.');
    already.add(key);return x;
  });
  const cleanMeta=Object.fromEntries(Object.keys(EXIT_META).map(k=>[k,String(data.meta?.[k]||'').slice(0,200)]));
  const adjustment=Object.fromEntries(Object.keys(EXIT_ADJUSTMENT).map(k=>[k,String(data.adjustment?.[k]||'').slice(0,1500)]));
  const revisions=data.revisions.map(x=>({code:normalizeCode(x.code),stage:x.stage==='followup'?'followup':'initial',
    before:Number(x.before)||0,after:Number(x.after)||0,reason:String(x.reason||'').slice(0,400),date:String(x.date||'').slice(0,50)}));
  return {meta:cleanMeta,config,draft:{initialRaw:String(data.draft?.initialRaw||'').slice(0,10000),
    followupRaw:String(data.draft?.followupRaw||'').slice(0,10000),repeatQuestions:Boolean(data.draft?.repeatQuestions)},
    roster,records,adjustment,revisions,demo:Boolean(data.demo)};
}
