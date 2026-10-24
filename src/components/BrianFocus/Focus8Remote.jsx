import React,{useEffect,useState} from 'react';
import QRCode from 'qrcode';
import {createFocus8Remote,getFocus8Remote,revokeFocus8Remote,sendFocus8RemoteCommand} from './focus8Cloud.js';

const commands=[
 ['timer-toggle','⏯','Hẹn giờ','Timer'],['timer-reset','↺','Đặt lại','Reset'],
 ['clock-next','◷','Đồng hồ','Clock'],['classroom-toggle','▣','Lớp học','Classroom'],
 ['mood-next','☀','Bầu không khí','Mood'],['scene-next','▰','Cảnh kế','Next scene'],
 ['focus-close','×','Đóng Focus','Close Focus']
];
function parseHash(){
 const query=(window.location.hash.split('?')[1]||'');
 const q=new URLSearchParams(query);
 return {id:q.get('focusRemote')||'',code:q.get('pairCode')||''};
}
export function Focus8RemoteClient({userId,language='vi',onClose}){
 const vi=language!=='en';
 const [target]=useState(parseHash);
 const [status,setStatus]=useState('');
 const [ready,setReady]=useState(false);
 useEffect(()=>{
  let alive=true;
  getFocus8Remote(userId,target.id,target.code).then(()=>{if(alive)setReady(true);})
   .catch(error=>{if(alive)setStatus(error.message);});
  return()=>{alive=false;};
 },[userId,target.id,target.code]);
 const send=async type=>{
  try{setStatus(vi?'Đang gửi…':'Sending…');await sendFocus8RemoteCommand(userId,target.id,target.code,{type});
    setStatus(vi?'Đã gửi lệnh':'Command sent');
  }catch(error){setStatus(error.message);}
 };
 return <section className="bfc8-remote-client" role="dialog" aria-modal="true" aria-label="Brian Focus Remote">
  <header><strong>BRIAN FOCUS · REMOTE</strong><button onClick={onClose} aria-label={vi?'Đóng điều khiển':'Close remote'}>×</button></header>
  <p>{vi?'Điện thoại điều khiển Focus của cùng tài khoản đã đăng nhập. Phiên tự hết hạn sau 10 phút.':'Controls the signed-in account’s Focus; session expires in ten minutes.'}</p>
  {!ready?<p role="status">{status|| (vi?'Đang xác thực phiên…':'Verifying session…')}</p>:<>
    <div className="bfc8-remote-client__grid">{commands.map(([id,icon,vn,en])=>
      <button type="button" key={id} onClick={()=>send(id)}><span>{icon}</span>{vi?vn:en}</button>)}</div>
    <p role="status" aria-live="polite">{status}</p>
   </>}
 </section>;
}
export default function Focus8RemoteHost({userId,language='vi',onCommand}){
 const vi=language!=='en';
 const [session,setSession]=useState(null),[qr,setQr]=useState(''),[error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [lastSeq,setLastSeq]=useState(0);
 const [link,setLink]=useState('');
 const create=async()=>{
  setBusy(true);setError('');
  try{
   if(session)await revokeFocus8Remote(userId,session.id);
   const s=await createFocus8Remote(userId);
   const url=location.origin+location.pathname+'#/dashboard?focusRemote='+encodeURIComponent(s.id)+'&pairCode='+encodeURIComponent(s.code);
   setLink(url);setQr(await QRCode.toDataURL(url,{width:200,margin:1,errorCorrectionLevel:'M'}));
   setSession(s);setLastSeq(s.seq);
  }catch(e){setError(e.message);}
  finally{setBusy(false);}
 };
 const end=async()=>{
  if(!session)return;
  try{await revokeFocus8Remote(userId,session.id);setSession(null);setQr('');setLink('');}
  catch(e){setError(e.message);}
 };
 useEffect(()=>{
  if(!session)return undefined;
  let alive=true;
  const poll=async()=>{
   try{
    const s=await getFocus8Remote(userId,session.id,session.code);
    if(!alive)return;
    if(s.seq>lastSeq){setLastSeq(s.seq);onCommand?.(s.command);}
   }catch(e){if(alive){setError(e.message);setSession(null);}}
  };
  const id=setInterval(poll,1700);
  return()=>{alive=false;clearInterval(id);};
 },[session?.id,lastSeq,userId,onCommand]);
 useEffect(()=>()=>{if(session?.id)revokeFocus8Remote(userId,session.id).catch(()=>{});},[session?.id,userId]);
 return <div className="bfc8-stack">
  <h3>{vi?'Companion Remote':'Companion Remote'}</h3>
  <p>{vi?'Cả MacBook và điện thoại phải đăng nhập cùng tài khoản. Mã có hiệu lực 10 phút; bạn có thể thu hồi bất cứ lúc nào.':'Both devices must sign in to the same account. Pairing expires after 10 minutes and can be revoked.'}</p>
  <div className="bfc8-actions"><button type="button" onClick={create} disabled={busy}>{vi?'Tạo mã ghép QR':'Generate pairing QR'}</button>
  {session&&<button type="button" onClick={end}>{vi?'Thu hồi phiên':'Revoke pairing'}</button>}</div>
  {qr&&<div className="bfc8-qr"><img alt="Pair Focus remote" src={qr}/><small>{vi?'Quét bằng điện thoại sau khi đăng nhập ứng dụng':'Scan on a signed-in phone'}</small>
   <button type="button" onClick={()=>navigator.clipboard?.writeText(link)}>{vi?'Sao chép liên kết':'Copy pairing URL'}</button></div>}
  {error&&<p role="alert">{error}</p>}
  <small>{vi?'Không tạo quyền admin mới. Lệnh chỉ điều khiển phiên Focus của chính tài khoản.':'No new admin privileges; commands affect only the authenticated account’s Focus.'}</small>
 </div>;
}
