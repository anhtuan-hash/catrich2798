import React,{useCallback,useEffect,useState} from 'react';
import {Award,CheckCircle2,Clock3,Crown,Eye,LockKeyhole,RefreshCw,Save,Settings2,ShieldCheck,Trophy,X} from 'lucide-react';
import {supabase,supabaseAnonKey,supabaseUrl} from '../utils/supabase.js';
import './PhotoAwards.css';

const DEFAULT_CLOSE='2026-10-30T08:15:00Z';
const DEFAULT_ANNOUNCE='2026-10-30T08:20:00Z';
const vnLocal=value=>value?new Date(Date.parse(value)+7*3600000).toISOString().slice(0,16):'';
const vietnamIso=value=>{
 if(!/^2026-10-30T\d{2}:\d{2}$/.test(value||''))throw new Error('Chỉ thiết lập thời gian ngày 30/10/2026.');
 const date=new Date(value+':00+07:00');
 if(!Number.isFinite(date.getTime()))throw new Error('Ngày giờ không hợp lệ.');
 return date.toISOString();
};
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
async function request(albumId,action,asAdmin=false,extra={}){
 const headers={'Content-Type':'application/json',apikey:supabaseAnonKey};
 if(asAdmin){
  const {data:{session},error}=await supabase.auth.getSession();
  if(error||!session?.access_token)throw new Error('Vui lòng đăng nhập Admin BRIAN.');
  headers.Authorization='Bearer '+session.access_token;
 }
 const response=await fetch(supabaseUrl+'/functions/v1/photo-awards',{
  method:'POST',headers,body:JSON.stringify({albumId,action,...extra}),cache:'no-store'
 });
 const data=await response.json().catch(()=>({error:'Không nhận được phản hồi từ máy chủ.'}));
 if(!response.ok||data.error)throw new Error(data.error||'Không tải được kết quả.');
 return data;
}
function until(time,target){
 const seconds=Math.max(0,Math.ceil((Date.parse(target)-time)/1000));
 return [Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60]
  .map(number=>String(number).padStart(2,'0')).join(':');
}
function DetailedRanking({rows,en,preview=false,capturedAt,judgeCount,savedScoreCount,voteCount}){
 return <section className="brian-awards-details" aria-label={en?'Detailed ranking for all groups':'Bảng điểm chi tiết của 18 nhóm'}>
  <header className="brian-awards-details-header">
   <div>
    <span className="brian-awards-details-kicker">{preview?'LIVE DATA · PREVIEW':'OFFICIAL FINAL RESULTS'}</span>
    <h2>{en?'Full scoring breakdown — 18 groups':'Bảng điểm chi tiết — 18 nhóm'}</h2>
    <p>{en?'Jury 80% + Audience 20%':'Giám khảo 80% + Khán giả 20%'} · {formatTime(capturedAt)}</p>
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
     <th scope="col">{en?'Jury 80%':'GK 80%'}</th>
     <th scope="col">{en?'Votes':'Phiếu KH'}</th>
     <th scope="col">{en?'Audience /100':'KH /100'}</th>
     <th scope="col">{en?'Audience 20%':'KH 20%'}</th>
     <th scope="col">{en?'Final /100':'Tổng /100'}</th>
    </tr></thead>
    <tbody>
     {rows.map(item=><tr key={item.slideId} className={item.rank<=3?'brian-awards-table-top':''}>
      <td><strong>{item.rank<=3?['🥇','🥈','🥉'][item.rank-1]:String(item.rank).padStart(2,'0')}</strong></td>
      <td className="brian-awards-table-group">{item.label}</td>
      <td>{formatNumber(item.scoredCount)}</td>
      <td>{formatPoint(item.juryScore)}</td>
      <td>{formatPoint(item.juryWeighted??Number(item.juryScore)*.8)}</td>
      <td>{formatNumber(item.audienceVotes)}</td>
      <td>{formatPoint(item.audienceScore)}</td>
      <td>{formatPoint(item.audienceWeighted??Number(item.audienceScore)*.2)}</td>
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
 const [serverOffset,setServerOffset]=useState(0);
 const [previewCeremony,setPreviewCeremony]=useState(false);
 const [showSettings,setShowSettings]=useState(false);
 const [voteDraft,setVoteDraft]=useState('');
 const [announceDraft,setAnnounceDraft]=useState('');
 const [savingSettings,setSavingSettings]=useState(false);
 const [settingsMessage,setSettingsMessage]=useState('');
 const [revealed,setRevealed]=useState(3);
 const [showPreviewTable,setShowPreviewTable]=useState(false);
 const refresh=useCallback(async()=>{
  const current=await request(albumId,canPublish?'admin:preview':'status',canPublish);
  setData(current);setServerOffset(Date.parse(current.serverNow||new Date().toISOString())-Date.now());setError('');
 },[albumId,canPublish]);
 useEffect(()=>{
  let alive=true,busyPoll=false;
  const load=async()=>{
   if(busyPoll||document.hidden)return;
   busyPoll=true;
   try{
    const current=await request(albumId,canPublish?'admin:preview':'status',canPublish);
    if(alive){setData(current);setServerOffset(Date.parse(current.serverNow||new Date().toISOString())-Date.now());setError('');}
   }catch(error){if(alive)setError(error.message);}
   finally{busyPoll=false;}
  };
  void load();
  const timer=window.setInterval(()=>{void load();},5000);
  const seconds=window.setInterval(()=>setNow(Date.now()),1000);
  const onVisible=()=>{if(!document.hidden)void load();};
  const onKey=e=>{if(e.key==='Escape')onClose();};
  document.addEventListener('visibilitychange',onVisible);
  document.addEventListener('keydown',onKey);
  return()=>{
   alive=false;window.clearInterval(timer);window.clearInterval(seconds);
   document.removeEventListener('visibilitychange',onVisible);
   document.removeEventListener('keydown',onKey);
  };
 },[albumId,canPublish,onClose]);
 const previewNow=()=>{
  if(!canPublish||!Array.isArray(data?.rows)||data.rows.length!==18)return;
  setPreviewCeremony(true);setRevealed(1);setShowPreviewTable(false);
 };
 const openSettings=()=>{
  setVoteDraft(vnLocal(data?.voteCloseAt||DEFAULT_CLOSE));
  setAnnounceDraft(vnLocal(data?.announceAt||DEFAULT_ANNOUNCE));
  setSettingsMessage('');setShowSettings(value=>!value);
 };
 const saveSettings=async()=>{
  if(savingSettings)return;
  setSavingSettings(true);setError('');setSettingsMessage('');
  try{
   const voteCloseAt=vietnamIso(voteDraft);
   const announceAt=vietnamIso(announceDraft);
   if(Date.parse(announceAt)<Date.parse(voteCloseAt))throw new Error(en?'Announcement cannot precede vote closure.':'Giờ công bố phải sau hoặc bằng giờ chốt phiếu.');
   const updated=await request(albumId,'admin:schedule',true,{voteCloseAt,announceAt});
   setData(prev=>({...prev,...updated}));
   setSettingsMessage(en?'Schedule saved across all accounts. QRvote closure must be updated separately.':'Đã lưu lịch đồng bộ trên BRIAN. Giờ đóng phiếu QRvote cần cài riêng trên QRvote.');
  }catch(error){setError(error.message);}
  finally{setSavingSettings(false);}
 };
 const status=data?.status;
 const isPublished=status==='published';
 const isFrozen=status==='frozen';
 const isPreview=status==='preview';
 const rows=Array.isArray(data?.rows)?data.rows:[];
 const isCeremony=isPublished||(isPreview&&previewCeremony);
 const visibleRanks=isCeremony?REVEAL_ORDER.slice(0,revealed):[];
 const realNow=now+serverOffset;
 const voteCloseAt=data?.voteCloseAt||DEFAULT_CLOSE;
 const announceAt=data?.announceAt||DEFAULT_ANNOUNCE;
 const showFullTable=isCeremony&&revealed>=3;
 return <div className="brian-awards-overlay" role="dialog" aria-modal="true" aria-label="Halloween Awards 2026">
  <div className="brian-awards-stars" aria-hidden="true"/>
  <header className="brian-awards-topbar">
   <div className="brian-awards-brand"><Trophy size={23}/><div><strong>BRIAN ENGLISH</strong><small>HALLOWEEN SHOWCASE 2026 · AWARDS</small></div></div>
   <div className="brian-awards-actions">
    <span className="brian-awards-rule">80% JURY <i>+</i> 20% AUDIENCE</span>
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
   <div className="brian-awards-countdowns">
    <div className="brian-awards-countdown">
     <Clock3 size={21}/><span>{en?'BRIAN VOTE SNAPSHOT':'GIỜ CHỐT KẾT QUẢ BRIAN'}</span>
     <strong>{until(realNow,voteCloseAt)}</strong>
     <small>{formatTime(voteCloseAt)} · ICT</small>
    </div>
    <div className="brian-awards-countdown">
     <Trophy size={21}/><span>{en?'AWARDS ANNOUNCEMENT':'GIỜ CÔNG BỐ GIẢI'}</span>
     <strong>{until(realNow,announceAt)}</strong>
     <small>{formatTime(announceAt)} · ICT</small>
    </div>
   </div>
   {canPublish&&<section className="brian-awards-settings-wrap">
    <button type="button" className="brian-awards-secondary" onClick={openSettings}>
     <Settings2 size={16}/>{showSettings?(en?'Hide schedule settings':'Ẩn cài đặt thời gian'):(en?'Configure voting & awards schedule':'Cài đặt giờ đóng phiếu và công bố')}
    </button>
    {showSettings&&<div className="brian-awards-schedule">
     <label>{en?'BRIAN voting result cutoff (ICT)':'Giờ chốt kết quả BRIAN (giờ VN)'}
      <input type="datetime-local" value={voteDraft} min="2026-10-30T00:00" max="2026-10-30T23:59"
       onChange={event=>setVoteDraft(event.target.value)} disabled={savingSettings||isFrozen||isPublished}/>
     </label>
     <label>{en?'Official awards announcement (ICT)':'Giờ công bố chính thức (giờ VN)'}
      <input type="datetime-local" value={announceDraft} min="2026-10-30T00:00" max="2026-10-30T23:59"
       onChange={event=>setAnnounceDraft(event.target.value)} disabled={savingSettings||isFrozen||isPublished}/>
     </label>
     <button type="button" className="brian-awards-save" disabled={savingSettings||isFrozen||isPublished} onClick={saveSettings}>
      <Save size={16}/>{savingSettings?(en?'Saving…':'Đang lưu…'):(en?'Save schedule':'Lưu thời gian')}
     </button>
     <p>{en?'This schedule controls BRIAN result finalization and announcement only. To stop accepting votes, set the matching close time separately in QRvote.'
      :'Lịch này điều khiển việc chốt kết quả và công bố trên BRIAN. Muốn cổng QRvote thực sự ngừng nhận phiếu, cần đặt cùng giờ đóng trực tiếp trong QRvote.'}
      {' '}<a href="https://qrvote.org/c/halloween-showcase-ry29" target="_blank" rel="noopener noreferrer">QRvote</a>.
     </p>
     {isPreview&&data?.providerCloseAt&&Math.abs(Date.parse(data.providerCloseAt)-Date.parse(voteCloseAt))>1000&&
      <p className="brian-awards-schedule-warning">{en?'QRvote currently closes at':'QRvote hiện đặt đóng lúc'} {formatTime(data.providerCloseAt)}. {en?'Please align it with BRIAN.':'Hãy đồng bộ giờ trên QRvote.'}</p>}
     {settingsMessage&&<p role="status">{settingsMessage}</p>}
    </div>}
   </section>}
   {isPreview&&!previewCeremony&&canPublish&&<section className="brian-awards-wait" role="status">
     <Eye size={28}/>
     <strong>{en?'Live results — private ceremony preview':'Bảng xếp hạng hiện tại — xem thử trao giải'}</strong>
     <small>{en?'Updated':'Cập nhật'} {formatTime(data.capturedAt)} · {data.savedScoreCount} {en?'saved jury scores':'lượt chấm giám khảo'} · {formatNumber(data.voteCount)} {en?'audience votes':'phiếu khán giả'}</small>
     <span className="brian-awards-live-note">{en?'Preview only: does not close voting, freeze scores, save or announce winners.':'Chỉ xem thử: không đóng bình chọn, không lưu hoặc khóa điểm, không công bố giải chính thức.'}</span>
     <button type="button" className="brian-awards-primary" onClick={previewNow}><Eye size={20}/>{en?'PREVIEW AWARDS NOW':'XEM THỬ TRAO GIẢI NGAY'}</button>
     <button type="button" className="brian-awards-secondary" onClick={()=>setShowPreviewTable(value=>!value)}><ShieldCheck size={16}/>
       {showPreviewTable?(en?'Hide live score table':'Ẩn bảng điểm tạm tính'):(en?'View 18 groups':'Xem điểm 18 nhóm')}
     </button>
    </section>}
   {!isPreview&&!isFrozen&&!isPublished&&<section className="brian-awards-wait" role="status">
     <Clock3 size={28}/>
     <strong>{en?'Waiting for final results':'Đang chờ chốt kết quả'}</strong>
     <small>{en?'Voting closes':'Giờ dự kiến đóng phiếu'}: {formatTime(voteCloseAt)}</small>
     <small>{en?'Awards announced':'Giờ công bố'}: {formatTime(announceAt)}</small>
     {data?.pendingReason&&<p className="brian-awards-live-note">{data.pendingReason}</p>}
    </section>}
   {isFrozen&&<section className="brian-awards-wait">
     <LockKeyhole size={28}/>
     <strong>{en?'Results locked — awaiting scheduled announcement':'Kết quả đã chốt — chờ giờ công bố'}</strong>
     <small>{formatNumber(data.voteCount)} {en?'valid votes':'phiếu hợp lệ'} · {data.judgeCount} {en?'judges have saved scores':'giám khảo có điểm đã lưu'}</small>
    </section>}
   {isPreview&&previewCeremony&&<div className="brian-awards-preview-ribbon">
    <Eye size={19}/>{en?'LIVE PREVIEW · NOT OFFICIAL · SCORES MAY CHANGE':'XEM THỬ · CHƯA CÔNG BỐ CHÍNH THỨC · ĐIỂM CÓ THỂ THAY ĐỔI'}
    <button type="button" onClick={()=>{setPreviewCeremony(false);setRevealed(3);}}>{en?'Exit preview':'Thoát xem thử'}</button>
   </div>}
   {isCeremony&&<div className="brian-awards-podium" aria-live="polite">
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
   {isCeremony&&<div className="brian-awards-finish"><CheckCircle2 size={18}/>
    {isPreview?'LIVE PREVIEW · NOT OFFICIAL':revealed>=3?'OFFICIAL TOP 3 · FINAL RESULTS':'THE GRAND REVEAL · '+revealed+'/3'}
   </div>}
   {canPublish&&isCeremony&&revealed<3&&<button type="button" className="brian-awards-primary"
    onClick={()=>setRevealed(value=>Math.min(value+1,3))}><Award size={20}/>
    {en?'REVEAL NEXT PRIZE':'CÔNG BỐ GIẢI TIẾP THEO'}
   </button>}
   {canPublish&&isCeremony&&revealed>=3&&<button type="button" className="brian-awards-secondary"
    onClick={()=>setRevealed(0)}>{en?'Replay ceremony':'Trình chiếu lại từ đầu'}</button>}
   {canPublish&&isPreview&&showPreviewTable&&rows.length===18&&
    <DetailedRanking en={en} preview rows={rows} capturedAt={data.capturedAt}
     judgeCount={data.judgeCount} savedScoreCount={data.savedScoreCount} voteCount={data.voteCount}/>}
   {showFullTable&&rows.length===18&&
    <DetailedRanking en={en} preview={isPreview} rows={rows} capturedAt={data.capturedAt}
     judgeCount={data.judgeCount} savedScoreCount={data.savedScoreCount} voteCount={data.voteCount}/>}
   {isCeremony&&revealed<3&&<p className="brian-awards-table-coming">
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
   <span>80% JURY + 20% AUDIENCE · 30 OCT 2026</span>
  </footer>
 </div>;
}