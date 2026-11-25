import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Eye,Lock,PackageCheck,X} from 'lucide-react';
import {useMuseumFilePreview} from './MuseumFilePreview.jsx';
import {isAsean} from './aseanLesson.js';
import {groupWorkshopRows} from './offline/workshopRows.js';
import MuseumWorkshopBoard from './MuseumWorkshopBoard.jsx';
const exportStages={
 runtime:['Đang tải ứng dụng ngoại tuyến','Loading the offline app'],
 records:['Đang đọc hồ sơ lớp','Reading classroom records'],
 exhibitions:['Đang tải triển lãm và ảnh','Downloading exhibits and images'],
 lessons:['Đang lưu dữ liệu bài dạy','Saving lesson data'],
 groups:['Đã lưu dữ liệu nhóm','Group data collected'],
 packaging:['Đang kiểm tra và đóng gói','Verifying and packaging'],
 compression:['Đang nén tệp ZIP','Compressing the ZIP'],
 ready:['Gói ZIP đã sẵn sàng','ZIP ready'],
};
export default function MuseumOfflineExport({language='en',data,transport,renderLayout,mobileAction}){
 const preview=useMuseumFilePreview();
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState({stage:'runtime',percent:0}),[error,setError]=useState(''),[report,setReport]=useState(null),[ready,setReady]=useState(false);
 const abort=useRef(null),pack=useRef(null),tr=(vi,en)=>language==='en'?en:vi;
 const rows=useMemo(()=>groupWorkshopRows({staff:data??undefined}),[data]);
 useEffect(()=>()=>abort.current?.abort(),[]);
 const previewArchive=()=>{
  const archive=pack.current;
  setError('');
  if(archive)preview({
   blob:archive.blob,filename:archive.filename,entries:archive.entries,
   title:tr('Gói hội thi ngoại tuyến','Offline contest pack'),
  });
 };
 const previewGroup=async row=>{
  const archive=pack.current;
  if(!archive)return;
  setError('');
  try{const {buildStudentWorkshopHtml}=await import('./offline/exportMuseum.js');
   const file=await buildStudentWorkshopHtml(archive.runtime,archive.snapshot,row.id);
   preview({...file,interactive:true,title:tr('Bài thực hành · ','Workshop · ')+row.label});
  }catch(e){setError(e.message);}
 };
 const start=async()=>{
  abort.current=new AbortController();setBusy(true);setProgress({stage:'runtime',percent:0});setError('');setReport(null);setReady(false);pack.current=null;
  try{const {exportMuseumOffline}=await import('./offline/exportMuseum.js');
   const result=await exportMuseumOffline({signal:abort.current.signal,onProgress:setProgress,staff:transport,
    assignmentIds:(data?.assignments||[]).map(assignment=>assignment.id)});
   pack.current=result;
   setReport({...result.manifest,bytes:result.blob.size});setReady(true);
   previewArchive();
  }catch(e){
   abort.current?.abort();
   if(e.name==='AbortError')setError(tr('Đã hủy xuất.','Export cancelled.'));
   else if(e.code==='OFFLINE_CONTEST_LIMIT')setError(tr('Hồ sơ vượt ngưỡng an toàn 45 MB; không xuất tệp vượt giới hạn.','Contest pack exceeds the 45 MB safety limit; oversized download blocked.'));
   else if(e.code==='OFFLINE_ARTWORK_LIMIT')setError(tr(
    'Ảnh vẫn vượt giới hạn 180 MB sau khi tối ưu để xuất ngoại tuyến.',
    'The optimized artwork still exceeds the 180 MB offline export limit.',
   ));
   else setError(e.message);
  }
  finally{setBusy(false);abort.current=null;}
 };
 const board=<MuseumWorkshopBoard rows={rows} language={language} editorial={Boolean(renderLayout)} asean={isAsean(data?.lessonTemplate)} mobileAction={mobileAction}
  action={{label:tr('Tệp','File'),render:row=>ready
   ?<button type="button" className="bml-outline" onClick={()=>previewGroup(row)}>{tr('Xem tệp','View file')}</button>
   :tr('Trong gói ZIP','Inside the ZIP')}}/>;
 const download=(
  <button className={renderLayout?'bml-primary asean-dossier-download':'bml-primary'} type="button"
    disabled={busy||!data?.assignments?.length} onClick={start}><Eye size={22} aria-hidden="true"/>
    {busy
     ? tr('Đang tạo gói ZIP…','Preparing the ZIP…')
     : renderLayout
     ? tr('Xem gói hội thi (.zip ≤ 45 MB)','Preview contest pack (.zip ≤ 45 MB)')
     : tr('Xem gói hội thi · giáo viên + '+rows.length+' bài học sinh','Preview contest pack · teacher + '+rows.length+' student workshops')}
  </button>
 );
 const progressLabel=tr('Tiến trình xuất gói ZIP','ZIP export progress');
 const stageLabel=tr(...exportStages[progress.stage]);
 const stageCount=progress.stage==='groups'?` · ${progress.completed}/${progress.total}`:'';
 const feedback=<>
  {busy?<div className="bml-offline-export-progress">
   <progress max={100} value={progress.percent} aria-label={progressLabel}/>
   <div className="bml-offline-export-stage">
    <span>{stageLabel}{stageCount}</span><strong>{progress.percent}%</strong>
   </div>
   <button type="button" className="bml-outline" onClick={()=>abort.current?.abort()}><X size={16}/>{tr('Hủy','Cancel')}</button>
  </div>:null}
  {error?<p role="alert" className="bml-banner bml-danger-banner">{error}</p>:null}
  {report?<div role="status" className="bml-banner bml-info-banner"><PackageCheck size={20}/><div>
   <strong>{tr('Gói ZIP đã sẵn sàng','ZIP ready')} · 100%</strong>
   <p>{report.counts.lessons} lessons · {report.counts.groups} groups · {report.counts.studentWorkshops||0} student workshops · {report.counts.mobileWorkshops||0} mobile · {report.counts.exhibitions} exhibitions · {(report.bytes/1000000).toFixed(2)} MB ZIP</p>
   {report.counts.mobileWorkshops>0?<p>{tr('Bản mobile ngoại tuyến: mở mobile/index.html sau khi giải nén.','Offline mobile views: open mobile/index.html after extracting.')}</p>:null}
   <p>{tr('Tổng sau giải nén','Total extracted size')}: {(report.totalUncompressedBytes/1000000).toFixed(2)} MB / 45 MB</p>
   <p>{tr('Giải nén ZIP. Mở PetrusKy_Museum_Offline.html cho bản giáo viên, hoặc hoc-sinh/index.html để xem bài của các nhóm.','Extract the ZIP. Open PetrusKy_Museum_Offline.html for the teacher app, or hoc-sinh/index.html to view the student workshops.')}</p>
   <button type="button" className="bml-outline" onClick={previewArchive}>
    <Eye size={16} aria-hidden="true"/>{tr('Xem lại tệp ZIP','Preview the ZIP again')}
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
      `Gồm bản giáo viên, ${rows.length} bài thực hành và bản mobile của các nhóm đã công bố.`,
      `Includes the teacher app, ${rows.length} student workshops and published mobile views.`,
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
