import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,CheckCircle2,ChevronLeft,ChevronRight,Clock3,Eye,Fullscreen,HelpCircle,Lock,MonitorPlay,Pause,Play,Presentation,Printer,QrCode,RefreshCcw,ShieldCheck,Users,X} from 'lucide-react';
import {LIVE_STAGES,LIVE_PERIOD_MINUTES,LIVE_TOTAL_MINUTES} from './liveLesson.js';
import {liveStaff} from './museumLiveApi.js';
import MuseumScene from './MuseumScene.jsx';
import './museumLive.css';
const t=(lang,vi,en)=>lang==='en'?en:vi;
const link=typeof window!=='undefined'?window.location.origin+window.location.pathname+'#/gallery-create':'/#/gallery-create';
export default function MuseumLiveTeacher({data,language='vi',initialAssignment,onBack,transport=liveStaff}){
 const assignments=(data?.assignments||[]).filter(a=>a.created_by===data?.profile?.id||data?.profile?.role==='admin');
 const [assignmentId,setAssignmentId]=useState(initialAssignment||assignments[0]?.id||'');
 const [state,setState]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [showNotes,setShowNotes]=useState(false),[showQr,setShowQr]=useState(false),[qr,setQr]=useState('');
 const [spotlight,setSpotlight]=useState(null),[time,setTime]=useState(Date.now());
 const stageRef=useRef(null),activeRef=useRef(true);
 const refresh=useCallback(async()=>{
  if(!assignmentId)return;
  try{const response=await transport('state',null,{assignmentId});
    if(activeRef.current){setState(response);setError('');}
  }catch(e){if(activeRef.current)setError(e.message);}
 },[assignmentId,transport]);
 useEffect(()=>{activeRef.current=true;refresh();const id=window.setInterval(()=>{refresh();setTime(Date.now());},3000);
  return()=>{activeRef.current=false;window.clearInterval(id);};},[refresh]);
 useEffect(()=>{if(!showQr)return;let active=true;import('qrcode').then(({default:QR})=>QR.toDataURL(link,{width:220,margin:2})).then(url=>{if(active)setQr(url);}).catch(()=>{});
  return()=>{active=false;};},[showQr]);
 const session=state?.session,stage=session?.stage,groups=state?.groups||[],result=state?.result;
 const currentIndex=session?.stageIndex??0,minute=LIVE_STAGES[currentIndex]?.minutes||0;
 const elapsed=session?.stageStartedAt?Math.floor((time-Date.parse(session.stageStartedAt))/1000):0;
 const remaining=Math.max(0,minute*60-elapsed);
 const act=async(action)=>{
  if(!assignmentId||busy)return;
  if(action==='end'&&!window.confirm(t(language,'Kết thúc tiết học? Học sinh sẽ không thể tiếp tục thao tác trong phiên này.','End this lesson? Student tasks will be locked.')))return;
  setBusy(true);setError('');
  try{const payload=action==='start'?{assignmentId}:{assignmentId,action,version:session?.version};
    const out=await transport(action==='start'?'start':'control',payload);
    if(out.session)setState(prev=>({...prev,session:out.session}));
    await refresh();
  }catch(e){setError(e.message);await refresh();}
  finally{setBusy(false);}
 };
 const spotlightGroup=async groupId=>{
  setBusy(true);setError('');
  try{const r=await transport('group-gallery',null,{assignmentId,groupId});
   if(!r?.draft?.rooms?.length)throw new Error('Nhóm chưa có bản triển lãm.');
   const urls=new Map((r.artworks||[]).map(a=>[a.id,a.image_url]));
   const gallery={...r.draft,rooms:r.draft.rooms.map((room,i)=>({
    ...room,id:'class-room-'+i,exhibits:room.exhibits.map((e,j)=>({
     ...e,id:'class-exhibit-'+i+'-'+j,image_url:urls.get(e.asset_id)||'',status:'published'
    }))
   }))};
   setSpotlight({gallery,groupLabel:r.groupLabel});
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const fullscreen=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else stageRef.current?.requestFullscreen?.();};
 return <div className="bml-live-teacher" data-testid="museum-teacher-live">
  <header className="bml-heading-actions">
   <div><div className="bml-overline">{t(language,'DẠY HỌC TRỰC TIẾP · THAY THẾ POWERPOINT','LIVE CLASSROOM · TEACH WITHOUT POWERPOINT')}</div>
    <h1>Teacher Live</h1><p>{t(language,'Điều khiển toàn bộ 11 hoạt động trong 2 tiết, học sinh tham gia bằng mã nhóm.','Control all 11 activities across two lessons. Students join using group passes.')}</p></div>
   {onBack?<button className="bml-outline" type="button" onClick={onBack}><ArrowLeft size={18}/>{t(language,'Trở về','Back')}</button>:null}
  </header>
  <label className="bml-full-field bml-live-picker">{t(language,'Chọn lớp và bài học','Choose lesson / class')}
   <select value={assignmentId} onChange={e=>{setAssignmentId(e.target.value);setState(null);setSpotlight(null);}}>
    {!assignments.length?<option value="">{t(language,'Chưa có bài học được giao','No lesson assigned')}</option>:null}
    {assignments.map(a=><option value={a.id} key={a.id}>{a.title} · {a.class_scope}</option>)}
   </select></label>
  {error?<div role="alert" className="bml-banner bml-danger-banner">{error}</div>:null}
  {!assignments.length?<div className="bml-empty bml-surface"><BookOpen size={26}/>{t(language,'Hãy tạo bài học và mã nhóm trước khi mở Teacher Live.','Create a lesson and group passes first.')}</div>:null}
  {assignmentId&&!session?<div className="bml-surface bml-live-start">
   <MonitorPlay size={42}/><h2>{t(language,'Bắt đầu dạy trực tiếp','Start live teaching')}</h2>
   <p>{t(language,'Bài học có 11 màn hình tương tác, tổng cộng 90 phút (45 + 45). Giáo viên tự chuyển hoạt động.','The lesson has 11 interactive stages over 90 minutes (45 + 45). Only the teacher advances them.')}</p>
   <button type="button" disabled={busy} onClick={()=>act('start')} className="bml-primary"><Play size={19}/>{t(language,'Bắt đầu buổi dạy','Start lesson')}</button>
  </div>:null}
  {session?<div className="bml-live-workspace">
   <div className="bml-live-screen" ref={stageRef}>
    <div className="bml-live-topbar"><span><span className="bml-live-dot"/> BRIAN MUSEUM LAB · TEACHER LIVE</span>
     <div><span>{t(language,'TIẾT','PERIOD')} {stage?.period}/2</span><span>{t(language,'HOẠT ĐỘNG','ACTIVITY')} {currentIndex+1}/11</span></div></div>
    {spotlight?<div className="bml-live-spotlight">
     <div className="bml-live-spotlight-top"><strong>{t(language,'TRÌNH CHIẾU NHÓM','GROUP SPOTLIGHT')} · {spotlight.groupLabel}</strong>
      <button type="button" onClick={()=>setSpotlight(null)}><X size={18}/>{t(language,'Đóng','Close')}</button></div>
     <MuseumScene gallery={spotlight.gallery} language={language} embedded/>
    </div>:<div className="bml-live-slide">
     <div className="bml-live-section">{stage?.period===1?'PERIOD 01 · INVESTIGATE & DESIGN':'PERIOD 02 · CREATE, TEST & IMPROVE'}</div>
     <h2>{stage?.title}</h2><p className="bml-live-vietnamese">{stage?.vi}</p>
     <div className="bml-live-question">{stage?.question}</div>
     {stage?.kind==='vote'?<div className="bml-live-choices">
       {stage.options.map((opt,i)=><div key={opt}><b>{String.fromCharCode(65+i)}</b>{opt}
        {result&&session.revealed?<span>{result.options?.[i]?.count||0} / {result.n||0}</span>:null}</div>)}
      </div>:null}
     {stage?.kind==='quiz'?<div className="bml-live-quiz">
       {stage.questions?.map((q,i)=><div key={i}><strong>Q{i+1}. {q.q}</strong>
        <p>{q.choices.join('   ·   ')}</p>
        {session.revealed?<small>{t(language,'Đáp án','Answer')}: {String.fromCharCode(65+q.answer)}</small>:null}</div>)}</div>:null}
     <div className="bml-live-sentence">{stage?.sentence}</div>
     {stage?.kind==='vote'&&session.revealed&&result?<div className="bml-live-chart">
       <strong>{t(language,'KẾT QUẢ THỰC TẾ','LIVE RESULTS')} · N = {result.n} {t(language,'thiết bị nhóm','group devices')}</strong>
       {result.options?.map((o,i)=><div key={i}><span>{o.label}</span>
        <div className="bml-live-bar"><i style={{width:o.percent+'%'}}/></div><strong>{o.count} · {o.percent}%</strong></div>)}</div>:null}
     {stage?.kind==='quiz'&&session.revealed&&result?<div className="bml-live-chart">
      <strong>{t(language,'KIỂM TRA HIỂU BÀI','CHECK FOR UNDERSTANDING')} · N = {result.n} {t(language,'nhóm','groups')}</strong>
      {result.questions?.map((q,i)=><p key={i}>Q{i+1}: {q.correct}/{result.n} {t(language,'nhóm chọn đúng','groups correct')} ({q.percent}%)</p>)}</div>:null}
     {session.revealed?<div className="bml-live-explanation"><CheckCircle2 size={20}/>{stage?.expected}</div>:null}
    </div>}
    <div className="bml-live-bottom"><span><Clock3 size={20}/>{String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}</span>
     <span className={session.stageOpen?'is-open':'is-closed'}>{session.stageOpen?t(language,'ĐANG MỞ HOẠT ĐỘNG','TASK OPEN'):t(language,'HOẠT ĐỘNG CHƯA MỞ','TASK CLOSED')}</span>
     <span><Users size={18}/>{result?.n??0} {t(language,'nhóm trả lời','group responses')}</span></div>
   </div>
   <div className="bml-live-controls bml-surface">
    <div className="bml-live-control-line">
     <button className="bml-outline" disabled={busy||currentIndex===0} onClick={()=>act('previous')}><ChevronLeft size={17}/>{t(language,'Trước','Back')}</button>
     <button className="bml-primary" disabled={busy||session.status==='ended'||currentIndex===10} onClick={()=>act('next')}>{t(language,'Hoạt động tiếp','Next activity')}<ChevronRight size={17}/></button>
     <button className="bml-outline" disabled={busy||session.status==='ended'} onClick={()=>act(session.stageOpen?'close':'open')}>
      {session.stageOpen?<Lock size={18}/>:<Play size={18}/>}
      {session.stageOpen?t(language,'Khóa hoạt động','Close task'):t(language,'Mở cho học sinh','Open student task')}</button>
     <button className="bml-outline" disabled={busy||session.revealed} onClick={()=>act('reveal')}><Eye size={17}/>{t(language,'Hiện giải thích','Reveal explanation')}</button>
     <button className="bml-outline" onClick={()=>setShowQr(v=>!v)}><QrCode size={18}/> QR</button>
     <button className="bml-outline" onClick={fullscreen}><Fullscreen size={18}/>{t(language,'Toàn màn hình','Fullscreen')}</button>
    </div>
    <div className="bml-live-control-line">
     <button className="bml-text-btn" onClick={()=>setShowNotes(v=>!v)}><BookOpen size={17}/>{t(language,'Ghi chú giảng dạy','Teaching notes')}</button>
     {session.status==='paused'?<button className="bml-text-btn" onClick={()=>act('resume')}><Play size={17}/>{t(language,'Tiếp tục','Resume')}</button>:
     <button className="bml-text-btn" onClick={()=>act('pause')} disabled={session.status==='ended'}><Pause size={17}/>{t(language,'Tạm dừng','Pause')}</button>}
     <button className="bml-text-btn" onClick={refresh}><RefreshCcw size={17}/>{t(language,'Cập nhật','Refresh')}</button>
     <button className="bml-text-btn" disabled={session.status==='ended'} onClick={()=>act('end')}><Check size={17}/>{t(language,'Kết thúc bài dạy','End lesson')}</button>
     <span className="bml-live-help">{state?.needHelp||0} {t(language,'nhóm cần trợ giúp','groups requesting help')}</span>
    </div>
    {showNotes?<div className="bml-live-notes"><h3>{t(language,'GHI CHÚ RIÊNG CỦA GIÁO VIÊN','TEACHER-ONLY NOTES')}</h3>
     <p>{stage?.teaching}</p><strong>{t(language,'Kết luận/điều cần lưu ý','Expected learning')}:</strong><p>{stage?.expected}</p></div>:null}
    {showQr?<div className="bml-live-qr"><div><strong>{t(language,'Học sinh truy cập Student Creator','Students open the Creator Studio')}</strong>
     <p>{link}</p><small>{t(language,'QR chỉ dẫn đến trang vào lớp. Mã bí mật từng nhóm phải được phát riêng.','QR opens the entry page only. Private group passcodes must be distributed separately.')}</small></div>
     {qr?<img src={qr} alt="QR Student Creator" width="170" height="170"/>:null}</div>:null}
   </div>
   <section className="bml-surface bml-live-groups"><div className="bml-section-head"><div><h2>{t(language,'Nhóm học tập','Class groups')}</h2>
    <p>{t(language,'Chọn nhóm để trình chiếu bản nháp trong lớp mà không công bố ra ngoài.','Spotlight a private group draft in class without publishing it.')}</p></div></div>
    <div className="bml-live-group-list">{groups.map(g=><button type="button" key={g.id} disabled={busy} onClick={()=>spotlightGroup(g.id)}>
     <Users size={17}/>{g.label}<small>{g.state}</small><Presentation size={15}/></button>)}</div>
   </section>
  </div>:null}
 </div>;
}
