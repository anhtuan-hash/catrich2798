import React,{useEffect,useState} from 'react';
import QRCode from 'qrcode';
import {readPresenter} from './focus9Presenter.js';

const remaining=(deadline,now)=>Math.max(0,Math.ceil(((Number(deadline)||0)-now)/1000));
const format=seconds=>String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');

export default function Focus9Viewer({userId,id,language='vi',onClose}){
 const vi=language!=='en';
 const [state,setState]=useState(null),[error,setError]=useState('');
 const [now,setNow]=useState(Date.now()),[qr,setQr]=useState('');
 useEffect(()=>{
  let alive=true;
  const fetchState=async()=>{
   if(!navigator.onLine){if(alive)setError(vi?'Mất kết nối; dữ liệu có thể cũ.':'Offline; presentation may be stale.');return;}
   try{const result=await readPresenter(userId,id);if(alive){setState(result);setError('');}}
   catch(e){if(alive){setState(null);setError(e.message);}}
  };
  void fetchState();
  const interval=setInterval(()=>{if(!document.hidden)void fetchState();},3000);
  return()=>{alive=false;clearInterval(interval);};
 },[id,userId,vi]);
 useEffect(()=>{const interval=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(interval);},[]);
 useEffect(()=>{
  let mounted=true;setQr('');
  if(state?.link?.startsWith('https://'))QRCode.toDataURL(state.link,{margin:1,width:210})
    .then(source=>{if(mounted)setQr(source);}).catch(()=>{});
  return()=>{mounted=false;};
 },[state?.link]);
 return <main className="bfc9-viewer" role="main" aria-label="Brian Focus presenter display">
  <button type="button" className="bfc9-viewer__close" onClick={onClose} aria-label={vi?'Thoát màn hình chiếu':'Close presenter'}>×</button>
  <div className="bfc9-viewer__content">
   <small>BRIAN FOCUS · PRESENTER BRIDGE</small>
   {!state?<h2>{error||(vi?'Đang kết nối màn hình giáo viên…':'Connecting to teacher display…')}</h2>:<>
    <h1>{state.objective||(vi?'Không gian học tập':'Classroom focus')}</h1>
    <p>{state.activity||''}</p>
    {state.deadline>0&&<strong role="timer">{format(remaining(state.deadline,now))}</strong>}
    {state.timerDeadline>0&&<div className="bfc9-viewer__secondary">{vi?'Thời gian Focus':'Focus timer'}: {format(remaining(state.timerDeadline,now))}</div>}
    {qr&&<img src={qr} width="180" height="180" alt={vi?'Mã QR học liệu':'Resource QR'}/>}
   </>}
   {error&&state&&<p role="status">{error}</p>}
  </div>
 </main>;
}
