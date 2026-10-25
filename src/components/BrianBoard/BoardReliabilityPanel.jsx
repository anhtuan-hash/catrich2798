import React,{useEffect,useState} from 'react';
import {ShieldCheck,Database,Wifi,WifiOff,HardDrive,RefreshCcw,Monitor,Download} from 'lucide-react';

const fmt=bytes=>typeof bytes==='number'&&Number.isFinite(bytes)?
 bytes>=1048576?(bytes/1048576).toFixed(1)+' MB':(bytes/1024).toFixed(0)+' KB':'—';
export default function BoardReliabilityPanel({saveState,presenting,lesson,vi=true,onSave,onPrivateBackup}){
 const [usage,setUsage]=useState(null),[available,setAvailable]=useState(null);
 const [online,setOnline]=useState(()=>typeof navigator!=='undefined'?navigator.onLine:true);
 const [persisted,setPersisted]=useState(null),[message,setMessage]=useState('');
 const refresh=async()=>{
  try{
   if(navigator.storage?.estimate){
    const x=await navigator.storage.estimate();
    setUsage(x.usage??null);setAvailable(x.quota??null);
    if(navigator.storage.persisted)setPersisted(await navigator.storage.persisted());
   }
  }catch(e){setMessage(vi?'Trình duyệt không hỗ trợ đọc dung lượng.':'Browser storage estimate unavailable.');}
 };
 useEffect(()=>{
  void refresh();
  const connected=()=>setOnline(true),disconnected=()=>setOnline(false);
  window.addEventListener('online',connected);window.addEventListener('offline',disconnected);
  return()=>{window.removeEventListener('online',connected);window.removeEventListener('offline',disconnected);};
 },[]);
 const secure=async()=>{
  if(!navigator.storage?.persist){
   setMessage(vi?'Trình duyệt này không hỗ trợ bảo vệ dữ liệu lưu trữ.':'Persistent storage is not supported.');return;
  }
  try{
   const ok=await navigator.storage.persist();
   setPersisted(ok);
   setMessage(ok?(vi?'Đã được cấp quyền lưu trữ bền vững.':'Persistent storage granted.'):
    (vi?'Trình duyệt chưa cấp quyền. Hãy dùng bản sao JSON.':'Not granted. Keep a private JSON backup.'));
  }catch(e){setMessage(e.message||'Storage permission error');}
 };
 return <div className="bbd-side-stack bbd-v8-reliability" aria-label="Classroom reliability">
  <div className="bbd-side-heading"><h3>{vi?'Trung tâm độ ổn định':'Classroom Reliability'}</h3><ShieldCheck size={20}/></div>
  <p>{vi?'Trạng thái trên thiết bị hiện tại. Không tự động gửi dữ liệu học sinh lên máy chủ.':
   'Current device status only. No student data is uploaded by this panel.'}</p>
  <div className="bbd-v8-health-grid">
   <div><HardDrive size={19}/><strong>{vi?'Lưu bản nháp':'Local draft'}</strong>
    <span>{saveState==='saved'?(vi?'Đã xác nhận':'Confirmed'):saveState==='saving'?(vi?'Đang lưu':'Saving'):
     saveState==='error'?(vi?'Lỗi lưu':'Save error'):(vi?'Chưa xác nhận':'Unconfirmed')}</span></div>
   <div>{online?<Wifi size={19}/>:<WifiOff size={19}/>}
    <strong>{vi?'Mạng trình duyệt':'Browser network'}</strong>
    <span>{online?'Online':'Offline'}</span></div>
   <div><Monitor size={19}/><strong>{vi?'Trình chiếu TV':'TV display'}</strong>
    <span>{presenting?(vi?'Đã mở phiên tại máy':'Local session opened'):(vi?'Chưa mở':'Not opened')}</span></div>
   <div><Database size={19}/><strong>{vi?'Bộ nhớ sử dụng':'Storage used'}</strong>
    <span>{fmt(usage)} / {fmt(available)}</span></div>
  </div>
  <p>{vi?'Bản nháp':'Lesson'}: <strong>{lesson?.title||'—'}</strong>
   {' · '+(lesson?.pages?.length||0)+' '+(vi?'trang':'pages')}</p>
  <p>{vi?'Bảo vệ lưu trữ trình duyệt':'Persistent device storage'}:
   <strong>{persisted===true?(vi?' Đã cấp quyền':' Granted'):
    persisted===false?(vi?' Chưa cấp':' Not granted'):' —'}</strong></p>
  <div className="bbd-side-actions">
   <button type="button" onClick={onSave}><HardDrive size={16}/>{vi?'Lưu ngay':'Save now'}</button>
   <button type="button" onClick={onPrivateBackup}><Download size={16}/>{vi?'Sao lưu JSON riêng':'Private JSON backup'}</button>
   <button type="button" onClick={()=>void refresh()}><RefreshCcw size={16}/>{vi?'Làm mới':'Refresh'}</button>
  </div>
  <button type="button" onClick={()=>void secure()}><ShieldCheck size={16}/>
   {vi?'Yêu cầu lưu trữ bền vững':'Request persistent storage'}</button>
  {message&&<p role="status">{message}</p>}
  <small>{vi?'Lưu ý: Online chỉ là trạng thái mạng trình duyệt, không phải xác nhận Supabase hay TV khác thiết bị.':
   'Online indicates browser connectivity, not Supabase health or remote TV pairing.'}</small>
 </div>;
}
