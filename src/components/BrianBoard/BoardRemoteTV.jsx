import React,{useEffect,useState} from 'react';
import {Monitor,RefreshCcw,X,ShieldCheck,Wifi,WifiOff} from 'lucide-react';
import BoardCanvas from './BoardCanvas.jsx';
import BoardActivityPublicPreview from './BoardActivityPublicPreview.jsx';
import {BoardClassroomLivePublic} from './BoardClassroomLive.jsx';
import {authorizeSameOwner,createRemoteViewerChannel,closeRemoteChannel} from './boardRemoteTV.js';
import './BoardRemoteTV.css';

export default function BoardRemoteTV({ownerId,vi=true}){
 const [status,setStatus]=useState('connecting'),[payload,setPayload]=useState(null);
 const [error,setError]=useState('');
 useEffect(()=>{
  let active=true,channel=null;
  const join=async()=>{
   try{
    await authorizeSameOwner(ownerId);
    if(!active)return;
    channel=createRemoteViewerChannel(ownerId,{
     onStatus:(state,err)=>{if(active){setStatus(state);if(err)setError(err.message||String(err));}},
     onSnapshot:message=>{if(active){setPayload(message.payload);setStatus('SUBSCRIBED');}},
     onEnd:()=>{if(active){setPayload(null);setStatus('ENDED');}}
    });
   }catch(e){if(active){setStatus('error');setError(e.message||'Authentication required');}}
  };
  void join();
  return()=>{active=false;void closeRemoteChannel(channel);};
 },[ownerId]);
 const leave=()=>{window.history.replaceState(null,'',window.location.pathname);
  window.location.reload();};
 const viewport=payload?.viewport||{x:0,y:0,width:1600,height:900};
 const zoom=1600/Math.max(200,Number(viewport.width)||1600);
 const page=payload?.page;
 return <div className={'bbd-remote-tv bbd-theme-'+(payload?.theme||'ivory')} role="main"
  aria-label={vi?'Màn hình TV đã đăng nhập':'Authenticated remote classroom TV'}>
  <header className="bbd-remote-tv__header">
   <div><Monitor size={22}/><strong>BRIAN BOARD · LIVE TV</strong>
    <span>{payload?.title||'Classroom Display'}</span></div>
   <div className="bbd-remote-tv__indicators"><small>
    {status==='SUBSCRIBED'?<Wifi size={14}/>:<WifiOff size={14}/>}
    {status==='SUBSCRIBED'?(vi?'Đã ghép nối':'Paired'):
     status==='ENDED'?(vi?'Đã ngắt':'Session ended'):(vi?'Đang kết nối':'Connecting')}</small>
    <button type="button" onClick={leave}><X size={17}/>{vi?'Rời màn hình':'Exit'}</button></div>
  </header>
  <main className="bbd-remote-tv__surface">
   {payload?.classroom?<BoardClassroomLivePublic snapshot={payload.classroom} vi={vi}/>:
    payload?.activity&&page?<div className="bbd-remote-tv__activity">
     <BoardActivityPublicPreview activity={payload.activity} live={payload.live} vi={vi}/></div>:
    page?<div className="bbd-remote-tv__canvas">
     <BoardCanvas key={page.id} page={page} studentView tool="pan" vi={vi}
      zoom={zoom} camera={{x:Number(viewport.x)||0,y:Number(viewport.y)||0}}/></div>:
    <div className="bbd-remote-tv__empty">
     {status==='error'?<WifiOff size={44}/>:<Monitor size={44}/>}
     <h2>{status==='error'?(vi?'Không thể kết nối':'Connection unavailable'):
      (vi?'Đang chờ giáo viên chia sẻ':'Waiting for the teacher to share')}</h2>
     <p>{error||(vi?'Đăng nhập cùng tài khoản giáo viên và bật TV khác thiết bị trong Brian Board.':
      'Sign in with the same approved teacher account and enable remote TV in Brian Board.')}</p>
    </div>}
  </main>
  <footer className="bbd-remote-tv__footer">
   <ShieldCheck size={17}/>{vi?'Chỉ hiển thị dữ liệu đã lọc cho học sinh · Kênh riêng đã xác thực · Giới hạn 20 phút':
    'Student-safe payload · Authenticated private channel · 20-minute limit'}
  </footer>
 </div>;
}
