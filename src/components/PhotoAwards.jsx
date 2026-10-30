import React,{useCallback,useEffect,useState} from 'react';
import {Award,CheckCircle2,Clock3,Crown,LockKeyhole,RefreshCw,ShieldCheck,Trophy,X} from 'lucide-react';
import {supabase,supabaseAnonKey,supabaseUrl} from '../utils/supabase.js';
import './PhotoAwards.css';

const CUTOFF=Date.parse('2026-10-30T08:15:00Z');
const REVEAL_ORDER=[3,2,1];
const prizes=[
 {rank:2,word:'SECOND PRIZE',vi:'GIẢI NHÌ',medal:'🥈'},
 {rank:1,word:'FIRST PRIZE',vi:'GIẢI NHẤT',medal:'🥇'},
 {rank:3,word:'THIRD PRIZE',vi:'GIẢI BA',medal:'🥉'}
];
const formatNumber=value=>Number(value||0).toLocaleString('vi-VN');
const formatPoint=value=>Number(value||0).toFixed(2);
const formatTime=value=>{
 if(!value)return '';
 try{return new Intl.DateTimeFormat('vi-VN',{
  hour:'2-digit',minute:'2-digit',second:'2-digit',
  day:'2-digit',month:'2-digit',year:'numeric',
  timeZone:'Asia/Ho_Chi_Minh'
 }).format(new Date(value));}catch{return '';}
};
async function request(albumId,action,asAdmin=false){
 const headers={'Content-Type':'application/json',apikey:supabaseAnonKey};
 if(asAdmin){
  const {data:{session},error}=await supabase.auth.getSession();
  if(error||!session?.access_token)throw new Error('Vui lòng đăng nhập Admin BRIAN.');
  headers.Authorization='Bearer '+session.access_token;
 }
 const response=await fetch(supabaseUrl+'/functions/v1/photo-awards',{
  method:'POST',headers,body:JSON.stringify({albumId,action}),cache:'no-store'
 });
 const data=await response.json().catch(()=>({error:'Không nhận được phản hồi từ máy chủ.'}));
 if(!response.ok||data.error)throw new Error(data.error||'Không tải được kết quả.');
 return data;
}
function until(time){
 const seconds=Math.max(0,Math.ceil((CUTOFF-time)/1000));
 return [Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60]
  .map(number=>String(number).padStart(2,'0')).join(':');
}
function DetailedRanking({rows,en,preview=false,capturedAt,judgeCount,savedScoreCount,voteCount}){
 return <section className="brian-awards-details" aria-label={en?'Detailed ranking for all groups':'Bảng điểm chi tiết của 18 nhóm'}>
  <header className="brian-awards-details-header">
   <div>
    <span className="brian-awards-details-kicker">{preview?'LIVE DATA · PREVIEW':'OFFICIAL FINAL RESULTS'}</span>
    <h2>{en?'Full scoring breakdown — 18 groups':'Bảng điểm chi tiết — 18 nhóm'}</h2>
    <p>{en?'Jury 50% + Audience 50%':'Giám khảo 50% + Khán giả 50%'} · {formatTime(capturedAt)}</p>
   </div>
   <div className="brian-awards-details-stats">
    <span><strong>{judgeCount??0}</strong>{en?'judges scored':'giám khảo có điểm'}</span>
    <span><strong>{formatNumber(savedScoreCount??0)}</strong>{en?'saved scores':'lượt chấm đã lưu'}</span>
    <span><strong>{formatNumber(voteCount??0)}</strong>{en?'audience votes':'phiếu khán giả'}</span>
   </div>
  </header>
  <div className="brian-awards-table-scroll">
   <table className="brian-awards-table">
    <thead><tr>
     <th scope="col">{en?'Rank':'Hạng'}</th>
     <th scope="col">{en?'Class · Group':'Lớp · Nhóm'}</th>
     <th scope="col">{en?'Jury scores':'Lượt GK'}</th>
     <th scope="col">{en?'Jury /100':'GK /100'}</th>
     <th scope="col">{en?'Jury 50%':'GK 50%'}</th>
     <th scope="col">{en?'Votes':'Phiếu KH'}</th>
     <th scope="col">{en?'Audience /100':'KH /100'}</th>
     <th scope="col">{en?'Audience 50%':'KH 50%'}</th>
     <th scope="col">{en?'Final /100':'Tổng /100'}</th>
    </tr></thead>
    <tbody>
     {rows.map(item=><tr key={item.slideId} className={item.rank<=3?'brian-awards-table-top':''}>
      <td><strong>{item.rank<=3?['🥇','🥈','🥉'][item.rank-1]:String(item.rank).padStart(2,'0')}</strong></td>
      <td className="brian-awards-table-group">{item.label}</td>
      <td>{formatNumber(item.scoredCount)}</td>
      <td>{formatPoint(item.juryScore)}</td>
      <td>{formatPoint(item.juryWeighted??Number(item.juryScore)*.5)}</td>
      <td>{formatNumber(item.audienceVotes)}</td>
      <td>{formatPoint(item.audienceScore)}</td>
      <td>{formatPoint(item.audienceWeighted??Number(item.audienceScore)*.5)}</td>
      <td className="brian-awards-table-final">{formatPoint(item.finalScore)}</td>
     </tr>)}
    </tbody>
   </table>
  </div>
  <p className="brian-awards-details-note">
   {en
    ?'Jury score is the average of all saved ratings for that artwork, including unfinished ballots. An artwork with no saved jury score receives 0. Audience score is normalized against the highest valid vote count.'
    :'Điểm giám khảo là trung bình các lượt chấm đã lưu của từng tranh, kể cả phiếu chưa hoàn tất; tranh chưa có lượt chấm được 0 điểm. Điểm khán giả quy đổi theo nhóm có số phiếu hợp lệ cao nhất.'}
  </p>
 </section>;
}
export default function PhotoAwards({albumId,onClose,canPublish=false,language='vi'}){
 const en=language==='en';
 const [data,setData]=useState(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [now,setNow]=useState(Date.now());
 const [revealed,setRevealed]=useState(3);
 const [showPreviewTable,setShowPreviewTable]=useState(false);
 const refresh=useCallback(async()=>{
  const current=await request(albumId,canPublish?'admin:preview':'status',canPublish);
  setData(current);setError('');
 },[albumId,canPublish]);
 useEffect(()=>{
  let alive=true,busyPoll=false;
  const load=async()=>{
   if(busyPoll||document.hidden)return;
   busyPoll=true;
   try{
    const current=await request(albumId,canPublish?'admin:preview':'status',canPublish);
    if(alive){setData(current);setError('');}
   }catch(error){if(alive)setError(error.message);}
   finally{busyPoll=false;}
  };
  void load();
  const timer=window.setInterval(()=>{setNow(Date.now());void load();},5000);
  const onVisible=()=>{if(!document.hidden)void load();};
  const onKey=e=>{if(e.key==='Escape')onClose();};
  document.addEventListener('visibilitychange',onVisible);
  document.addEventListener('keydown',onKey);
  return()=>{
   alive=false;window.clearInterval(timer);
   document.removeEventListener('visibilitychange',onVisible);
   document.removeEventListener('keydown',onKey);
  };
 },[albumId,canPublish,onClose]);
 const done=async()=>{
  if(busy||!window.confirm(
   en?'Publish the current scores (50% jury + 50% audience)? This locks the results permanently, even if some judges are unfinished.'
   :'Công bố ngay kết quả theo dữ liệu đang có (50% giám khảo + 50% khán giả)? Kết quả sẽ khóa vĩnh viễn dù một số giám khảo chưa chấm xong.'
  ))return;
  setBusy(true);setError('');
  try{
   const published=await request(albumId,'admin:publish-now',true);
   setData(published);setRevealed(1);setShowPreviewTable(false);
  }catch(error){setError(error.message);}
  finally{setBusy(false);}
 };
 const status=data?.status;
 const isPublished=status==='published';
 const isFrozen=status==='frozen';
 const isPreview=status==='preview';
 const rows=Array.isArray(data?.rows)?data.rows:[];
 const visibleRanks=isPublished?REVEAL_ORDER.slice(0,revealed):[];
 const readyAt=now>=CUTOFF;
 const showFullTable=isPublished&&revealed>=3;
 return <div className="brian-awards-overlay" role="dialog" aria-modal="true" aria-label="Halloween Awards 2026">
  <div className="brian-awards-stars" aria-hidden="true"/>
  <header className="brian-awards-topbar">
   <div className="brian-awards-brand"><Trophy size={23}/><div><strong>BRIAN ENGLISH</strong><small>HALLOWEEN SHOWCASE 2026 · AWARDS</small></div></div>
   <div className="brian-awards-actions">
    <span className="brian-awards-rule">50% JURY <i>+</i> 50% AUDIENCE</span>
    <button type="button" onClick={()=>refresh().catch(error=>setError(error.message))}
     aria-label={en?'Refresh results':'Cập nhật kết quả'}><RefreshCw size={17}/></button>
    <button type="button" onClick={onClose}
     aria-label={en?'Close awards presentation':'Đóng màn hình trao giải'}><X size={22}/></button>
   </div>
  </header>
  <main className="brian-awards-main">
   <div className="brian-awards-heading">
    <div className="brian-awards-eyebrow"><span>✦</span> {en?'PÉTRUS KÝ SCHOOL · 30.10.2026':'TRƯỜNG TRUNG – TIỂU HỌC PÉTRUS KÝ · 30.10.2026'} <span>✦</span></div>
    <h1>HALLOWEEN <em>AWARDS</em></h1>
    <p>{en?'Celebrating creativity, imagination and teamwork':'Vinh danh những tác phẩm sáng tạo xuất sắc nhất'}</p>
   </div>
   {!isPublished&&!isFrozen&&<section className="brian-awards-wait" role="status">
    {canPublish&&isPreview
     ?<><RefreshCw size={27}/>
       <strong>{en?'Live snapshot — ready to announce now':'Bảng điểm hiện tại — có thể công bố ngay'}</strong>
       <small>{en?'Last updated':'Cập nhật lúc'} {formatTime(data.capturedAt)} · {data.savedScoreCount} {en?'saved jury scores':'lượt chấm giám khảo'} · {formatNumber(data.voteCount)} {en?'audience votes':'phiếu khán giả'}</small>
       <span className="brian-awards-live-note">{en?'Unfinished judging ballots count. Groups with no saved scores receive 0.':'Tính cả phiếu giám khảo chưa chấm xong; nhóm chưa có điểm tính 0.'}</span>
       <button className="brian-awards-primary" type="button" disabled={busy||rows.length!==18} onClick={done}>
        <Crown size={20}/>{busy?(en?'Publishing…':'Đang công bố…'):(en?'PUBLISH CURRENT RESULTS':'CÔNG BỐ KẾT QUẢ HIỆN TẠI')}
       </button>
       <button type="button" className="brian-awards-secondary" onClick={()=>setShowPreviewTable(value=>!value)}>
        <ShieldCheck size={16}/>{showPreviewTable?(en?'Hide preview table':'Ẩn bảng điểm tạm tính'):(en?'Review all 18 groups':'Kiểm tra điểm 18 nhóm')}
       </button>
      </>
     :<><Clock3 size={30}/><strong>{en?'Waiting for official results':'Đang chờ kết quả chính thức'}</strong>
       {!readyAt&&<div className="brian-awards-clock">{until(now)}</div>}
       <small>{en?'Scheduled vote closure':'Giờ đóng bình chọn'}: 15:15 · 30/10/2026 · Asia/Ho_Chi_Minh</small>
       {readyAt&&<small>{en?'Waiting for organizer to publish the results':'Đang chờ Ban tổ chức công bố kết quả'}</small>}
      </>}
   </section>}
   {isFrozen&&<section className="brian-awards-wait">
    <LockKeyhole size={29}/><strong>{en?'Results frozen — ready for ceremony':'Kết quả đã chốt — sẵn sàng công bố'}</strong>
    <small>{formatNumber(data.voteCount)} {en?'valid audience votes':'phiếu khán giả'} · {data.judgeCount} {en?'judges with saved scores':'giám khảo có điểm đã lưu'}</small>
    {canPublish&&<button className="brian-awards-primary" type="button" disabled={busy} onClick={done}>
     <Crown size={20}/>{en?'PUBLISH AWARDS':'CÔNG BỐ GIẢI THƯỞNG'}
    </button>}
   </section>}
   {isPublished&&<div className="brian-awards-podium" aria-live="polite">
    {prizes.map(prize=>{
     const winner=rows.find(row=>row.rank===prize.rank);
     const shown=Boolean(winner&&visibleRanks.includes(prize.rank));
     return <section className={'brian-awards-prize brian-awards-prize-'+prize.rank+(shown?' is-revealed':'')} key={prize.rank}>
      <div className="brian-awards-medal" aria-hidden="true">{prize.medal}</div>
      <div className="brian-awards-rank-label">{prize.word}<small>{prize.vi}</small></div>
      <div className="brian-awards-winner">
       {shown?<><img src={winner.imageUrl} alt={(en?'Artwork ':'Tranh ')+winner.label}/><strong>{winner.label}</strong>
        <span>{formatPoint(winner.finalScore)} <small>/100</small></span>
        <small>{en?'Jury':'Giám khảo'} {formatPoint(winner.juryScore)} · {en?'Audience':'Khán giả'} {formatNumber(winner.audienceVotes)} {en?'votes':'phiếu'}</small>
        </>
        :<><LockKeyhole size={25}/><strong>{en?'NOT REVEALED':'CHƯA TIẾT LỘ'}</strong><small>THE WINNER WILL BE REVEALED</small></>}
      </div>
      <div className="brian-awards-plinth">{prize.rank}</div>
     </section>;
    })}
   </div>}
   {isPublished&&<div className="brian-awards-finish"><CheckCircle2 size={18}/>
    {revealed>=3?'OFFICIAL TOP 3 · FINAL RESULTS':'THE GRAND REVEAL · '+revealed+'/3'}
   </div>}
   {canPublish&&isPublished&&revealed<3&&<button type="button" className="brian-awards-primary"
    onClick={()=>setRevealed(value=>Math.min(value+1,3))}><Award size={20}/>
    {en?'REVEAL NEXT PRIZE':'CÔNG BỐ GIẢI TIẾP THEO'}
   </button>}
   {canPublish&&isPublished&&revealed>=3&&<button type="button" className="brian-awards-secondary"
    onClick={()=>setRevealed(0)}>{en?'Replay ceremony':'Trình chiếu lại từ đầu'}</button>}
   {canPublish&&isPreview&&showPreviewTable&&rows.length===18&&
    <DetailedRanking en={en} preview rows={rows} capturedAt={data.capturedAt}
     judgeCount={data.judgeCount} savedScoreCount={data.savedScoreCount} voteCount={data.voteCount}/>}
   {showFullTable&&rows.length===18&&
    <DetailedRanking en={en} rows={rows} capturedAt={data.capturedAt}
     judgeCount={data.judgeCount} savedScoreCount={data.savedScoreCount} voteCount={data.voteCount}/>}
   {isPublished&&revealed<3&&<p className="brian-awards-table-coming">
    {en?'The full 18-group score table will appear after all three awards are revealed.':'Bảng điểm đầy đủ 18 nhóm sẽ xuất hiện sau khi công bố đủ ba giải.'}
   </p>}
   {error&&<div role="alert" className="brian-awards-error">
    {error}<button type="button" onClick={()=>refresh().catch(e=>setError(e.message))}>
     {en?'Retry':'Thử lại'}
    </button>
   </div>}
  </main>
  <footer className="brian-awards-footer">
   <span>BRIAN PHOTO STORY · HALLOWEEN SHOWCASE 2026</span>
   <span>50% JURY + 50% AUDIENCE · 30 OCT 2026</span>
  </footer>
 </div>;
}