import React,{useCallback,useEffect,useState} from 'react';
import {Award,CheckCircle2,Clock3,Crown,LockKeyhole,RefreshCw,ShieldCheck,Trophy,X} from 'lucide-react';
import {supabase,supabaseAnonKey,supabaseUrl} from '../utils/supabase.js';
import './PhotoAwards.css';

const CUTOFF=Date.parse('2026-10-30T08:15:00Z');
const SHOW_ORDER=[3,2,1];
const placements=[{rank:2,word:'SECOND PRIZE',vi:'GIẢI NHÌ',medal:'🥈'},
 {rank:1,word:'FIRST PRIZE',vi:'GIẢI NHẤT',medal:'🥇'},
 {rank:3,word:'THIRD PRIZE',vi:'GIẢI BA',medal:'🥉'}];
async function request(albumId,action,protectedMode=false){
 const h={'Content-Type':'application/json',apikey:supabaseAnonKey};
 if(protectedMode){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)throw Error('Vui lòng đăng nhập Admin BRIAN.');
  h.Authorization='Bearer '+session.access_token;
 }
 const response=await fetch(supabaseUrl+'/functions/v1/photo-awards',
  {method:'POST',headers:h,body:JSON.stringify({albumId,action}),cache:'no-store'});
 const data=await response.json().catch(()=>({error:'Không nhận được phản hồi từ máy chủ.'}));
 if(!response.ok||data.error)throw Error(data.error||'Không tải được kết quả.');
 return data;
}
function until(t){
 const seconds=Math.max(0,Math.ceil((CUTOFF-t)/1000));
 return [Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60]
  .map(n=>String(n).padStart(2,'0')).join(':');
}
export default function PhotoAwards({albumId,onClose,canPublish=false,language='vi'}){
 const en=language==='en';
 const [data,setData]=useState(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [now,setNow]=useState(Date.now());
 const [revealed,setRevealed]=useState(3);
 const [showAudit,setShowAudit]=useState(false);
 const refresh=useCallback(async()=>{
  const result=await request(albumId,canPublish?'admin:status':'status',canPublish);
  setData(result);setError('');
 },[albumId,canPublish]);
 useEffect(()=>{
  let alive=true;
  const load=()=>{refresh().catch(e=>{if(alive)setError(e.message);});};
  load();
  const timer=window.setInterval(()=>{setNow(Date.now());load();},5000);
  const onKey=e=>{if(e.key==='Escape')onClose();};
  document.addEventListener('keydown',onKey);
  return()=>{alive=false;window.clearInterval(timer);document.removeEventListener('keydown',onKey);};
 },[refresh,onClose]);
 const done=async()=>{
  if(busy||!window.confirm('Xác nhận công bố kết quả chính thức đã chốt? Không thể chỉnh sửa sau khi công bố.'))return;
  setBusy(true);setError('');
  try{const result=await request(albumId,'admin:publish',true);setData(result);setRevealed(1);}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const isPublished=data?.status==='published';
 const isFrozen=data?.status==='frozen';
 const rows=Array.isArray(data?.rows)?data.rows:[];
 const visibleRanks=isPublished?SHOW_ORDER.slice(0,revealed):[];
 const readyAt=now>=CUTOFF;
 return <div className="brian-awards-overlay" role="dialog" aria-modal="true" aria-label="Halloween Awards 2026">
  <div className="brian-awards-stars" aria-hidden="true"/>
  <header className="brian-awards-topbar">
   <div className="brian-awards-brand"><Trophy size={23}/><div><strong>BRIAN ENGLISH</strong><small>OFFICIAL HALLOWEEN AWARDS</small></div></div>
   <div className="brian-awards-actions">
    <span className="brian-awards-rule">70% JURY <i>+</i> 30% AUDIENCE</span>
    <button type="button" onClick={()=>refresh().catch(e=>setError(e.message))} aria-label="Cập nhật"><RefreshCw size={17}/></button>
    <button type="button" onClick={onClose} aria-label={en?'Close awards presentation':'Đóng màn hình trao giải'}><X size={22}/></button>
   </div>
  </header>
  <main className="brian-awards-main">
   <div className="brian-awards-heading">
    <div className="brian-awards-eyebrow"><span>✦</span> {en?'PÉTRUS KÝ SCHOOL · 30.10.2026':'TRƯỜNG TRUNG – TIỂU HỌC PÉTRUS KÝ · 30.10.2026'} <span>✦</span></div>
    <h1>HALLOWEEN <em>AWARDS</em></h1>
    <p>{en?'Celebrating creativity, imagination and teamwork':'Vinh danh những tác phẩm sáng tạo xuất sắc nhất'}</p>
   </div>
   {!readyAt&&<div className="brian-awards-wait" role="status">
    <Clock3 size={30}/><strong>{en?'Official results close in':'Thời gian còn lại đến lúc chốt phiếu'}</strong>
    <div className="brian-awards-clock">{until(now)}</div>
    <small>15:15 · 30/10/2026 · Asia/Ho_Chi_Minh</small>
   </div>}
   {readyAt&&!data&&<div className="brian-awards-wait"><RefreshCw size={27}/><strong>{en?'Verifying final QRvote and jury scores…':'Đang xác minh kết quả từ QRvote và giám khảo…'}</strong></div>}
   {readyAt&&isFrozen&&<div className="brian-awards-wait">
    <LockKeyhole size={28}/>
    <strong>{canPublish?'Đã chốt 18 nhóm — sẵn sàng công bố':'Kết quả đã chốt — đang chờ Ban tổ chức công bố'}</strong>
    <small>QRvote · {canPublish?data?.voteCount?.toLocaleString('vi-VN')+' phiếu hợp lệ · '+data?.judgeCount+' phiếu giám khảo hoàn tất':'70% giám khảo + 30% khán giả'}</small>
    {canPublish&&<button className="brian-awards-primary" type="button" disabled={busy} onClick={done}>
      <Crown size={20}/>{busy?'Đang công bố…':'CÔNG BỐ GIẢI THƯỞNG'}</button>}
   </div>}
   {readyAt&&isPublished&&<div className="brian-awards-podium" aria-live="polite">
    {placements.map(item=>{
     const row=rows.find(r=>r.rank===item.rank);
     const shown=visibleRanks.includes(item.rank)&&Boolean(row);
     return <section className={'brian-awards-prize brian-awards-prize-'+item.rank+(shown?' is-revealed':'')} key={item.rank}>
      <div className="brian-awards-medal" aria-hidden="true">{item.medal}</div>
      <div className="brian-awards-rank-label">{item.word}<small>{item.vi}</small></div>
      <div className="brian-awards-winner">
       {shown?<><img src={row.imageUrl} alt={'Tranh '+row.label}/><strong>{row.label}</strong>
       <span>{Number(row.finalScore).toFixed(2)} <small>/100</small></span>
       <small>Giám khảo {Number(row.juryScore).toFixed(2)} · Khán giả {row.audienceVotes.toLocaleString('vi-VN')} phiếu</small></>
       :<><LockKeyhole size={25}/><strong>{en?'NOT REVEALED':'CHƯA TIẾT LỘ'}</strong><small>THE WINNER WILL BE REVEALED</small></>}
      </div>
      <div className="brian-awards-plinth">{item.rank}</div>
     </section>;
    })}
   </div>}
   {readyAt&&isPublished&&<div className="brian-awards-finish"><CheckCircle2 size={18}/>
    {revealed>=3?'OFFICIAL TOP 3 · FINAL RESULT':'THE GRAND REVEAL · '+revealed+'/3'}</div>}
   {canPublish&&isPublished&&revealed<3&&<button type="button" className="brian-awards-primary" onClick={()=>setRevealed(x=>Math.min(x+1,3))}><Award size={20}/>{en?'REVEAL NEXT PRIZE':'CÔNG BỐ GIẢI TIẾP THEO'}</button>}
   {canPublish&&isPublished&&revealed===3&&<button type="button" className="brian-awards-secondary" onClick={()=>setRevealed(0)}>{en?'Replay ceremony':'Trình chiếu lại từ đầu'}</button>}
   {canPublish&&rows.length===18&&<div className="brian-awards-audit">
    <button type="button" onClick={()=>setShowAudit(x=>!x)}><ShieldCheck size={16}/>{showAudit?'Ẩn bảng kiểm tra':'Kiểm tra bảng điểm 18 nhóm'}</button>
    {showAudit&&<div className="brian-awards-audit-list">
     {rows.map(r=><div key={r.slideId}><b>#{r.rank} {r.label}</b><span>GK {r.juryScore} · KH {r.audienceVotes.toLocaleString('vi-VN')} phiếu · <strong>{r.finalScore}/100</strong></span></div>)}
    </div>}
   </div>}
   {error&&<div role="alert" className="brian-awards-error">{error}<button type="button" onClick={()=>refresh().catch(e=>setError(e.message))}>Thử lại</button></div>}
  </main>
  <footer className="brian-awards-footer"><span>BRIAN PHOTO STORY · HALLOWEEN SHOWCASE 2026</span><span>OFFICIAL AUDITED RESULT • 30 OCT 2026</span></footer>
 </div>;
}