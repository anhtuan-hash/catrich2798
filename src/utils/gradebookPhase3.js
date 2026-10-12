import { gradeRoundScore, gradeScoreNumber, gradeSemesterAverage } from './homeroomGradebookExport.js';
import { isGradebookFinalized } from './gradebookFinalization.js';

export const GRADEBOOK_RUBRICS=Object.freeze({
  speaking:{
    label:'Speaking',
    criteria:[
      {id:'fluency',label:'Fluency & coherence',weight:30},
      {id:'pronunciation',label:'Pronunciation',weight:25},
      {id:'lexical',label:'Lexical resource',weight:25},
      {id:'grammar',label:'Grammar accuracy',weight:20},
    ],
  },
  writing:{
    label:'Writing',
    criteria:[
      {id:'task',label:'Task achievement',weight:30},
      {id:'organization',label:'Coherence & cohesion',weight:25},
      {id:'vocabulary',label:'Lexical resource',weight:25},
      {id:'language',label:'Grammar range & accuracy',weight:20},
    ],
  },
});

export function gradebookRubricKey({subject,semester,type,activity,studentId}={}){
  return JSON.stringify([subject,semester,type,String(activity||'').trim().toLowerCase(),studentId]);
}
export function validateGradebookRubric(criteria,scores){
  if(!Array.isArray(criteria)||criteria.length<2||criteria.length>10)return {ok:false,error:'Rubric phải có từ 2 đến 10 tiêu chí.'};
  const ids=new Set(),sum=criteria.reduce((v,c)=>v+Number(c.weight),0);
  for(const c of criteria){
    if(!c.id||!String(c.label||'').trim()||ids.has(c.id))return {ok:false,error:'Thiếu hoặc trùng tiêu chí rubric.'};
    ids.add(c.id);
    if(!Number.isFinite(Number(c.weight))||Number(c.weight)<=0||Number(c.weight)>100)return {ok:false,error:'Trọng số mỗi tiêu chí phải lớn hơn 0.'};
  }
  if(Math.abs(sum-100)>0.001)return {ok:false,error:'Tổng trọng số phải bằng 100%.'};
  for(const c of criteria){
    const raw=scores?.[c.id];
    if(raw==null||String(raw).trim()==='')return {ok:false,error:'Chưa nhập điểm tiêu chí '+c.label+'.'};
    const text=String(raw).trim().replace(',','.');
    const score=Number(text);
    if(!/^\d{1,2}(\.\d{1,2})?$/.test(text)||!Number.isFinite(score)||score<0||score>10)
      return {ok:false,error:'Điểm '+c.label+' phải nằm trong khoảng 0–10.'};
  }
  return {ok:true,error:''};
}
export function computeGradebookRubric(criteria,scores){
  const verified=validateGradebookRubric(criteria,scores);
  if(!verified.ok)return {...verified,score:null};
  const value=criteria.reduce((total,item)=>total+Number(String(scores[item.id]).replace(',','.'))*Number(item.weight)/100,0);
  return {ok:true,error:'',score:Math.round(value*100)/100};
}
export function saveGradebookRubric(book,{subject,semester,type,activity,studentId,criteria,scores,note,actor,now}){
  if(!GRADEBOOK_RUBRICS[type])throw new Error('Loại rubric không hợp lệ.');
  if(!subject||!['semester1','semester2'].includes(semester)||!studentId)throw new Error('Thiếu lớp, môn hoặc học sinh.');
  if(isGradebookFinalized(book,subject,semester))throw new Error('Học kỳ đã chốt; không thể sửa rubric.');
  if(!String(activity||'').trim()||String(activity).trim().length>90)throw new Error('Tên hoạt động không hợp lệ.');
  const result=computeGradebookRubric(criteria,scores);
  if(!result.ok)throw new Error(result.error);
  const key=gradebookRubricKey({subject,semester,type,activity,studentId});
  const stamp=String(now||new Date().toISOString());
  const record={
    subject,semester,type,activity:String(activity).trim(),studentId,
    criteria:criteria.map(c=>({id:String(c.id),label:String(c.label),weight:Number(c.weight)})),
    scores:Object.fromEntries(criteria.map(c=>[c.id,Number(String(scores[c.id]).replace(',','.'))])),
    score:result.score,note:String(note||'').trim().slice(0,1200),actor:String(actor||'Giáo viên'),
    updatedAt:stamp,
  };
  return {...book,rubricRecords:{...(book.rubricRecords||{}),[key]:record}};
}

function compareGradeValues(a,b){
  return String(a??'')===String(b??'');
}
function locateRestorableCell(book,change){
  if(!change||!['scores','plusCounts','midterm','final'].includes(change.kind))return null;
  if(!['semester1','semester2'].includes(change.term))return null;
  const subject=book?.subjects?.[change.subject];
  const sem=subject?.semesters?.[change.term];
  if(!sem||!change.studentId)return null;
  if(change.kind==='scores'||change.kind==='plusCounts'){
    const index=Number(change.round);
    if(!Number.isInteger(index)||index<0||index>3)return null;
    const round=sem.regular?.[index];
    if(!round)return null;
    if(change.kind==='plusCounts'){
      if(change.column!=='plus')return null;
      return {kind:'plusCounts',collection:round.plusCounts||{},id:change.studentId};
    }
    if(!(round.columns||[]).some(c=>c.id===change.column))return null;
    return {kind:'scores',collection:round.scores?.[change.studentId]||{},id:change.column,
      student:change.studentId,round};
  }
  return {kind:change.kind,collection:sem[change.kind]?.scores||{},id:change.studentId};
}
export function previewGradebookHistoryRestore(book,entry){
  const changes=Array.isArray(entry?.changes)?entry.changes:[];
  const issues=[],valid=[];
  if(!entry?.id||!Number.isSafeInteger(entry.count)||entry.count<=0||entry.count!==changes.length)
    issues.push('Nhật ký bị thiếu hoặc đã rút gọn; không thể khôi phục toàn bộ lần lưu.');
  if(changes.length>1200)issues.push('Lần lưu vượt giới hạn 1200 thay đổi; không thể khôi phục an toàn.');
  const touched=new Set();
  changes.forEach((change,i)=>{
    const where=locateRestorableCell(book,change);
    if(!where){issues.push('Thay đổi '+(i+1)+': không tìm thấy cột điểm/học sinh tương ứng.');return;}
    if(isGradebookFinalized(book,change.subject,change.term)){
      issues.push('Thay đổi '+(i+1)+': học kỳ đã chốt.');return;
    }
    const id=JSON.stringify([change.subject,change.term,change.kind,change.round,change.studentId,change.column]);
    if(touched.has(id)){issues.push('Nhật ký có ô điểm trùng; từ chối khôi phục.');return;}
    touched.add(id);
    const current=where.collection[where.id];
    if(!compareGradeValues(current,change.to)){
      issues.push('Thay đổi '+(i+1)+': điểm hiện tại khác điểm được ghi ở lần lưu; có thể đã được sửa sau đó.');
      return;
    }
    valid.push({change,current});
  });
  return {ok:issues.length===0&&valid.length===changes.length&&valid.length>0,issues,changes:valid,
    count:changes.length,sourceId:entry?.id||''};
}
export function restoreGradebookHistory(book,entry,{reason,actor,now}={}){
  const message=String(reason||'').trim();
  if(message.length<8)throw new Error('Cần nhập lý do khôi phục ít nhất 8 ký tự.');
  const preview=previewGradebookHistoryRestore(book,entry);
  if(!preview.ok)throw new Error(preview.issues[0]||'Nhật ký không thể khôi phục.');
  const next=structuredClone(book);
  for(const item of preview.changes){
    const target=locateRestorableCell(next,item.change);
    const old=item.change.from;
    if(target.kind==='scores'){
      const row={...(target.round.scores[item.change.studentId]||{})};
      if(old===null||old===undefined||old==='')delete row[target.id];
      else row[target.id]=old;
      target.round.scores[item.change.studentId]=row;
    }else if(old===null||old===undefined||old===''){
      delete target.collection[target.id];
    }else target.collection[target.id]=old;
  }
  // Kept as local pending metadata until next Save; persisted history is append-only.
  next.pendingGradebookRestore={
    sourceId:entry.id,reason:message,actor:String(actor||'Giáo viên'),
    at:String(now||new Date().toISOString()),
  };
  return next;
}
export function buildStudentProgressModel({student,students=[],semester,subjectName,semesterId,intervention,records=[]}={}){
  if(!student?.id)throw new Error('Chưa chọn học sinh.');
  const studentIds=students.filter(s=>s.active!==false).map(s=>s.id);
  const rounds=(semester?.regular||[]).slice(0,4).map(round=>gradeRoundScore(round,student.id,studentIds));
  while(rounds.length<4)rounds.push(null);
  const midterm=gradeScoreNumber(semester?.midterm?.scores?.[student.id]);
  const final=gradeScoreNumber(semester?.final?.scores?.[student.id]);
  const points=[...rounds,midterm,final];
  const recorded=points.filter(x=>x!=null);
  return {
    studentName:String(student.fullName||''),
    studentCode:String(student.code||''),
    subjectName:String(subjectName||'Môn học'),semesterId:String(semesterId||'semester1'),
    components:points,semesterAverage:gradeSemesterAverage(semester,student.id,studentIds),
    completed:recorded.length,total:6,
    trend:rounds.slice(0,4).filter(x=>x!=null),
    intervention:intervention&&typeof intervention==='object'?{
      note:String(intervention.note||'').slice(0,1200),
      status:String(intervention.status||''),
      target:intervention.target??null,
    }:null,
    rubricRecords:records.filter(r=>r?.studentId===student.id&&r.semester===semesterId).slice(0,8)
      .map(r=>({type:r.type,activity:String(r.activity),score:Number(r.score)})),
  };
}
