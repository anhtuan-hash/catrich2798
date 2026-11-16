import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Download,Lock,PackageCheck,X} from 'lucide-react';
import {saveBlob} from './museumDocx.js';
const STATE={issued:['Đã phát mã','Issued'],editing:['Đang làm','Editing'],submitted:['Đã nộp','Submitted'],ttcm_review:['Chờ duyệt','In review'],changes_requested:['Cần sửa','Changes requested'],approved_locked:['Đã duyệt','Approved'],published:['Đã công bố','Published'],rejected:['Trả lại','Returned']};
export default function MuseumOfflineExport({language='en',data}){
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState(''),[report,setReport]=useState(null),[ready,setReady]=useState(false);
 const abort=useRef(null),pack=useRef(null),tr=(vi,en)=>language==='en'?en:vi;
 const rows=useMemo(()=>{
  const groups=[...(data?.groups||[])].sort((a,b)=>String(a.label||'').localeCompare(String(b.label||''),undefined,{numeric:true}));
  return groups.map(group=>{
   const lesson=(data?.assignments||[]).find(item=>item.id===group.assignment_id);
   const label=STATE[group.state]||[group.state||'—',group.state||'—'];
   return {id:group.id,label:group.label||'—',classScope:lesson?.class_scope||'',museum:language==='en'?label[1]:label[0],exit:(data?.exitTickets||[]).some(item=>item.group_id===group.id)};
  });
 },[data,language]);
 useEffect(()=>()=>abort.current?.abort(),[]);
 const downloadGroup=async row=>{
  setError('');
  try{const {buildStudentWorkshopHtml}=await import('./offline/exportMuseum.js');
   const file=await buildStudentWorkshopHtml(pack.current.runtime,pack.current.snapshot,row.id);
   saveBlob(file.blob,file.filename);
  }catch(e){setError(e.message);}
 };
 const start=async()=>{
  abort.current=new AbortController();setBusy(true);setError('');setReport(null);setReady(false);pack.current=null;
  try{const {exportMuseumOffline}=await import('./offline/exportMuseum.js');
   const result=await exportMuseumOffline({signal:abort.current.signal,onProgress:setProgress,assignmentIds:(data?.assignments||[]).map(assignment=>assignment.id)});
   saveBlob(result.blob,result.filename);setReport({...result.manifest,bytes:result.blob.size});pack.current={runtime:result.runtime,snapshot:result.snapshot};setReady(true);
  }catch(e){setError(e.name==='AbortError'?tr('Đã hủy xuất.','Export cancelled.'):e.message);}
  finally{setBusy(false);setProgress('');abort.current=null;}
 };
 return <section className="bml-surface" data-testid="museum-offline-export" style={{marginBottom:20}}>
  <div className="bml-section-head"><div><h2><Lock size={20}/> {tr('Xuất ứng dụng offline · dữ liệu đóng băng','Export offline application · frozen data')}</h2>
   <p>{tr('Mở tệp HTML trên máy để xem và trình diễn Museum Lab. Khóa thêm, sửa, xóa và gửi dữ liệu.','Open the HTML file locally to browse and present Museum Lab. Adding, editing, deleting and submitting are locked.')}</p></div></div>
  <p>{tr('Gói gồm bản giáo viên và đủ bài thực hành của từng nhóm. Dừng cập nhật dữ liệu trong lúc xuất.','The archive includes the teacher app and one frozen student workshop for every group. Pause data updates while exporting.')}</p>
  <div className="bml-frozen-board">
   <div className="bml-section-head"><div><h3>{tr('Bảng bài thực hành','Student workshop board')}</h3>
    <p>{rows.length} {tr('nhóm · mỗi nhóm một bài đã đóng băng','groups · one frozen workshop each')}</p></div></div>
   <div className="bml-frozen-table-wrap">
    <table className="bml-frozen-table">
     <thead><tr><th>#</th><th>{tr('Nhóm','Group')}</th><th>{tr('Lớp','Class')}</th><th>{tr('Bảo tàng','Museum')}</th><th>Exit ticket</th><th>{tr('Tệp','File')}</th></tr></thead>
     <tbody>{rows.map((row,index)=><tr key={row.id}><td>{String(index+1).padStart(2,'0')}</td><td>{row.label}</td><td>{row.classScope}</td><td>{row.museum}</td><td>{row.exit?tr('Đã nộp','Submitted'):tr('Chưa có','None')}</td>
       <td>{ready?<button type="button" className="bml-outline" onClick={()=>downloadGroup(row)}>{tr('Tải bài','Download')}</button>:tr('Trong gói ZIP','Inside the ZIP')}</td></tr>)}{!rows.length?<tr><td colSpan={6}>{tr('Chưa có nhóm để đóng gói.','No groups to package yet.')}</td></tr>:null}</tbody>
    </table>
   </div>
  </div>
  <button className="bml-primary" type="button" disabled={busy||!data?.assignments?.length} onClick={start}><Download size={18}/>{tr('Tải gói hội thi · giáo viên + '+rows.length+' bài học sinh','Download contest pack · teacher + '+rows.length+' student workshops')}</button>
  {busy?<><p role="status" aria-live="polite">{progress}</p><button type="button" className="bml-outline" onClick={()=>abort.current?.abort()}><X size={16}/>{tr('Hủy','Cancel')}</button></>:null}
  {error?<p role="alert" className="bml-banner bml-danger-banner">{error}</p>:null}
  {report?<div role="status" className="bml-banner bml-info-banner"><PackageCheck size={20}/><div>
   <strong>{tr('Đã xuất bản dữ liệu đóng băng','Frozen archive exported')}</strong>
   <p>{report.counts.lessons} lessons · {report.counts.groups} groups · {report.counts.studentWorkshops||0} student workshops · {report.counts.exhibitions} exhibitions · {(report.bytes/1048576).toFixed(1)} MB</p>
   <p>{tr('Giải nén ZIP. Mở PetrusKy_Museum_Offline.html cho bản giáo viên, hoặc hoc-sinh/index.html để quản 10 bài học sinh.','Extract the ZIP. Open PetrusKy_Museum_Offline.html for the teacher app, or hoc-sinh/index.html to manage the student workshops.')}</p>
  </div></div>:null}
 </section>;
}