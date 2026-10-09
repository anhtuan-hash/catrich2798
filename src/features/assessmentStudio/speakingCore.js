/**
 * BRIAN SpeakScale: deterministic scoring and local-file verification.
 * No server, AI, browser storage, or network dependencies in this module.
 */
export const SPEAKING_CRITERIA = Object.freeze([
  {id:'pronunciation',name:'Pronunciation',vi:'Phát âm'},
  {id:'fluency',name:'Fluency',vi:'Độ lưu loát'},
  {id:'vocabulary',name:'Vocabulary',vi:'Từ vựng'},
  {id:'grammar',name:'Grammar',vi:'Ngữ pháp'},
  {id:'content',name:'Content',vi:'Nội dung'},
]);

export const SPEAKING_ANCHORS = Object.freeze({
  pronunciation:[
    'Không có phát ngôn đủ để đánh giá.',
    'Phát âm làm phần lớn nội dung khó hiểu.',
    'Có thể hiểu ý chính nhưng nhiều lỗi âm và trọng âm.',
    'Phát âm nhìn chung rõ; một số lỗi nhỏ không cản trở hiểu.',
    'Phát âm rõ, trọng âm và ngữ điệu hỗ trợ giao tiếp.',
  ],
  fluency:[
    'Không tạo được bài nói đủ để đánh giá.',
    'Ngập ngừng liên tục, không duy trì được ý.',
    'Trình bày được ý cơ bản nhưng thường ngắt quãng.',
    'Duy trì bài nói tương đối liên tục, ít ngập ngừng.',
    'Nói trôi chảy, nhịp độ phù hợp và chuyển ý tự nhiên.',
  ],
  vocabulary:[
    'Không có vốn từ đủ để đánh giá.',
    'Vốn từ rất hạn chế, nhiều từ dùng sai nghĩa.',
    'Từ vựng cơ bản phù hợp một phần; còn lặp và thiếu chính xác.',
    'Từ vựng phù hợp chủ đề và khá đa dạng.',
    'Từ vựng đa dạng, chính xác và linh hoạt.',
  ],
  grammar:[
    'Không có cấu trúc đủ để đánh giá.',
    'Lỗi ngữ pháp thường xuyên khiến người nghe khó hiểu.',
    'Sử dụng cấu trúc đơn giản; còn lỗi nhưng hiểu được.',
    'Phần lớn cấu trúc phù hợp và chính xác, có lỗi nhỏ.',
    'Cấu trúc đa dạng, chính xác, phù hợp nhiệm vụ.',
  ],
  content:[
    'Không thực hiện nhiệm vụ hoặc hoàn toàn lạc đề.',
    'Nội dung rất ít, chưa đáp ứng phần lớn yêu cầu.',
    'Có các ý chính nhưng thiếu triển khai, ví dụ hoặc liên kết.',
    'Đáp ứng nhiệm vụ, ý tương đối rõ và có dẫn chứng.',
    'Đáp ứng đầy đủ, tổ chức chặt chẽ, minh họa thuyết phục.',
  ],
});
export const MAX_STUDENTS=200;
export const MAX_RECORDS=400;
export const EMPTY_MARKS=Object.freeze(Object.fromEntries(SPEAKING_CRITERIA.map(c=>[c.id,null])));
export const INITIAL_META=Object.freeze({title:'Speaking Assessment',className:'',objective:'',task:'Individual presentation',teacher:'',date:''});
export const EMPTY_INTERVENTION=Object.freeze({finding:'',action:'',date:'',evidence:'',reflection:''});

export function normalizeCode(input){
  const code=String(input??'').trim().toUpperCase();
  if(!/^[A-Z0-9][A-Z0-9._-]{0,39}$/.test(code))throw new Error('Mã học sinh cần 1–40 ký tự A–Z, 0–9, dấu chấm, gạch nối hoặc gạch dưới.');
  return code;
}
export function normalizeStudent({code,name}){
  const studentCode=normalizeCode(code);
  const studentName=String(name??'').trim();
  if(!studentName || studentName.length>120)throw new Error('Họ tên học sinh phải có 1–120 ký tự.');
  return {code:studentCode,name:studentName};
}
export function parseRoster(text,existing=[]){
  const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!lines.length||lines.length>80)throw new Error('Mỗi lần nhập cần từ 1 đến 80 học sinh.');
  const seen=new Set(existing.map(s=>normalizeCode(s.code)));
  const parsed=lines.map((line,index)=>{
    const cols=line.split(line.includes('\t')?'\t':'|').map(x=>x.trim());
    if(cols.length!==2)throw new Error('Dòng '+(index+1)+': nhập Mã HS | Họ tên.');
    const result=normalizeStudent({code:cols[0],name:cols[1]});
    if(seen.has(result.code))throw new Error('Mã học sinh '+result.code+' bị trùng (dòng '+(index+1)+').');
    seen.add(result.code);
    return result;
  });
  if(parsed.length+existing.length>MAX_STUDENTS)throw new Error('Một đợt hỗ trợ tối đa '+MAX_STUDENTS+' học sinh.');
  return parsed;
}
export function scoreMarks(marks){
  const criteria={};
  for(const c of SPEAKING_CRITERIA){
    const mark=marks?.[c.id];
    if(!Number.isInteger(mark)||mark<0||mark>4)throw new Error('Cần chọn đủ điểm nguyên từ 0–4 cho '+c.vi+'.');
    criteria[c.id]=mark;
  }
  const score=Object.values(criteria).reduce((s,v)=>s+v,0);
  return {marks:criteria,score,maxScore:20,percentage:score*5};
}
export function recordKey(code,phase){return normalizeCode(code)+'::'+phase;}
export function buildRecord({code,phase,marks,comment='',assessor='',at=new Date().toISOString()}){
  if(!['pre','post'].includes(phase))throw new Error('Lần đánh giá phải là trước hoặc sau điều chỉnh.');
  const grade=scoreMarks(marks);
  const note=String(comment??'').trim();
  if(note.length>1500)throw new Error('Nhận xét quá dài (tối đa 1500 ký tự).');
  return {code:normalizeCode(code),phase,marks:grade.marks,score:grade.score,maxScore:20,comment:note,assessor:String(assessor??'').trim().slice(0,120),assessedAt:at};
}
export function stats(records,phase){
  const rows=(records||[]).filter(r=>r.phase===phase);
  const count=rows.length;
  const avg=count?rows.reduce((n,r)=>n+r.score,0)/count:null;
  const criteria=Object.fromEntries(SPEAKING_CRITERIA.map(c=>[c.id,count?rows.reduce((n,r)=>n+r.marks[c.id],0)/count:null]));
  return {count,average:avg,criteria};
}
export function pairedComparison(records){
  const before=new Map((records||[]).filter(r=>r.phase==='pre').map(r=>[r.code,r]));
  const seen=new Set(); const pairs=[];
  for(const record of (records||[]).filter(r=>r.phase==='post')){
    const pre=before.get(record.code);
    if(!pre||seen.has(record.code))continue;
    seen.add(record.code);
    pairs.push({code:record.code,before:pre.score,after:record.score,change:record.score-pre.score});
  }
  const count=pairs.length;
  return {pairs,count,preAverage:count?pairs.reduce((n,p)=>n+p.before,0)/count:null,postAverage:count?pairs.reduce((n,p)=>n+p.after,0)/count:null,delta:count?pairs.reduce((n,p)=>n+p.change,0)/count:null};
}
export function checklist({meta,roster,records,intervention,demo=false}){
  const comparison=pairedComparison(records);
  const check=[
    {key:'objective',label:'Có lớp, nhiệm vụ và mục tiêu đánh giá',ok:Boolean(meta.className.trim()&&meta.objective.trim()&&meta.task.trim())},
    {key:'rubric',label:'Rubric 5 tiêu chí / 5 mức điểm đã được công bố',ok:true},
    {key:'pre',label:'Có kết quả đánh giá ban đầu',ok:records.some(r=>r.phase==='pre')},
    {key:'action',label:'Có ngày, biện pháp và thông tin minh chứng điều chỉnh',ok:Boolean(intervention.action.trim()&&intervention.date&&intervention.evidence.trim())},
    {key:'post',label:'Có kết quả đánh giá lại của cùng học sinh',ok:comparison.count>0},
    {key:'reflection',label:'Có nhận xét giáo viên sau đánh giá lại',ok:Boolean(intervention.reflection.trim())},
  ];
  return {items:check,done:check.filter(c=>c.ok).length,total:check.length,complete:check.every(c=>c.ok)&&!demo};
}
export function csvCell(value){
  let s=String(value??'');
  if(/^\s*[=+\-@\t\r]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
}
export function makeCsv(roster,records,demo=false){
  const lookup=new Map(roster.map(s=>[s.code,s.name]));
  const head=['Mã học sinh','Họ và tên','Lần đánh giá',...SPEAKING_CRITERIA.map(c=>c.name),'Điểm / 20','Nhận xét','Ngày ghi'];
  const rows=records.map(r=>[r.code,lookup.get(r.code)||'',r.phase,...SPEAKING_CRITERIA.map(c=>r.marks[c.id]),r.score,r.comment,r.assessedAt]);
  return '\uFEFF'+[...(demo?[['DEMO - KHÔNG PHẢI DỮ LIỆU THẬT']]:[]),head,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
}
export function createBackup(state){
  return JSON.stringify({format:'BRIAN_SPEAKSCALE_BACKUP',version:1,exportedAt:new Date().toISOString(),
    meta:state.meta,roster:state.roster,records:state.records,intervention:state.intervention,
    revisions:state.revisions,demo:Boolean(state.demo)},null,2);
}
export function verifyBackup(source){
  if(!source||source.format!=='BRIAN_SPEAKSCALE_BACKUP'||source.version!==1)throw new Error('File không đúng định dạng BRIAN SpeakScale v1.');
  const roster=source.roster, records=source.records,revisions=source.revisions;
  if(!Array.isArray(roster)||roster.length>MAX_STUDENTS||!Array.isArray(records)||records.length>MAX_RECORDS||!Array.isArray(revisions)||revisions.length>1000)throw new Error('Dữ liệu vượt giới hạn hoặc không hợp lệ.');
  const cleanRoster=[], codes=new Set();
  for(const s of roster){const student=normalizeStudent(s);if(codes.has(student.code))throw new Error('File có mã học sinh trùng.');codes.add(student.code);cleanRoster.push(student);}
  const seen=new Set(),cleanRecords=[];
  for(const r of records){
    const clean=buildRecord({code:r?.code,phase:r?.phase,marks:r?.marks,comment:r?.comment,assessor:r?.assessor,at:r?.assessedAt});
    if(!codes.has(clean.code)||seen.has(recordKey(clean.code,clean.phase)))throw new Error('File có kết quả trùng hoặc không tồn tại học sinh.');
    if(clean.score!==r.score)throw new Error('Điểm lưu trong file khác điểm tính từ rubric.');
    seen.add(recordKey(clean.code,clean.phase));cleanRecords.push(clean);
  }
  const meta={...INITIAL_META},intervention={...EMPTY_INTERVENTION};
  for(const key of Object.keys(meta))meta[key]=String(source.meta?.[key]??'').slice(0,250);
  for(const key of Object.keys(intervention))intervention[key]=String(source.intervention?.[key]??'').slice(0,1600);
  const cleanedRevisions=revisions.map(item=>({
    code:normalizeCode(item.code),phase:['pre','post'].includes(item.phase)?item.phase:'pre',
    reason:String(item.reason||'').slice(0,400),at:String(item.at||'').slice(0,50),
    before:Number(item.before)||0,after:Number(item.after)||0,
  }));
  return {meta,roster:cleanRoster,records:cleanRecords,intervention,revisions:cleanedRevisions,demo:Boolean(source.demo)};
}
