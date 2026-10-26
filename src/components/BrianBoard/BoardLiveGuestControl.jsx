import React,{useEffect,useState,useRef} from 'react';
import QRCode from 'qrcode';
import {QrCode,Copy,Users,Check, X,Pause,Play,Square,Download,RefreshCw,ShieldCheck} from 'lucide-react';
import {createGuestRoom,teacherRoomState,controlTeacherRoom,removeFinishedGuestRoom,restoreGuestRoom,safeGuestShareUrl}
 from './boardLiveApi.js';
import './BoardLiveGuestControl.css';
const csvCell=x=>{
 const s=String(x??'');
 const safe=/^[=+@\-\t\r]/.test(s)?'\''+s:s;
 return '"'+safe.replaceAll('"','""')+'"';
};
export default function BoardLiveGuestControl({session,onProjection,onReset,vi=true}){
 const [room,setRoom]=useState(null),[qr,setQr]=useState(''),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[message,setMessage]=useState('');
 const roomId=room?.id;
 useEffect(()=>{
  let active=true;
  void restoreGuestRoom().then(data=>{if(active&&data)sendProjection(data);})
   .catch(e=>{if(active)setError(e.message||'Unable to restore previous session');});
  return()=>{active=false;};
 },[]);
 const onProjectionRef=useRef(onProjection);onProjectionRef.current=onProjection;
 const sendProjection=(data)=>{
  setRoom(data);
  onProjectionRef.current?.(data);
 };
 const refresh=async(id=roomId)=>{
  if(!id)return;
  try{const data=await teacherRoomState(id);sendProjection(data);return data;}
  catch(e){setError(e.message||'Unable to read classroom session');}
 };
 useEffect(()=>{
  if(!roomId||room?.status==='closed')return;
  let active=true;
  const tick=async()=>{
   if(!active||document.hidden)return;
   try{const data=await teacherRoomState(roomId);if(active)sendProjection(data);}
   catch(e){if(active)setError(e.message||'Refresh failed');}
  };
  const id=setInterval(()=>void tick(),5000);
  return()=>{active=false;clearInterval(id);};
 },[roomId,room?.status]);
 useEffect(()=>{
  if(!room?.code)return;
  let active=true;
  QRCode.toDataURL(safeGuestShareUrl(room.code),{margin:2,width:256,errorCorrectionLevel:'M'})
   .then(data=>{if(active)setQr(data);}).catch(()=>{if(active)setQr('');});
  return()=>{active=false;};
 },[room?.code]);
 const create=async()=>{
  if(!session||busy)return;
  setBusy(true);setError('');setMessage('');
  try{
   const info=await createGuestRoom(session);
   const data=await teacherRoomState(info.id);sendProjection(data);
   setMessage(vi?'Đã tạo mã tham gia an toàn. Chiếu QR cho học sinh.':
    'Secure join code created. Show the QR to students.');
  }catch(e){setError(e.message||'Unable to create guest room');}
  finally{setBusy(false);}
 };
 const control=async(action,id=null,value=null)=>{
  if(!roomId||busy)return;
  setBusy(true);setError('');
  try{sendProjection(await controlTeacherRoom(roomId,action,id,value));}
  catch(e){setError(e.message||'Unable to update session');}
  finally{setBusy(false);}
 };
 const copy=async()=>{
  if(!room?.code)return;
  const url=safeGuestShareUrl(room.code);
  try{await navigator.clipboard.writeText(url);setMessage(vi?'Đã sao chép liên kết':'Link copied');}
  catch{window.prompt(vi?'Sao chép địa chỉ':'Copy join URL',url);}
 };
 const download=()=>{
  if(!room)return;
  const rows=[['Mode','Question','Option','Count','Approved text','Status'],
   ...(room.mode==='poll'?(room.options||[]).map((label,i)=>[room.mode,room.question,label,room.votes?.[i]||0,'','']):
    (room.entries||[]).map(row=>[room.mode,room.question,'',0,row.text||'',row.status]))];
  const csv='\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='brian-live-'+room.code+'.csv';
  link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
 };
 const pending=(room?.entries||[]).filter(x=>x.status==='pending');
 const isActive=room?.status==='live'||room?.status==='paused';
 return <section className="bbd-live-guest-control" aria-label={vi?'Mã QR và quản lý phản hồi học sinh':'Student QR and classroom moderation'}>
  <h3><QrCode size={18}/> {vi?'Tham gia từ điện thoại học sinh':'Student-device classroom join'}</h3>
  <p>{vi?'Học sinh quét QR và gửi phiếu hoặc ý kiến. Hệ thống giới hạn tối đa 60 học sinh, 45 phút và 3 lượt/người. Word Cloud/Sticky Wall cần giáo viên duyệt.':
   'Students join by QR, up to 60 devices, 45 minutes and 3 entries per participant. Text submissions require moderation.'}</p>
  {!room?<button className="bbd-live-guest-primary" type="button" disabled={busy||!session||session.status==='closed'}
    onClick={()=>void create()}><QrCode size={16}/>
    {busy?(vi?'Đang tạo phiên…':'Creating session…'):
     (vi?'Tạo mã QR cho học sinh':'Create student QR session')}</button>:
   <>
    <div className="bbd-live-guest-join">
     <div className="bbd-live-guest-qr">
      {qr?<img src={qr} alt={vi?'Mã QR tham gia phiên lớp học':'Student session QR code'}/>:
       <span>{vi?'Đang tạo QR…':'Generating QR…'}</span>}
     </div>
     <div className="bbd-live-guest-code"><small>CLASSROOM CODE</small>
      <strong>{room.code?.toUpperCase()}</strong>
      <span>{room.participants||0} / 60 {vi?'học sinh':'participants'}</span>
      <span>{room.status==='live'?(vi?'Đang hoạt động':'Active'):
       room.status==='paused'?(vi?'Tạm dừng':'Paused'):(vi?'Đã kết thúc':'Ended')}</span>
      <button onClick={()=>void copy()}><Copy size={15}/>{vi?'Sao chép link':'Copy link'}</button>
     </div>
    </div>
    <div className="bbd-live-guest-actions">
     <button onClick={()=>void control(isActive&&room.status==='live'?'pause':'resume')}
      disabled={busy||!isActive}>{room.status==='live'?<Pause size={16}/>:<Play size={16}/>}
      {room.status==='live'?(vi?'Tạm dừng':'Pause'):(vi?'Tiếp tục':'Resume')}</button>
     <button onClick={()=>void control('results',null,!room.showResults)} disabled={busy||room.status==='closed'}>
      {room.showResults?(vi?'Ẩn kết quả':'Hide results'):(vi?'Hiện kết quả':'Show results')}</button>
     <button onClick={()=>void refresh()} disabled={busy}><RefreshCw size={15}/>{vi?'Cập nhật':'Refresh'}</button>
     <button onClick={download}><Download size={15}/>{vi?'Xuất CSV':'Export CSV'}</button>
     {room.status==='closed'&&<button type="button" disabled={busy} onClick={()=>{
      if(!window.confirm(vi?'Xóa vĩnh viễn phiên và toàn bộ ý kiến/phiếu bầu?':'Permanently delete session and all responses?'))return;
      setBusy(true);setError('');
      void removeFinishedGuestRoom(room.id).then(()=>{
       setRoom(null);setQr('');onReset?.();
      }).catch(e=>setError(e.message||'Deletion failed')).finally(()=>setBusy(false));
     }}>{vi?'Xóa dữ liệu phiên':'Delete room data'}</button>}
     {room.status==='closed'&&<button type="button" onClick={()=>{
      setRoom(null);setQr('');setMessage('');setError('');onReset?.();
     }}><QrCode size={15}/>{vi?'Hoạt động mới':'New activity'}</button>}
     <button onClick={()=>{
      if(window.confirm(vi?'Kết thúc phiên và ngừng nhận phản hồi mới?':'Close session and block new responses?'))
       void control('close');
     }} disabled={busy||room.status==='closed'}><Square size={15}/>{vi?'Kết thúc':'End'}</button>
    </div>
    {room.mode==='poll'?<div className="bbd-live-guest-tally">
     {(room.options||[]).map((label,i)=><div key={i}>
      <strong>{String.fromCharCode(65+i)}. {label}</strong>
      <span>{room.votes?.[i]||0}</span>
     </div>)}
    </div>:
    <div className="bbd-live-guest-moderation">
     <h4>{vi?'Chờ duyệt':'Pending moderation'} ({pending.length})</h4>
     {pending.length===0&&<p>{vi?'Hiện chưa có nội dung chờ duyệt.':'No pending submissions.'}</p>}
     {pending.map(item=><div key={item.id}>
      <span>{item.text}</span>
      <button type="button" disabled={busy} onClick={()=>void control('approve',item.id)} aria-label={vi?'Duyệt':'Approve'}><Check size={17}/></button>
      <button type="button" disabled={busy} onClick={()=>void control('reject',item.id)} aria-label={vi?'Từ chối':'Reject'}><X size={17}/></button>
     </div>)}
     <small>{(room.entries||[]).filter(x=>x.status==='approved').length} {vi?'phản hồi đã duyệt':'approved entries'}</small>
    </div>}
   </>}
  {message&&<p role="status" className="bbd-live-guest-message">{message}</p>}
  {error&&<p role="alert" className="bbd-live-guest-error">{error}</p>}
  <small className="bbd-live-guest-foot"><ShieldCheck size={14}/>
   {vi?'Mã phiên hết hạn tự động; không yêu cầu họ tên và không cấp quyền truy cập dữ liệu lớp.':
    'Expiring room codes; no student identity or access to school records required.'}</small>
 </section>;
}
