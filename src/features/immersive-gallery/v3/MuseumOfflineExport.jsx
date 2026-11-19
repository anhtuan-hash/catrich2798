import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Download,Lock,PackageCheck,X} from 'lucide-react';
import {saveBlob} from './museumDocx.js';
import {isAsean} from './aseanLesson.js';
import {groupWorkshopRows} from './offline/workshopRows.js';
import MuseumWorkshopBoard from './MuseumWorkshopBoard.jsx';
export default function MuseumOfflineExport({language='en',data,transport,renderLayout,mobileAction}){
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState(''),[report,setReport]=useState(null),[ready,setReady]=useState(false);
 const [compressionPercent,setCompressionPercent]=useState(null);
 const abort=useRef(null),pack=useRef(null),tr=(vi,en)=>language==='en'?en:vi;
 const rows=useMemo(()=>groupWorkshopRows({staff:data??undefined}),[data]);
 useEffect(()=>()=>abort.current?.abort(),[]);
 const downloadArchive=()=>{
  const archive=pack.current;
  setError('');
  try{if(archive)saveBlob(archive.blob,archive.filename);}
  catch(e){setError(e.message);}
 };
 const downloadGroup=async row=>{
  setError('');
  try{const {buildStudentWorkshopHtml}=await import('./offline/exportMuseum.js');
   const file=await buildStudentWorkshopHtml(pack.current.runtime,pack.current.snapshot,row.id);
   saveBlob(file.blob,file.filename);
  }catch(e){setError(e.message);}
 };
 const start=async()=>{
  abort.current=new AbortController();setBusy(true);setProgress(tr('Đang chuẩn bị gói ZIP…','Preparing the ZIP…'));setError('');setReport(null);setReady(false);pack.current=null;
  setCompressionPercent(null);
  try{const {exportMuseumOffline}=await import('./offline/exportMuseum.js');
   const result=await exportMuseumOffline({signal:abort.current.signal,onProgress:setProgress,onCompressionProgress:setCompressionPercent,staff:transport,
    assignmentIds:(data?.assignments||[]).map(assignment=>assignment.id)});
   pack.current=result;
   setReport({...result.manifest,bytes:result.blob.size});setReady(true);
   downloadArchive();
  }catch(e){setError(e.name==='AbortError'?tr('Đã hủy xuất.','Export cancelled.'):e.message);}
  finally{setBusy(false);setProgress('');abort.current=null;}
 };
 const board=<MuseumWorkshopBoard rows={rows} language={language} editorial={Boolean(renderLayout)} asean={isAsean(data?.lessonTemplate)} mobileAction={mobileAction}
  action={{label:tr('Tệp','File'),render:row=>ready
   ?<button type="button" className="bml-outline" onClick={()=>downloadGroup(row)}>{tr('Tải bài','Download')}</button>
   :tr('Trong gói ZIP','Inside the ZIP')}}/>;
 const download=(
  <button className={renderLayout?'bml-primary asean-dossier-download':'bml-primary'} type="button"
    disabled={busy||!data?.assignments?.length} onClick={start}><Download size={22} aria-hidden="true"/>
    {busy
     ? tr('Đang tạo gói ZIP…','Preparing the ZIP…')
     : renderLayout
     ? tr('Tải gói hội thi (.zip)','Download contest pack (.zip)')
     : tr('Tải gói hội thi · giáo viên + '+rows.length+' bài học sinh','Download contest pack · teacher + '+rows.length+' student workshops')}
  </button>
 );
 const progressLabel=tr('Tiến trình xuất gói ZIP','ZIP export progress');
 const status= compressionPercent===null
  ? progress
  : tr(`Đang nén ZIP · ${compressionPercent}%`,`Compressing ZIP · ${compressionPercent}%`);
 const feedback=<>
  {busy?<div className="bml-offline-export-progress">
   <progress max={100} value={compressionPercent??undefined} aria-label={progressLabel}/>
   <p role={compressionPercent===null?'status':undefined}>{status}</p>
   <button type="button" className="bml-outline" onClick={()=>abort.current?.abort()}><X size={16}/>{tr('Hủy','Cancel')}</button>
  </div>:null}
  {error?<p role="alert" className="bml-banner bml-danger-banner">{error}</p>:null}
  {report?<div role="status" className="bml-banner bml-info-banner"><PackageCheck size={20}/><div>
   <strong>{tr('Gói ZIP đã sẵn sàng','ZIP ready to download')}</strong>
   <p>{report.counts.lessons} lessons · {report.counts.groups} groups · {report.counts.studentWorkshops||0} student workshops · {report.counts.exhibitions} exhibitions · {(report.bytes/1048576).toFixed(1)} MB</p>
   <p>{tr('Giải nén ZIP. Mở PetrusKy_Museum_Offline.html cho bản giáo viên, hoặc hoc-sinh/index.html để xem bài của các nhóm.','Extract the ZIP. Open PetrusKy_Museum_Offline.html for the teacher app, or hoc-sinh/index.html to view the student workshops.')}</p>
   <button type="button" className="bml-outline" onClick={downloadArchive}>
    <Download size={16} aria-hidden="true"/>{tr('Tải lại tệp ZIP','Download the ZIP again')}
   </button>
  </div></div>:null}
 </>;
 if(renderLayout){
  return <div className="asean-dossier-layout" data-testid="museum-offline-export">
   {renderLayout({
    board,
    download:<div className="asean-dossier-pack">
     {download}
     {feedback}
     <p>{tr(
      `Gồm bản giáo viên và ${rows.length} bài thực hành của các nhóm.`,
      `Includes the teacher app and ${rows.length} student workshops.`,
     )}</p>
     <p>{tr('Tạm dừng cập nhật dữ liệu trong lúc xuất.','Pause data updates while exporting.')}</p>
    </div>,
   })}
  </div>;
 }
 return <section className="bml-surface" data-testid="museum-offline-export" style={{marginBottom:20}}>
  <div className="bml-section-head"><div><h2><Lock size={20}/> {tr('Xuất ứng dụng offline · dữ liệu đóng băng','Export offline application · frozen data')}</h2>
   <p>{tr('Mở tệp HTML trên máy để xem và trình diễn Museum Lab. Khóa thêm, sửa, xóa và gửi dữ liệu.','Open the HTML file locally to browse and present Museum Lab. Adding, editing, deleting and submitting are locked.')}</p></div></div>
  <p>{tr('Gói gồm bản giáo viên và đủ bài thực hành của từng nhóm. Dừng cập nhật dữ liệu trong lúc xuất.','The archive includes the teacher app and one frozen student workshop for every group. Pause data updates while exporting.')}</p>
  {board}
  {download}
  {feedback}
 </section>;
}
