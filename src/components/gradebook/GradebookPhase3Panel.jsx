import { useEffect, useMemo, useState } from 'react';
import {
  GRADEBOOK_RUBRICS,gradebookRubricKey,computeGradebookRubric,
  previewGradebookHistoryRestore,buildStudentProgressModel,
} from '../../utils/gradebookPhase3.js';
import { exportGradebookProgressPdf } from '../../utils/gradebookProgressPdf.js';
import './GradebookPhase3Panel.css';

const GRADE_LABELS=['TX 1','TX 2','TX 3','TX 4','Giữa kỳ','Cuối kỳ'];
const p=(value)=>value==null?'—':Number(value).toFixed(2).replace(/0$/,'').replace(/\.$/,'');
export default function GradebookPhase3Panel({mode,gradebook,students,semester,semesterId,subjectKey,
  subjectName,workspace,currentUser,dirty,finalized,onSaveRubric,onRestoreHistory}){
  const activeStudents=useMemo(()=>students.filter(s=>s.active!==false),[students]);
  const [studentId,setStudentId]=useState('');
  const [type,setType]=useState('speaking');
  const [activity,setActivity]=useState('Speaking 1');
  const [scores,setScores]=useState({});
  const [weights,setWeights]=useState({});
  const [note,setNote]=useState('');
  const [message,setMessage]=useState('');
  const [working,setWorking]=useState(false);
  const [entryId,setEntryId]=useState('');
  const [reason,setReason]=useState('');
  const student=activeStudents.find(s=>s.id===studentId)||activeStudents[0]||null;
  const rubric=GRADEBOOK_RUBRICS[type];
  const recordKey=gradebookRubricKey({subject:subjectKey,semester:semesterId,type,activity,studentId:student?.id});
  const saved=gradebook.rubricRecords?.[recordKey];
  useEffect(()=>{
    setScores(saved?.scores||{});
    setWeights(Object.fromEntries((saved?.criteria||rubric.criteria).map(c=>[c.id,c.weight])));
    setNote(saved?.note||'');
  },[recordKey,saved?.updatedAt]);
  const criteria=rubric.criteria.map(item=>({...item,weight:Number(weights[item.id]??item.weight)}));
  const calculated=computeGradebookRubric(criteria,scores);
  const records=Object.values(gradebook.rubricRecords||{})
    .filter(item=>item?.subject===subjectKey&&item?.semester===semesterId);
  const intervention=student?.id?gradebook.interventions?.[subjectKey+':'+semesterId+':'+student.id]:null;
  const model=student?buildStudentProgressModel({
    student,students:activeStudents,semester,semesterId,subjectName,intervention,records,
  }):null;
  const history=gradebook.auditHistory||[];
  const selectedEntry=history.find(item=>item.id===entryId)||history[0]||null;
  const restoration=selectedEntry?previewGradebookHistoryRestore(gradebook,selectedEntry):null;
  const teacher=currentUser?.email||currentUser?.name||'Giáo viên';

  const submitRubric=()=>{
    if(!student||!calculated.ok||finalized)return;
    const overwrite=Boolean(saved);
    if(overwrite&&!window.confirm('Thay kết quả rubric đã lưu trong bản nháp?'))return;
    try{
      onSaveRubric({subject:subjectKey,semester:semesterId,type,activity,
        studentId:student.id,criteria,scores,note,actor:teacher});
      setMessage('Đã thêm rubric vào bản nháp Sổ điểm. Bấm Lưu bảng điểm để đồng bộ.');
    }catch(err){setMessage(err.message);}
  };
  const generatePdf=async()=>{
    if(!student||working)return;
    setWorking(true);setMessage('');
    try{
      await exportGradebookProgressPdf({student,students:activeStudents,semester,semesterId,
        subjectName,intervention,records,className:workspace?.classProfile?.className||'',
        schoolYear:workspace?.classProfile?.schoolYear||''});
      setMessage('Đã tạo phiếu tiến bộ PDF cho '+student.fullName+'.');
    }catch(err){setMessage('Lỗi xuất PDF: '+(err.message||'Không xác định'));}
    finally{setWorking(false);}
  };
  const submitRestore=()=>{
    if(dirty||!restoration?.ok||reason.trim().length<8)return;
    if(!window.confirm('Khôi phục toàn bộ '+restoration.count+' thay đổi của lần lưu đã chọn? Sẽ tạo bản nháp, KHÔNG tự lưu lên máy chủ.'))return;
    try{
      onRestoreHistory(selectedEntry,reason);
      setMessage('Đã tạo bản nháp khôi phục. Kiểm tra bảng điểm rồi bấm Lưu bảng điểm, hoặc Hoàn tác.');
      setReason('');
    }catch(err){setMessage(err.message);}
  };
  if(!['rubric','report','recovery'].includes(mode))return null;
  return <section className="gb-p3 gb-prod-pane" role="tabpanel">
    {mode!=='recovery'?<div className="gb-prod-fields"><label>Chọn học sinh
      <select value={student?.id||''} onChange={e=>{setStudentId(e.target.value);setMessage('')}}>
        {activeStudents.map(s=><option key={s.id} value={s.id}>{s.fullName} · {s.code||'—'}</option>)}
      </select></label></div>:null}
    {mode==='rubric'?<>
      <h3>Rubric Speaking & Writing</h3>
      <p>Điểm từng tiêu chí theo thang 10. Giáo viên được chỉnh trọng số (tổng 100%). Kết quả rubric được lưu độc lập, không tự ghi vào cột TX hoặc thay đổi công thức học kỳ.</p>
      <div className="gb-prod-fields">
        <label>Kỹ năng<select value={type} onChange={e=>{setType(e.target.value);setActivity(e.target.value==='speaking'?'Speaking 1':'Writing 1');setMessage('')}}>
          <option value="speaking">Speaking</option><option value="writing">Writing</option>
        </select></label>
        <label>Hoạt động<input maxLength={90} value={activity} onChange={e=>setActivity(e.target.value)} placeholder="Ví dụ: Speaking – Unit 5"/></label>
      </div>
      <div className="gb-p3-rubric" aria-label="Bảng tiêu chí chấm rubric">
        <div className="gb-p3-head"><span>Tiêu chí</span><span>Trọng số (%)</span><span>Điểm (0–10)</span></div>
        {criteria.map(item=><div className="gb-p3-criterion" key={item.id}>
          <strong>{item.label}</strong>
          <input aria-label={'Trọng số '+item.label} type="number" min="1" max="100" step="1"
            disabled={finalized} value={weights[item.id]??item.weight}
            onChange={e=>setWeights(prev=>({...prev,[item.id]:e.target.value}))}/>
          <input aria-label={'Điểm '+item.label} type="number" min="0" max="10" step="0.25"
            disabled={finalized} value={scores[item.id]??''}
            onChange={e=>setScores(prev=>({...prev,[item.id]:e.target.value}))}/>
        </div>)}
      </div>
      <div className="gb-p3-score"><span>Tổng trọng số: {criteria.reduce((n,c)=>n+Number(c.weight),0)}%</span>
        <strong>{calculated.ok?p(calculated.score)+'/10':'—'}</strong></div>
      {!calculated.ok?<p className="gb-prod-alert">{calculated.error}</p>:null}
      <label className="gb-p3-note">Nhận xét của giáo viên
        <textarea rows={3} maxLength={1200} disabled={finalized} value={note} onChange={e=>setNote(e.target.value)}
          placeholder="Ghi nhận xét dựa trên bài thực hiện và tiêu chí đánh giá"/>
      </label>
      {saved?<p className="gb-prod-existing">Đã lưu rubric ngày {new Date(saved.updatedAt).toLocaleString('vi-VN')} · {p(saved.score)}/10</p>:null}
      <div className="gb-prod-actions"><button type="button" disabled={!student||finalized||!calculated.ok} onClick={submitRubric}>Ghi rubric vào Sổ điểm</button></div>
      {finalized?<p className="gb-prod-alert">Học kỳ đã chốt; rubric ở chế độ chỉ đọc.</p>:null}
    </>:null}
    {mode==='report'?<>
      <h3>Phiếu tiến bộ học tập · PDF</h3>
      <p>Tổng hợp các đợt TX, giữa kỳ, cuối kỳ, biểu đồ kết quả, các rubric đã chấm và ghi nhận hỗ trợ. Không sinh nhận xét hoặc đánh giá bằng AI.</p>
      {model?<div className="gb-p3-stats">
        {GRADE_LABELS.map((label,i)=><div key={label}><span>{label}</span><strong>{p(model.components[i])}</strong></div>)}
      </div>:null}
      {model?<p>Đủ {model.completed}/6 thành phần · Điểm TB học kỳ hiện tại: {model.semesterAverage??'—'} · Số rubric: {model.rubricRecords.length}</p>:null}
      {dirty?<p className="gb-prod-alert">Bạn đang có thay đổi chưa lưu. PDF sẽ phản ánh dữ liệu bản nháp hiện tại.</p>:null}
      <div className="gb-prod-actions"><button type="button" disabled={!student||working} onClick={generatePdf}>{working?'Đang tạo PDF…':'Xuất phiếu tiến bộ PDF'}</button></div>
    </>:null}
    {mode==='recovery'?<>
      <h3>Khôi phục lần chỉnh sửa điểm</h3>
      <p>Chỉ có thể đảo ngược nhật ký còn đầy đủ, khi các điểm hiện tại vẫn đúng bằng giá trị sau lần lưu đó và không thuộc học kỳ đã chốt. Không xóa nhật ký. Sau khi khôi phục, giáo viên phải kiểm tra và lưu lại.</p>
      <div className="gb-prod-fields"><label>Lần lưu cần đảo ngược
        <select value={selectedEntry?.id||''} onChange={e=>{setEntryId(e.target.value);setMessage('');}}>
          {history.map(entry=><option key={entry.id} value={entry.id}>{new Date(entry.at).toLocaleString('vi-VN')} · {entry.count} ô · {entry.author}</option>)}
        </select>
      </label></div>
      {selectedEntry?<div className="gb-prod-preview">
        <strong>{restoration?.count||0} thay đổi · {restoration?.ok?'Có thể tạo bản khôi phục':'Không đủ điều kiện khôi phục'}</strong>
        {(restoration?.issues||[]).slice(0,7).map((issue,i)=><p className="gb-prod-error" key={i}>{issue}</p>)}
        <div className="gb-p3-recovery-list">{(selectedEntry.changes||[]).slice(0,24).map((change,i)=><div key={i}>
          <strong>{activeStudents.find(s=>s.id===change.studentId)?.fullName||change.studentId}</strong>
          <span>{change.subject} · {change.term} · {change.kind} {change.round!=null?'· TX '+(Number(change.round)+1):''}</span>
          <span>{String(change.to??'—')} → {String(change.from??'—')}</span>
        </div>)}</div>
        {selectedEntry.changes?.length>24?<small>Đang hiển thị 24 thay đổi đầu. Khi khôi phục sẽ xử lý toàn bộ {selectedEntry.count} thay đổi.</small>:null}
      </div>:<p>Chưa có nhật ký mới để khôi phục.</p>}
      <label className="gb-p3-note">Lý do khôi phục (ít nhất 8 ký tự)
        <textarea maxLength={300} rows={2} value={reason} disabled={dirty||!restoration?.ok}
          onChange={e=>setReason(e.target.value)} placeholder="Ví dụ: Đối chiếu bản gốc, đảo ngược lần nhập nhầm"/>
      </label>
      {dirty?<p className="gb-prod-alert">Hãy lưu hoặc Hoàn tác thay đổi chưa lưu trước khi bắt đầu khôi phục.</p>:null}
      <div className="gb-prod-actions"><button type="button" disabled={!restoration?.ok||dirty||reason.trim().length<8} onClick={submitRestore}>Xem trước & tạo bản khôi phục</button></div>
    </>:null}
    {message?<p className="gb-prod-notice" role="status">{message}</p>:null}
  </section>;
}
