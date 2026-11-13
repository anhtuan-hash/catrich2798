import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,CheckCircle2,ChevronLeft,ChevronRight,Clock3,Eye,Fullscreen,HelpCircle,Lock,MonitorPlay,Pause,Play,Presentation,Printer,QrCode,RefreshCcw,ShieldCheck,Users,X,Film,Volume2,Sparkles,Minimize2} from 'lucide-react';
import {LIVE_STAGES,LIVE_PERIOD_MINUTES,LIVE_TOTAL_MINUTES} from './liveLesson.js';
import {liveStaff} from './museumLiveApi.js';
import {englishSystemGroupLabel} from './museumApi.js';
import LessonResources from './LessonResources.jsx';
import {surveyChartPng} from './surveyChart.js';
import {saveBlob} from './museumDocx.js';
import MuseumScene from './MuseumScene.jsx';
import MuseumLivePaperArt from './MuseumLivePaperArt.jsx';
import MuseumLivePaperCards from './MuseumLivePaperCards.jsx';
import MuseumVoiceover from './MuseumVoiceover.jsx';
import MuseumResourceHub from './MuseumResourceHub.jsx';
import MuseumVideoLab,{MuseumVideoFrame} from './MuseumVideoLab.jsx';
import MuseumFullscreenDock from './MuseumFullscreenDock.jsx';
import {MICRO_CHALLENGES} from './museumLiveExtensions.js';
import './museumLive.css';
import './museumLivePaper.css';
import './museumLiveCompetition.css';
import './museumLivePresenter.css';
const t=(lang,vi,en)=>lang==='en'?en:vi;
const link=typeof window!=='undefined'?window.location.origin+window.location.pathname+'#/gallery-create':'/#/gallery-create';
export default function MuseumLiveTeacher({data,language='vi',initialAssignment,onBack,transport=liveStaff}){
 const assignments=(data?.assignments||[]).filter(a=>a.created_by===data?.profile?.id||data?.profile?.role==='admin');
 const [assignmentId,setAssignmentId]=useState(initialAssignment||assignments[0]?.id||'');
 const [state,setState]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [showNotes,setShowNotes]=useState(false),[showResources,setShowResources]=useState(false),[showQr,setShowQr]=useState(false),[qr,setQr]=useState('');
 const [showVoiceover,setShowVoiceover]=useState(false),[showVideoLab,setShowVideoLab]=useState(false);
 const [motionOn,setMotionOn]=useState(true),[stageVideo,setStageVideo]=useState(null);
 const [isFullscreen,setIsFullscreen]=useState(false),[activeTool,setActiveTool]=useState(null),[presenterFocus,setPresenterFocus]=useState(false);
 const [spotlight,setSpotlight]=useState(null),[time,setTime]=useState(Date.now());
 const [paper,setPaper]=useState(false),[tally,setTally]=useState(['','','','']),[tallyNote,setTallyNote]=useState('');
 const freeze=async()=>{setBusy(true);setError('');try{await transport('freeze-survey',{assignmentId,version:state.session.version,...(paper?{counts:tally.map(v=>v===''?null:Number(v)),note:tallyNote}:{})});await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}};
 const stageRef=useRef(null),activeRef=useRef(true);
 useEffect(()=>{
  const sync=()=>{
   const active=document.fullscreenElement===stageRef.current;
   setIsFullscreen(active);
   if(!active)setActiveTool(null);
  };
  document.addEventListener('fullscreenchange',sync);
  return()=>document.removeEventListener('fullscreenchange',sync);
 },[]);
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
 const session=state?.session,stage=session?.stage,groups=(state?.groups||[]).map(g=>({...g,label:language==='en'?englishSystemGroupLabel(g.label):g.label})),result=session?.stageIndex===2&&state?.survey?state.survey:state?.result;
 const currentIndex=session?.stageIndex??0,minute=LIVE_STAGES[currentIndex]?.minutes||0;
 useEffect(()=>{setStageVideo(null);},[assignmentId,currentIndex]);
 const elapsed=(session?.elapsedSeconds||0)+(session?.status==='active'&&session?.stageStartedAt?Math.max(0,Math.floor((time-Date.parse(session.stageStartedAt))/1000)):0);
 const remaining=Math.max(0,minute*60-elapsed);
 const act=async(action)=>{
  if(!assignmentId||busy)return;
  if(action==='end'&&!window.confirm(t(language,'Kết thúc tiết học? Học sinh sẽ không thể tiếp tục thao tác trong phiên này.','End this lesson? Student tasks will be locked.')))return;
  setBusy(true);setError('');
  try{const payload=action==='start'?{assignmentId}:{assignmentId,action,version:session?.version};
    const out=await transport(action==='start'?'start':'control',payload);
    if(out.session)setState(prev=>({...prev,session:out.session}));
    await refresh();
  }catch(e){setError(e.message);}
  finally{setBusy(false);}
 };
 // Voiceover scripts are teacher resources until explicitly shared for the open stage.
 const shareNarration=async()=>{
  if(busy||!session||session.status==='ended')return;
  setBusy(true);setError('');
  try{
   const send=version=>transport('media-voice',{assignmentId,stageIndex:currentIndex,version,enabled:!session.media?.voiceEnabled});
   let out;
   try{out=await send(session.version);}
   catch(e){
    if(e.status!==409)throw e;
    const latest=await transport('state',null,{assignmentId});
    if(latest.session?.stageIndex!==currentIndex)throw new Error('The activity changed. Reopen the narration tool.');
    out=await send(latest.session.version);
   }
   if(out.session)setState(prev=>({...prev,session:out.session}));
   await refresh();
  }catch(e){setError(e.message);}
  finally{setBusy(false);}
 };
 const spotlightGroup=async groupId=>{
  setBusy(true);setError('');
  try{const r=await transport('group-gallery',null,{assignmentId,groupId});
   if(!r?.draft?.rooms?.length)throw new Error(t(language,'Nhóm chưa có bản triển lãm.','This group has not created a museum draft yet.'));
   const urls=new Map((r.artworks||[]).map(a=>[a.id,a.image_url]));
   const gallery={...r.draft,rooms:r.draft.rooms.map((room,i)=>({
    ...room,id:'class-room-'+i,exhibits:room.exhibits.map((e,j)=>({
     ...e,id:'class-exhibit-'+i+'-'+j,image_url:urls.get(e.asset_id)||'',status:'published'
    }))
   }))};
   setSpotlight({gallery,groupLabel:language==='en'?englishSystemGroupLabel(r.groupLabel):r.groupLabel});
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const fullscreen=async()=>{
  try{
   if(document.fullscreenElement===stageRef.current)await document.exitFullscreen?.();
   else if(document.fullscreenElement)await document.exitFullscreen?.();
   else if(stageRef.current?.requestFullscreen)await stageRef.current.requestFullscreen();
   else setError(t(language,'Trình duyệt không hỗ trợ chế độ toàn màn hình.','Fullscreen mode is unavailable in this browser.'));
  }catch(e){setError(t(language,'Không thể mở toàn màn hình. Hãy cho phép chế độ toàn màn hình trên trình duyệt.','Fullscreen was blocked. Please enable it in your browser.'));}
 };
 const togglePresenterTool=key=>{
  if(key==='qr')setShowQr(true);
  setActiveTool(current=>current===key?null:key);
 };
 useEffect(()=>{
  if(!isFullscreen)return;
  const handle=e=>{
   if(e.altKey||e.ctrlKey||e.metaKey||e.isComposing||e.repeat)return;
   const target=e.target,tag=target?.tagName?.toLowerCase();
   if(['input','textarea','select'].includes(tag)||target?.isContentEditable)return;
   if(tag==='button'&&e.key===' ')return;
   const key=e.key.toLowerCase();
   if(key==='escape'&&activeTool){e.preventDefault();setActiveTool(null);return;}
   if(key==='arrowright'&&currentIndex<10){e.preventDefault();act('next');}
   else if(key==='arrowleft'&&currentIndex>0){e.preventDefault();act('previous');}
   else if(key==='v'){e.preventDefault();togglePresenterTool('voice');}
   else if(key==='r'){e.preventDefault();togglePresenterTool('resources');}
   else if(key==='y'){e.preventDefault();togglePresenterTool('video');}
   else if(key==='f'){e.preventDefault();fullscreen();}
   else if(key===' '){e.preventDefault();act(session?.status==='paused'?'resume':'pause');}
  };
  window.addEventListener('keydown',handle);
  return()=>window.removeEventListener('keydown',handle);
 },[isFullscreen,activeTool,busy,currentIndex,session?.version,session?.status]);
 useEffect(()=>{
  if(isFullscreen&&activeTool==='qr'&&!qr)setShowQr(true);
 },[isFullscreen,activeTool,qr]);
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
   <p>{t(language,'Bài học có 11 hoạt động trong 90 phút (45 + 45). Nhấn Bắt đầu để học sinh vào hoạt động đầu tiên ngay; mỗi lần chuyển hoạt động, phần tương tác tiếp theo cũng tự mở.','The lesson has 11 stages over 90 minutes (45 + 45). Starting the lesson immediately opens the first student activity; advancing opens the next activity automatically.')}</p>
   <button type="button" disabled={busy} onClick={()=>act('start')} className="bml-primary"><Play size={19}/>{t(language,'Bắt đầu buổi dạy','Start lesson')}</button>
  </div>:null}
  {session?<div className="bml-live-workspace bml-live-paper-workspace">
   <div className="bml-presenter-surface" ref={stageRef} data-testid="museum-fullscreen-surface">
   <div className={'bml-live-screen bml-live-screen--paper'+(motionOn?' bml-motion-on':'')}
    data-motion={motionOn?'on':'off'} data-testid="museum-live-paper-stage"
    data-stage-index={currentIndex} data-stage-kind={stage?.kind||'unknown'}>
    <div className="bml-live-topbar"><span className="bml-live-brand"><span className="bml-live-dot"/> BRIAN MUSEUM LAB · TEACHER LIVE</span>
     <div className="bml-paper-progress"><span>{t(language,'TIẾT','PERIOD')} {stage?.period}/2</span><span>{t(language,'HOẠT ĐỘNG','ACTIVITY')} {currentIndex+1}/11</span></div>
     {isFullscreen?<button className="bml-presenter-exit" type="button" onClick={fullscreen}><Minimize2 size={18}/>{t(language,'Thoát toàn màn hình','Exit fullscreen')}</button>:null}</div>
    {spotlight?<div className="bml-live-spotlight">
     <div className="bml-live-spotlight-top"><strong>{t(language,'TRÌNH CHIẾU NHÓM','GROUP SPOTLIGHT')} · {spotlight.groupLabel}</strong>
      <button type="button" onClick={()=>setSpotlight(null)}><X size={18}/>{t(language,'Đóng','Close')}</button></div>
     <MuseumScene gallery={spotlight.gallery} language={language} embedded/>
    </div>:<div className="bml-live-slide" key={currentIndex} data-testid="museum-live-slide">
     <div className="bml-paper-stage-intro">
      <MuseumLivePaperArt variant={['artwork','peer','present','exit'].includes(stage?.kind)?'studio':stage?.kind==='quiz'?'gallery':'climate'}/>
      <div className="bml-paper-stage-titles">
       <div className="bml-live-section">{stage?.period===1?'PERIOD 01 · INVESTIGATE & DESIGN':'PERIOD 02 · CREATE, TEST & IMPROVE'}</div>
       <h2>{stage?.title}</h2>{language==='en'?null:<p className="bml-live-vietnamese">{stage?.vi}</p>}
      </div>
     </div>
     <div className="bml-paper-question-sheet"><div className="bml-live-question">{stage?.question}</div></div>
     {stage?.kind==='vote'?<div className="bml-live-choices">
       {stage.options.map((opt,i)=><div key={opt}><b>{String.fromCharCode(65+i)}</b>{opt}
        {result&&session.revealed?<span>{result.options?.[i]?.count||0} / {result.n||0}</span>:null}</div>)}
      </div>:null}
     {stage?.kind==='quiz'?<div className="bml-live-quiz">
       {stage.questions?.map((q,i)=><div key={i}><strong>Q{i+1}. {q.q}</strong>
        <p>{q.choices.join('   ·   ')}</p>
        {session.revealed?<small>{t(language,'Đáp án','Answer')}: {String.fromCharCode(65+q.answer)} · {q.explanation}</small>:null}</div>)}</div>:null}
     {stage&&!['vote','quiz'].includes(stage.kind)?<MuseumLivePaperCards stage={stage}/>:null}
     <div className="bml-live-sentence"><span>{stage?.sentence}</span></div>
     {stage?.kind==='vote'&&session.revealed&&result?<div className="bml-live-chart">
       <strong>{t(language,'KẾT QUẢ THỰC TẾ','LIVE RESULTS')} · N = {result.n} {t(language,'thiết bị nhóm','group devices')}</strong>
       {result.options?.map((o,i)=><div key={i}><span>{o.label}</span>
        <div className="bml-live-bar"><i style={{width:o.percent+'%'}}/></div><strong>{o.count} · {o.percent}%</strong></div>)}</div>:null}
     {stage?.kind==='quiz'&&session.revealed&&result?<div className="bml-live-chart">
      <strong>{t(language,'KIỂM TRA HIỂU BÀI','CHECK FOR UNDERSTANDING')} · N = {result.n} {t(language,'nhóm','groups')}</strong>
      {result.questions?.map((q,i)=><p key={i}>Q{i+1}: {q.correct}/{result.n} {t(language,'nhóm chọn đúng','groups correct')} ({q.percent}%)</p>)}</div>:null}
     {session.revealed?<div className="bml-live-explanation"><CheckCircle2 size={20}/>{stage?.expected}</div>:null}
    </div>}
    {stageVideo?<div className="bml-presenter-video-modal" role="dialog" aria-label="YouTube projector" aria-modal="false"
     data-testid="museum-projector-video" onMouseDown={e=>{if(e.target===e.currentTarget)setStageVideo(null);}}>
     <div className="bml-live-video-stage"><MuseumVideoFrame id={stageVideo.id} title={stageVideo.title}
      language={language} onClose={()=>setStageVideo(null)}/></div>
    </div>:null}
    <div className="bml-live-bottom">
     <span className="bml-paper-clock"><Clock3 size={23}/>{String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}</span>
     <span className={'bml-paper-status '+(session.stageOpen?'is-open':'is-closed')}><span className="bml-paper-status-dot"/>{session.stageOpen?t(language,'ĐANG MỞ HOẠT ĐỘNG','TASK OPEN'):t(language,'HOẠT ĐỘNG CHƯA MỞ','TASK CLOSED')}</span>
     <span className="bml-paper-responses"><Users size={20}/>{result?.n??0} {t(language,'nhóm trả lời','group responses')}</span>
    </div>
   </div>
   <MuseumFullscreenDock language={language} session={session} currentIndex={currentIndex}
    busy={busy} activeTool={activeTool} motionOn={motionOn} focusMode={presenterFocus} needHelp={state?.needHelp||0}
    onAction={act} onTool={togglePresenterTool} onMotion={()=>setMotionOn(v=>!v)}
    onFocus={()=>setPresenterFocus(v=>!v)} onExit={fullscreen} onRefresh={refresh}/>
   {isFullscreen&&activeTool?<div className={'bml-presenter-panel-layer'+(activeTool==='qr'?' is-qr':'')} data-testid="museum-fullscreen-panel-layer" onMouseDown={e=>{if(e.target===e.currentTarget)setActiveTool(null);}}>
    <aside role="dialog" aria-label={t(language,'Công cụ trình chiếu','Presenter tools')} aria-modal="false"
     className={'bml-presenter-panel'+(activeTool==='qr'?' is-modal':'')} data-testid="museum-fullscreen-panel" data-active-tool={activeTool}>
     <header className="bml-presenter-panel-header"><div><small>BRIAN TEACHER LIVE</small>
      <h2>{({
       voice:'English Voiceover',video:'Video Research Studio',resources:t(language,'Kho tư liệu','Research library'),
       notes:t(language,'Ghi chú giảng dạy','Teaching notes'),qr:'Creator Pass · QR',
       groups:t(language,'Nhóm học tập','Class groups'),explain:t(language,'Giải thích hoạt động','Explanation'),
       survey:t(language,'Khảo sát và minh chứng','Survey and evidence'),tools:t(language,'Bộ công cụ giảng dạy','Teaching tools')
      })[activeTool]}</h2></div>
      <button type="button" className="bml-presenter-close" aria-label="Close presenter panel" onClick={()=>setActiveTool(null)}><X size={22}/></button>
     </header>
     <div className="bml-presenter-panel-scroll">
      {activeTool==='voice'?<MuseumVoiceover stage={stage} language={language} shareWithStudents={session.media?.voiceEnabled===true} onShareToggle={shareNarration}/>:null}
      {activeTool==='resources'?<><MuseumResourceHub stage={stage} language={language}/><LessonResources stageIndex={currentIndex} language={language} teacher/></>:null}
      {activeTool==='video'?<MuseumVideoLab mode="teacher" stage={stage} stageIndex={currentIndex}
       media={session.media} assignmentId={assignmentId} transport={transport} version={session.version}
       language={language} onProject={video=>{setStageVideo(video);setActiveTool(null);}}
       onSaved={async out=>{if(out.session)setState(prev=>({...prev,session:out.session}));await refresh();}}/>:null}
      {activeTool==='notes'?<section className="bml-presenter-note"><h3>{stage?.title}</h3>
       <p>{stage?.teaching}</p><strong>{t(language,'Kết quả mong đợi','Expected learning')}</strong><p>{stage?.expected}</p></section>:null}
      {activeTool==='explain'?<section className="bml-presenter-note"><h3>{stage?.title}</h3><p>{stage?.expected}</p>
       <button type="button" className="bml-primary" onClick={()=>act('reveal')} disabled={busy||session.revealed}>
        <Eye size={17}/>{session.revealed?t(language,'Đã hiển thị giải thích','Explanation revealed'):t(language,'Hiện giải thích cho lớp','Reveal to class')}</button></section>:null}
      {activeTool==='qr'?<section className="bml-presenter-note bml-presenter-qr">
       <strong>{t(language,'Học sinh mở Student Creator','Students enter Creator Studio')}</strong>
       {qr?<img src={qr} width="200" height="200" alt="Student Creator QR"/>:null}
       <p>{link}</p><small>{t(language,'QR chỉ mở trang vào lớp. Mã nhóm được phát riêng.','The QR only opens the entry page. Group passcodes are distributed separately.')}</small></section>:null}
      {activeTool==='groups'?<div className="bml-presenter-group-grid">{groups.map(g=><button key={g.id}
       type="button" disabled={busy} onClick={async()=>{await spotlightGroup(g.id);setActiveTool(null);}}>
        <Users size={17}/><span>{g.label}<small>{g.state}</small></span><Presentation size={17}/></button>)}</div>:null}
      {activeTool==='survey'?<section className="bml-presenter-note">
       {currentIndex!==2?<p>{t(language,'Khảo sát trực tiếp thực hiện tại hoạt động 3/11.','The live class survey is at activity 3/11.')}</p>:
       state?.survey?<><strong>{t(language,'ĐÃ CHỐT KHẢO SÁT','SURVEY FROZEN')} · N={state.survey.n}</strong>
        <p>{t(language,'N là số nhóm, không phải số học sinh.','N counts groups, not students.')}</p>
        <button type="button" className="bml-outline" onClick={()=>{const a=document.createElement('a');a.href=surveyChartPng(state.survey);a.download='Class-group-priority-survey.png';a.click();}}>
         {t(language,'Tải biểu đồ PNG','Download chart')}</button></>:
       <><label><input type="checkbox" checked={paper} onChange={e=>setPaper(e.target.checked)}/>
        {t(language,'Nhập kiểm phiếu giấy khi không có phiếu online','Enter paper tally if no online votes')}</label>
        {paper?<><div className="bml-field-grid">{stage.options.map((option,i)=><label key={option}>{option}<input type="number"
         min="0" max="1000" value={tally[i]} onChange={e=>setTally(v=>v.map((x,j)=>i===j?e.target.value:x))}/></label>)}</div>
         <label>{t(language,'Ghi chú nguồn','Source note')}<input value={tallyNote} maxLength={500} onChange={e=>setTallyNote(e.target.value)}/></label></>:null}
        <button className="bml-primary" type="button" disabled={busy} onClick={freeze}>{t(language,'Chốt số liệu khảo sát','Freeze survey')}</button>
        <p>{t(language,'Số liệu đã chốt không sửa; không suy ra thói quen cá nhân.','Frozen figures cannot be edited; no individual habits are inferred.')}</p></>}
       {currentIndex>=7&&state?.feedback?.length?<p>{state.feedback.length} {t(language,'phản hồi chéo đã lưu','saved peer responses')}</p>:null}
      </section>:null}
      {activeTool==='tools'?<div className="bml-presenter-all-tools">
       {[
        ['voice','Voiceover'],['video','Video Lab'],['resources',t(language,'Kho tư liệu','Research library')],
        ['notes',t(language,'Ghi chú','Notes')],['qr','QR'],['groups',t(language,'Nhóm học tập','Groups')],
        ['explain',t(language,'Hiện giải thích','Explanation')],['survey',t(language,'Khảo sát / minh chứng','Survey / evidence')]
       ].map(([key,label])=><button type="button" className="bml-outline" key={key} onClick={()=>togglePresenterTool(key)}>
        <ChevronRight size={16}/>{label}</button>)}
       <button type="button" className="bml-outline" onClick={()=>setMotionOn(v=>!v)}><Sparkles size={16}/>{motionOn?'Motion OFF':'Motion ON'}</button>
       <button type="button" className="bml-outline" disabled={busy} onClick={()=>act(session.status==='paused'?'resume':'pause')}>
        {session.status==='paused'?t(language,'Tiếp tục','Resume'):t(language,'Tạm dừng','Pause')}</button>
       <button type="button" className="bml-outline" onClick={refresh}><RefreshCcw size={16}/>{t(language,'Cập nhật','Refresh')}</button>
       <button type="button" className="bml-outline" disabled={busy||session.status==='ended'} onClick={()=>act('end')}>
        <Check size={16}/>{t(language,'Kết thúc bài dạy','End lesson')}</button>
      </div>:null}
     </div>
    </aside>
   </div>:null}
   </div>
   <div className="bml-live-controls bml-live-controls--paper bml-surface">
    <div className="bml-live-control-line">
     <button className="bml-outline" disabled={busy||currentIndex===0} onClick={()=>act('previous')}><ChevronLeft size={17}/>{t(language,'Trước','Back')}</button>
     <button className="bml-primary" disabled={busy||session.status==='ended'||currentIndex===10} onClick={()=>act('next')}>{t(language,'Hoạt động tiếp','Next activity')}<ChevronRight size={17}/></button>
     <button className="bml-outline" disabled={busy||session.status==='ended'} onClick={()=>act(session.stageOpen?'close':'open')}>
      {session.stageOpen?<Lock size={18}/>:<Play size={18}/>}
      {session.stageOpen?t(language,'Khóa hoạt động','Close task'):t(language,'Mở lại tương tác','Reopen interaction')}</button>
     <button className="bml-outline" disabled={busy||session.revealed} onClick={()=>act('reveal')}><Eye size={17}/>{t(language,'Hiện giải thích','Reveal explanation')}</button>
     <button className="bml-outline" onClick={()=>setShowQr(v=>!v)}><QrCode size={18}/> QR</button>
     <button className="bml-outline" onClick={fullscreen}><Fullscreen size={18}/>{t(language,'Toàn màn hình','Fullscreen')}</button>
    </div>
    <div className="bml-live-control-line">
     <button className="bml-text-btn" aria-expanded={showNotes} onClick={()=>setShowNotes(v=>!v)}><BookOpen size={17}/>{t(language,'Ghi chú giảng dạy','Teaching notes')}</button>
     <button className="bml-text-btn" aria-expanded={showResources} onClick={()=>setShowResources(v=>!v)}><BookOpen size={17}/>{t(language,'Kho tư liệu','Research library')}</button>
     <button className="bml-text-btn" aria-expanded={showVoiceover} onClick={()=>setShowVoiceover(v=>!v)}><Volume2 size={17}/>Voiceover</button>
     <button className="bml-text-btn" aria-expanded={showVideoLab} onClick={()=>setShowVideoLab(v=>!v)}><Film size={17}/>Video Lab</button>
     <button className="bml-text-btn bml-live-motion-toggle" aria-pressed={motionOn} onClick={()=>setMotionOn(v=>!v)}><Sparkles size={17}/>{motionOn?'Motion ON':'Motion OFF'}</button>
     {session.status==='paused'?<button className="bml-text-btn" onClick={()=>act('resume')}><Play size={17}/>{t(language,'Tiếp tục','Resume')}</button>:
     <button className="bml-text-btn" onClick={()=>act('pause')} disabled={session.status==='ended'}><Pause size={17}/>{t(language,'Tạm dừng','Pause')}</button>}
     <button className="bml-text-btn" onClick={refresh}><RefreshCcw size={17}/>{t(language,'Cập nhật','Refresh')}</button>
     <button className="bml-text-btn" disabled={session.status==='ended'} onClick={()=>act('end')}><Check size={17}/>{t(language,'Kết thúc bài dạy','End lesson')}</button>
     <span className="bml-live-help">{state?.needHelp||0} {t(language,'nhóm cần trợ giúp','groups requesting help')}</span>
    </div>
    {currentIndex===2&&session.evidenceVersion!==0?<div className="bml-evidence-controls">
     {state?.survey?<><strong>Đã chốt · N={state.survey.n} lượt nhóm · {state.survey.source}</strong><button className="bml-outline" onClick={()=>{const a=document.createElement('a');a.href=surveyChartPng(state.survey);a.download='Class-group-priority-survey.png';a.click();}}>{t(language,'Tải biểu đồ PNG','Download chart PNG')}</button></>:<>
     <label><input type="checkbox" checked={paper} onChange={e=>setPaper(e.target.checked)}/> {t(language,'Nhập kiểm phiếu giấy (chỉ khi chưa có phiếu trực tuyến)','Enter paper tally (only with no online votes)')}</label>
     {paper?<><div className="bml-field-grid">{stage.options.map((label,i)=><label key={label}>{label}<input type="number" min="0" max="1000" value={tally[i]} onChange={e=>setTally(v=>v.map((x,j)=>i===j?e.target.value:x))}/></label>)}</div><label>{t(language,'Nguồn phiếu giấy','Paper ballot source')}<input value={tallyNote} maxLength={500} onChange={e=>setTallyNote(e.target.value)}/></label></>:null}
     <button className="bml-primary" disabled={busy} onClick={freeze}>{t(language,'Chốt số liệu khảo sát / Freeze survey','Freeze survey')}</button><p>{t(language,'Số liệu đã chốt không sửa. N là số nhóm; không suy ra thói quen cá nhân.','Frozen counts cannot change. N counts groups, not individual habits.')}</p></>}
    </div>:null}
    {currentIndex>=7&&state?.feedback?.length?<details open><summary>{t(language,'Phản hồi chéo đã lưu','Saved peer feedback')} · {state.feedback.length}</summary>{state.feedback.map(r=><article key={r.from_group}><strong>{groups.find(g=>g.id===r.from_group)?.label} → {groups.find(g=>g.id===r.to_group)?.label} · {r.rating}/4</strong><p>{r.learned}</p><p>{r.clarify}</p></article>)}</details>:null}
    {currentIndex===10?<div>{state?.responses?.map(r=><p key={r.group_id}><strong>{groups.find(g=>g.id===r.group_id)?.label}: </strong>{String(r.value)}</p>)}</div>:null}
    {MICRO_CHALLENGES[currentIndex]?<div className="bml-live-micro-summary"><ShieldCheck size={17}/>
     {state?.microResponses||0} {t(language,'nhóm đã nộp câu hỏi tư duy nhanh. Câu trả lời được lưu làm minh chứng quá trình.','groups submitted a thinking challenge. Responses are saved as learning-process evidence.')}</div>:null}
    {!isFullscreen&&showResources?<div className="bml-paper-resource-drawer" data-testid="museum-live-resources">
     <MuseumResourceHub stage={stage} language={language}/>
     <LessonResources stageIndex={currentIndex} language={language} teacher/>
    </div>:null}
    {!isFullscreen&&showVoiceover?<div className="bml-comp-panel"><MuseumVoiceover stage={stage} language={language} shareWithStudents={session.media?.voiceEnabled===true} onShareToggle={shareNarration}/></div>:null}
    {!isFullscreen&&showVideoLab?<div className="bml-comp-panel"><MuseumVideoLab mode="teacher" stage={stage}
      stageIndex={currentIndex} media={session.media} assignmentId={assignmentId} transport={transport}
      version={session.version} language={language} onProject={setStageVideo}
      onSaved={async out=>{if(out.session)setState(prev=>({...prev,session:out.session}));await refresh();}}/></div>:null}
    {!isFullscreen&&showNotes?<div className="bml-live-notes"><h3>{t(language,'GHI CHÚ RIÊNG CỦA GIÁO VIÊN','TEACHER-ONLY NOTES')}</h3>
     <p>{stage?.teaching}</p><strong>{t(language,'Kết luận/điều cần lưu ý','Expected learning')}:</strong><p>{stage?.expected}</p></div>:null}
    {!isFullscreen&&showQr?<div className="bml-live-qr"><div><strong>{t(language,'Học sinh truy cập Student Creator','Students open the Creator Studio')}</strong>
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
