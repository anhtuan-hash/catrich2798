import {normalizeCode,normalizeStudent,csvCell} from './speakingCore.js';
export const MAX_QUESTIONS=100;
export const MAX_STUDENTS=200;
export const LETTERS=['A','B','C','D'];
export const EMPTY_DIAGNOSTIC_META={title:'Grammar Diagnostic Test',className:'',objective:'',teacher:'',date:''};
export const EMPTY_DIAGNOSTIC_ADJUST={finding:'',action:'',date:'',evidence:'',reflection:'',comparability:''};
export const SAMPLE_QUESTIONS=[
 'She enjoys ___ novels. | read | reading | to read | reads | B | Gerund',
 'They decided ___ early. | leave | leaving | to leave | left | C | To-infinitive',
 'Her parents made her ___ the room. | tidy | tidying | to tidy | tidied | A | Bare infinitive',
 'I look forward to ___ you again. | see | seeing | to see | saw | B | Gerund',
 'He promised ___ on time. | arrive | arriving | to arrive | arrived | C | To-infinitive',
].join('\n');

export function parseDiagnosticQuestions(text){
 const lines=String(text||'').split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
 if(lines.length<1||lines.length>MAX_QUESTIONS)throw new Error('Một bài kiểm tra cần 1–100 câu hỏi.');
 const seen=new Set();
 return lines.map((line,i)=>{
  const parts=line.split('|').map(x=>x.trim());
  if(parts.length!==7||parts.some(v=>!v))throw new Error('Dòng '+(i+1)+' cần đúng 7 trường: Câu hỏi | A | B | C | D | Đáp án | Chủ điểm.');
  const answer=parts[5].toUpperCase();
  if(!LETTERS.includes(answer))throw new Error('Dòng '+(i+1)+': đáp án chỉ được chọn A, B, C hoặc D.');
  if(new Set(parts.slice(1,5).map(o=>o.toLowerCase())).size!==4)throw new Error('Dòng '+(i+1)+': bốn phương án phải khác nhau.');
  const norm=parts[0].toLowerCase().replace(/\s+/g,' ');
  if(seen.has(norm))throw new Error('Câu hỏi bị trùng tại dòng '+(i+1)+'.');
  seen.add(norm);
  return {stem:parts[0],options:parts.slice(1,5),answer,topic:parts[6]};
 });
}
export function gradeDiagnostic(questions,rawAnswers){
 if(!Array.isArray(questions)||!questions.length)throw new Error('Chưa có câu hỏi để chấm.');
 const answers=String(rawAnswers||'').trim().toUpperCase().replace(/[\s,;|]+/g,'').split('');
 if(answers.length!==questions.length||answers.some(v=>!LETTERS.includes(v))){
  throw new Error('Cần nhập đúng '+questions.length+' đáp án A–D, theo thứ tự câu hỏi.');
 }
 const topics={};let score=0;
 const details=questions.map((q,i)=>{
  const correct=answers[i]===q.answer;
  if(correct)score+=1;
  const topic=q.topic;
  if(!topics[topic])topics[topic]={achieved:0,total:0};
  topics[topic].total+=1;topics[topic].achieved+=Number(correct);
  return {number:i+1,selected:answers[i],expected:q.answer,correct,topic,stem:q.stem};
 });
 return {score,total:questions.length,percent:score/questions.length*100,answers:answers.join(''),details,topics};
}
export function resolveQuestions(config,phase){
 if(phase==='pre')return config.preQuestions;
 if(config.useSamePost)return config.preQuestions;
 return config.postQuestions;
}
export function scoreDiagnosticRecord({code,phase,answers,config,comment='',at=new Date().toISOString()}){
 if(!['pre','post'].includes(phase))throw new Error('Lượt đánh giá phải là pre hoặc post.');
 const questions=resolveQuestions(config,phase);
 const result=gradeDiagnostic(questions,answers);
 return {code:normalizeCode(code),phase,answers:result.answers,score:result.score,maxScore:result.total,
  percent:result.percent,topics:result.topics,details:result.details,comment:String(comment||'').trim().slice(0,1500),assessedAt:at};
}
export function scorePhase(records,phase){
 const rows=(records||[]).filter(r=>r.phase===phase);
 const average=rows.length?rows.reduce((sum,r)=>sum+r.percent,0)/rows.length:null;
 const topics={};
 rows.forEach(r=>Object.entries(r.topics).forEach(([key,value])=>{
  if(!topics[key])topics[key]={achieved:0,total:0};
  topics[key].achieved+=value.achieved;topics[key].total+=value.total;
 }));
 return {count:rows.length,average,topics};
}
export function pairedDiagnostic(records){
 const before=new Map((records||[]).filter(r=>r.phase==='pre').map(r=>[r.code,r]));
 const rows=[];
 const seen=new Set();
 for(const r of (records||[]).filter(x=>x.phase==='post')){
  const pre=before.get(r.code);if(!pre||seen.has(r.code))continue;
  seen.add(r.code);rows.push({code:r.code,before:pre.percent,after:r.percent,delta:r.percent-pre.percent});
 }
 return {rows,count:rows.length,preAverage:rows.length?rows.reduce((s,r)=>s+r.before,0)/rows.length:null,
  postAverage:rows.length?rows.reduce((s,r)=>s+r.after,0)/rows.length:null,
  delta:rows.length?rows.reduce((s,r)=>s+r.delta,0)/rows.length:null};
}
export function validateDiagnosticConfig({meta,preRaw,postRaw,useSamePost}){
 const m=Object.fromEntries(Object.entries(EMPTY_DIAGNOSTIC_META).map(([k])=>[k,String(meta?.[k]||'').trim().slice(0,250)]));
 if(!m.title||!m.className||!m.objective)throw new Error('Cần tên bài kiểm tra, lớp và mục tiêu đánh giá.');
 const preQuestions=parseDiagnosticQuestions(preRaw);
 const postQuestions=useSamePost?[]:parseDiagnosticQuestions(postRaw);
 return {meta:m,preQuestions,postQuestions,useSamePost:Boolean(useSamePost)};
}
export function parseBulkDiagnostic(text,config,phase,roster=[],existing=[]){
 const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(!lines.length||lines.length>80)throw new Error('Mỗi lượt nhập tối đa 80 học sinh.');
 const all=new Map(roster.map(x=>[x.code,x]));
 const seen=new Set(),newStudents=[],records=[];
 const old=new Set(existing.filter(x=>x.phase===phase).map(x=>x.code));
 lines.forEach((line,i)=>{
  const cols=line.split(line.includes('\t')?'\t':'|').map(v=>v.trim());
  if(cols.length!==3)throw new Error('Dòng '+(i+1)+': cần Mã HS | Họ tên | Đáp án.');
  const student=normalizeStudent({code:cols[0],name:cols[1]});
  if(seen.has(student.code)||old.has(student.code))throw new Error('Dòng '+(i+1)+': mã '+student.code+' đã có kết quả ở lượt này.');
  if(all.has(student.code)&&all.get(student.code).name!==student.name)throw new Error('Dòng '+(i+1)+': họ tên khác danh sách của mã '+student.code+'.');
  seen.add(student.code);
  if(!all.has(student.code)){all.set(student.code,student);newStudents.push(student);}
  try{records.push(scoreDiagnosticRecord({code:student.code,phase,answers:cols[2],config}));}
  catch(err){throw new Error('Dòng '+(i+1)+': '+err.message);}
 });
 if(roster.length+newStudents.length>MAX_STUDENTS)throw new Error('Tối đa 200 học sinh.');
 return {newStudents,records};
}
export function diagnosticReadiness({meta,config,records,adjustment,demo=false}){
 const paired=pairedDiagnostic(records),items=[
  {label:'Lớp, mục tiêu và cấu trúc đề kiểm tra',ok:Boolean(meta.className.trim()&&meta.objective.trim()&&config?.preQuestions?.length)},
  {label:'Đáp án và chủ điểm cho từng câu',ok:Boolean(config?.preQuestions?.every(q=>q.answer&&q.topic))},
  {label:'Có kết quả đánh giá ban đầu',ok:records.some(r=>r.phase==='pre')},
  {label:'Có biện pháp, ngày và thông tin minh chứng can thiệp',ok:Boolean(adjustment.action.trim()&&adjustment.date&&adjustment.evidence.trim())},
  {label:'Có đánh giá lại của cùng học sinh',ok:paired.count>0},
  {label:'Có nhận xét sau can thiệp và ghi chú tính tương đương',ok:Boolean(adjustment.reflection.trim()&&adjustment.comparability.trim())},
 ];
 return {items,count:items.filter(x=>x.ok).length,total:items.length,complete:items.every(x=>x.ok)&&!demo};
}
export function diagnosticCsv(roster,records,demo=false){
 const names=new Map(roster.map(x=>[x.code,x.name]));
 const heads=['Mã HS','Họ tên','Lượt','Đáp án','Điểm đạt','Tổng câu','Tỷ lệ đúng (%)','Nhận xét','Thời gian'];
 const rows=records.map(r=>[r.code,names.get(r.code)||'',r.phase,r.answers,r.score,r.maxScore,r.percent.toFixed(1),r.comment,r.assessedAt]);
 return '\uFEFF'+[...(demo?[['DEMO — DỮ LIỆU MINH HỌA']]:[]),heads,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
}
export function diagnosticBackup(state){
 return JSON.stringify({format:'BRIAN_DIAGNOSTICSCAN_BACKUP',version:1,exportedAt:new Date().toISOString(),
  meta:state.meta,roster:state.roster,config:state.config,records:state.records,
  adjustment:state.adjustment,revisions:state.revisions,demo:Boolean(state.demo)},null,2);
}
export function verifyDiagnosticBackup(data){
 if(data?.format!=='BRIAN_DIAGNOSTICSCAN_BACKUP'||data.version!==1)throw new Error('Không đúng định dạng sao lưu DiagnosticScan v1.');
 if(!Array.isArray(data.roster)||data.roster.length>MAX_STUDENTS||!Array.isArray(data.records)||data.records.length>MAX_STUDENTS*2||
 !Array.isArray(data.revisions)||data.revisions.length>1000)throw new Error('Danh sách hoặc lịch sử không hợp lệ.');
 const rawConfig=data.config;
 // The teacher may also back up a partially prepared, not-yet-confirmed session.
 if(!rawConfig&&data.records.length)throw new Error('File có điểm nhưng thiếu bộ câu hỏi.');
 const asRaw=items=>(items||[]).map(q=>[q.stem,...q.options,q.answer,q.topic].join(' | ')).join('\n');
 const clean=rawConfig?validateDiagnosticConfig({meta:data.meta,preRaw:asRaw(rawConfig.preQuestions),postRaw:asRaw(rawConfig.postQuestions),useSamePost:rawConfig.useSamePost}):null;
 const roster=[],known=new Set();
 data.roster.forEach(s=>{const person=normalizeStudent(s);if(known.has(person.code))throw new Error('Trùng mã học sinh trong file.');known.add(person.code);roster.push(person)});
 const keys=new Set(),records=[];
 data.records.forEach(r=>{
  const record=scoreDiagnosticRecord({code:r?.code,phase:r?.phase,answers:r?.answers,config:clean,comment:r?.comment,at:r?.assessedAt});
  const key=record.code+'|'+record.phase;
  if(!known.has(record.code)||keys.has(key)||r.score!==record.score||r.maxScore!==record.maxScore)throw new Error('Bản ghi trùng, không thuộc lớp hoặc điểm bị thay đổi.');
  keys.add(key);records.push(record);
 });
 const adjustment=Object.fromEntries(Object.keys(EMPTY_DIAGNOSTIC_ADJUST).map(k=>[k,String(data.adjustment?.[k]||'').slice(0,2000)]));
 const revisions=data.revisions.map(r=>({code:normalizeCode(r.code),phase:r.phase==='post'?'post':'pre',
  oldScore:Number(r.oldScore)||0,newScore:Number(r.newScore)||0,reason:String(r.reason||'').slice(0,400),at:String(r.at||'').slice(0,100)}));
 const cleanMeta=clean?.meta||Object.fromEntries(Object.keys(EMPTY_DIAGNOSTIC_META).map(k=>[k,String(data.meta?.[k]||'').slice(0,250)]));
 return {meta:cleanMeta,roster,config:clean&&{preQuestions:clean.preQuestions,postQuestions:clean.postQuestions,useSamePost:clean.useSamePost},records,adjustment,revisions,demo:Boolean(data.demo)};
}
