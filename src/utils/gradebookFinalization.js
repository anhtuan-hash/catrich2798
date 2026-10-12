// Gradebook finalization workflow. Client-side workflow guard only.
// Real tamper-proof enforcement requires server-side policies and should be a separate release.
export function gradebookFinalizationKey(subject,semester){
  return [String(subject||''),String(semester||'')].join('|');
}
export function finalizationRecord(book,subject,semester){
  return book?.finalizations?.[gradebookFinalizationKey(subject,semester)]||null;
}
export function isGradebookFinalized(book,subject,semester){
  return finalizationRecord(book,subject,semester)?.locked===true;
}
export function gradebookFinalizationReadiness({students=[],semester,computeRoundScore}={}){
  const rows=students.filter(s=>s?.active!==false);
  const missing=[];
  for(const student of rows){
    for(let i=0;i<4;i++){
      const round=semester?.regular?.[i];
      const grade=typeof computeRoundScore==='function'?computeRoundScore(round,student.id):null;
      if(grade==null||!Number.isFinite(Number(grade)))
        missing.push({studentId:student.id,name:student.fullName||'',part:'TX '+(i+1)});
    }
    for(const type of ['midterm','final']){
      const raw=semester?.[type]?.scores?.[student.id];
      if(raw===null||raw===undefined||String(raw).trim()===''||!Number.isFinite(Number(String(raw).replace(',','.')))||
        Number(String(raw).replace(',','.'))<0||Number(String(raw).replace(',','.'))>10)
        missing.push({studentId:student.id,name:student.fullName||'',part:type==='midterm'?'Giữa kỳ':'Cuối kỳ'});
    }
  }
  return {ready:rows.length>0&&missing.length===0,studentCount:rows.length,missing,complete:rows.length>0&&missing.length===0?rows.length:0};
}
export function setFinalizationState(book,{subject,semester,lock,reason,actor,now}){
  if(!subject||!['semester1','semester2'].includes(semester))throw new Error('Học kỳ hoặc môn học không hợp lệ.');
  const stamp=String(now||new Date().toISOString());
  const message=String(reason||'').trim();
  if(!lock && message.length<8)throw new Error('Cần nhập lý do mở khóa ít nhất 8 ký tự.');
  const key=gradebookFinalizationKey(subject,semester);
  const previous=finalizationRecord(book,subject,semester);
  if(Boolean(previous?.locked)===Boolean(lock))return book;
  return {
    ...book,
    finalizations:{
      ...(book.finalizations||{}),
      [key]:{locked:Boolean(lock),at:stamp,actor:String(actor||'Giáo viên'),reason:lock?'Hoàn tất kiểm tra điểm':message},
    },
    finalizationHistory:[{
      id:'grade-final-'+stamp+'-'+key,
      key,locked:Boolean(lock),at:stamp,actor:String(actor||'Giáo viên'),
      reason:lock?'Hoàn tất kiểm tra điểm':message,
    },...(Array.isArray(book.finalizationHistory)?book.finalizationHistory:[])].slice(0,35),
  };
}
export function exportGradebookAuditCsv(history=[]){
  const clean=(value)=>{
    const s=String(value??'');
    // Escape Excel/Sheets formula execution even when values begin with whitespace.
    const safe=/^[\s]*[=+\-@]/.test(s)?"'"+s:s;
    return '"'+safe.replace(/"/g,'""')+'"';
  };
  const rows=[['Thời gian','Người sửa','Môn','Học kỳ','Loại','Đợt','Mã học sinh','Cột','Giá trị cũ','Giá trị mới']];
  for(const entry of history){
    for(const change of entry?.changes||[]){
      rows.push([entry.at,entry.author,change.subject,change.term,change.kind,(change.round??'')!==''?Number(change.round)+1:'',change.studentId,change.column||'',change.from,change.to]);
    }
  }
  return '\uFEFF'+rows.map(row=>row.map(clean).join(',')).join('\r\n');
}
