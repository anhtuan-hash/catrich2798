import React,{useEffect,useRef,useState} from 'react';
import {Download,Lock,PackageCheck,X} from 'lucide-react';
import {saveBlob} from './museumDocx.js';
export default function MuseumOfflineExport({language='en'}){
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState(''),[report,setReport]=useState(null);
 const abort=useRef(null),tr=(vi,en)=>language==='en'?en:vi;
 useEffect(()=>()=>abort.current?.abort(),[]);
 const start=async()=>{
  abort.current=new AbortController();setBusy(true);setError('');setReport(null);
  try{const {exportMuseumOffline}=await import('./offline/exportMuseum.js');
   const result=await exportMuseumOffline({signal:abort.current.signal,onProgress:setProgress});
   saveBlob(result.blob,result.filename);setReport({...result.manifest,bytes:result.blob.size});
  }catch(e){setError(e.name==='AbortError'?tr('Đã hủy xuất.','Export cancelled.'):e.message);}
  finally{setBusy(false);setProgress('');abort.current=null;}
 };
 return <section className="bml-surface" data-testid="museum-offline-export" style={{marginBottom:20}}>
  <div className="bml-section-head"><div><h2><Lock size={20}/> {tr('Xuất ứng dụng offline · dữ liệu đóng băng','Export offline application · frozen data')}</h2>
   <p>{tr('Mở tệp HTML trên máy để xem và trình diễn Museum Lab. Khóa thêm, sửa, xóa và gửi dữ liệu.','Open the HTML file locally to browse and present Museum Lab. Adding, editing, deleting and submitting are locked.')}</p></div></div>
  <p>{tr('Gói gồm giao diện, bài học, bài nộp, ảnh, dữ liệu khảo sát/góp ý được phép đọc và triển lãm 2D/3D. Dừng cập nhật dữ liệu trong lúc xuất. Người nhận tệp có thể xem toàn bộ nội dung được đóng gói.','Includes the interface, authorized lessons, submissions, images, recorded survey/feedback evidence and 2D/3D exhibitions. Pause data updates while exporting. Anyone receiving the file can read its packaged content.')}</p>
  <p><small>{tr('YouTube và trang ngoài cần Internet; giọng đọc offline cần giọng Anh Mỹ cài sẵn. Tệp xuất không chứa mã đăng nhập hoặc mã bí mật của nhóm.','YouTube and external pages require Internet; offline voiceover needs an installed local US English voice. Login credentials and group passcodes are excluded.')}</small></p>
  <button className="bml-primary" type="button" disabled={busy} onClick={start}><Download size={18}/>{tr('Tải ứng dụng offline (.zip)','Download offline application (.zip)')}</button>
  {busy?<><p role="status" aria-live="polite">{progress}</p><button type="button" className="bml-outline" onClick={()=>abort.current?.abort()}><X size={16}/>{tr('Hủy','Cancel')}</button></>:null}
  {error?<p role="alert" className="bml-banner bml-danger-banner">{error}</p>:null}
  {report?<div role="status" className="bml-banner bml-info-banner"><PackageCheck size={20}/><div>
   <strong>{tr('Đã xuất bản dữ liệu đóng băng','Frozen archive exported')}</strong>
   <p>{report.counts.lessons} lessons · {report.counts.groups} groups · {report.counts.exhibitions} exhibitions · {(report.bytes/1048576).toFixed(1)} MB</p>
   <p>{tr('Giải nén và mở BRIAN_Museum_Offline.html. Bản kê nguồn gốc và giới hạn nằm trong manifest.json.','Extract the ZIP and open BRIAN_Museum_Offline.html. Capture details and limitations are listed in manifest.json.')}</p>
  </div></div>:null}
 </section>;
}
