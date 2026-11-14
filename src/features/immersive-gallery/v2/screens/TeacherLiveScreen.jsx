import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,Play,MonitorPlay,BookOpen,Printer,X} from 'lucide-react';
import {LIVE_STAGES} from '../../v3/liveLesson.js';
import {liveStaff} from '../../v3/museumLiveApi.js';
import {englishSystemGroupLabel} from '../../v3/museumApi.js';
import {MUSEUM_CURRICULUM_VIDEOS} from '../../v3/museumLiveExtensions.js';
import MuseumVoiceover from '../../v3/MuseumVoiceover.jsx';
import MuseumVideoLab from '../../v3/MuseumVideoLab.jsx';
import MuseumResourceHub from '../../v3/MuseumResourceHub.jsx';
import LessonResources from '../../v3/LessonResources.jsx';
import MuseumCurriculumStageVideo from '../../v3/MuseumCurriculumStageVideo.jsx';
import {loadPresenterRecovery,savePresenterRecovery,shouldRestorePanel} from '../../v3/museumPresenterRecovery.js';
import TeacherLiveStage from '../controls/TeacherLiveStage.jsx';
import TeacherToolbar from '../controls/TeacherToolbar.jsx';
import CommandCenter from '../controls/CommandCenter.jsx';
import EditorialHeading from '../shell/EditorialHeading.jsx';
import '../../v3/museumLive.css';
import '../../v3/museumLivePaper.css';
import '../../v3/museumLiveCompetition.css';
import '../../v3/museumLivePresenter.css';
import '../../v3/museumStageMotionV54.css';
import '../../v3/museumCurriculumVideo.css';
import '../../v3/museumBeforeAfter.css';
import '../advanced.css';
const t=(lang,vi,en)=>lang==='en'?en:vi;
const link=typeof window!=='undefined'?window.location.origin+window.location.pathname+'#/gallery-create':'/#/gallery-create';
/**
 * 05 Teacher Live — Swiss Editorial V2.
 * State machine, mutation handlers, transport, fullscreen, keyboard shortcuts,
 * presenter recovery, voiceover share, spotlight and compare are preserved from v3
 * MuseumLiveTeacher (same modules: liveStaff, LIVE_STAGES, MUSEUM_CURRICULUM_VIDEOS,
 * museumPresenterRecovery). Presentation is the new editorial stage/toolbar/command-center.
 * Completed/frozen lessons are read-only with the reason surfaced; mutating controls are
 * disabled AND the reason banner is shown (disabled buttons alone are insufficient).
 */
export default function TeacherLiveScreen({language='vi',data,initialReview,onBack,onRefresh,transport=liveStaff}){
  const assignments=useMemo(()=>(data?.assignments||[]).filter(a=>a.created_by===data?.profile?.id||data?.profile?.role==='admin'),[data]);
  const assignmentIds=useMemo(()=>assignments.map(a=>a.id),[assignments]);
  const savedPreference=useRef(loadPresenterRecovery(typeof window!=='undefined'?window.sessionStorage:null,assignmentIds));
  const [assignmentId,setAssignmentId]=useState(initialReview||savedPreference.current?.assignmentId||assignments[0]?.id||'');
  const assignment=assignments.find(a=>a.id===assignmentId);
  const readOnly=Boolean(assignment?.content_frozen_at);
  const [browseIndex,setBrowseIndex]=useState(0);
  const [previewReveal,setPreviewReveal]=useState(false);
  const requestSequence=useRef(0);
  const frozenReason=assignment?.content_frozen_at
    ?t(language,'Bài học đã chốt vào ','Lesson frozen at ')+new Date(assignment.content_frozen_at).toLocaleString()+t(language,' · Chỉ xem lại',' · View-only playback')
    :'';
  const [state,setState]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [activeTool,setActiveTool]=useState(null),[qr,setQr]=useState('');
  const [motionOn,setMotionOn]=useState(savedPreference.current?.motionOn!==false);
  const [curriculumMode,setCurriculumMode]=useState('video');
  const [isFullscreen,setIsFullscreen]=useState(false);
  const [spotlight,setSpotlight]=useState(null),[time,setTime]=useState(Date.now());
  const [paper,setPaper]=useState(false),[tally,setTally]=useState(['','','','']),[tallyNote,setTallyNote]=useState('');
  const stageRef=useRef(null),activeRef=useRef(true);
  const refresh=useCallback(async()=>{
    if(!assignmentId)return;
    const sequence=++requestSequence.current;
    try{
      const response=await transport('state',null,{assignmentId,...(readOnly?{viewStage:String(browseIndex)}:{})});
      if(activeRef.current&&sequence===requestSequence.current){setState(response);setError('');}
    }catch(e){if(activeRef.current&&sequence===requestSequence.current)setError(e.message);}
  },[assignmentId,transport,readOnly,browseIndex]);
  useEffect(()=>{activeRef.current=true;refresh();const id=window.setInterval(()=>{refresh();setTime(Date.now());},readOnly?15000:3000);return()=>{activeRef.current=false;window.clearInterval(id);};},[refresh]);
  useEffect(()=>{
    const sync=()=>{const active=document.fullscreenElement===stageRef.current;setIsFullscreen(active);if(!active)setActiveTool(null);};
    document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync);
  },[]);
  useEffect(()=>{if(activeTool!=='qr')return;let active=true;import('qrcode').then(({default:QR})=>QR.toDataURL(link,{width:220,margin:2})).then(url=>{if(active)setQr(url);}).catch(()=>{});return()=>{active=false;};},[activeTool]);
  const session=state?.session?(readOnly?{...state.session,revealed:previewReveal}:state.session):null;
  const stage=session?.stage,groups=(state?.groups||[]).map(g=>({...g,label:language==='en'?englishSystemGroupLabel(g.label):g.label}));
  const currentIndex=session?.stageIndex??0,minute=LIVE_STAGES[currentIndex]?.minutes||0;
  const curriculumVideo=MUSEUM_CURRICULUM_VIDEOS[currentIndex]||null;
  const showingCurriculumVideo=Boolean(curriculumVideo&&curriculumMode==='video');
  const showingVideoCheck=currentIndex===3&&curriculumMode==='check';
  const inVideoTaskMode=currentIndex===3&&curriculumMode==='task';
  const legacyActivityTwo=currentIndex===1&&session?.questionVersion!==2;
  const restoreKey=String(session?.id||'')+'/'+String(session?.stageIndex??'-');
  const hydratedKey=useRef('');
  useEffect(()=>{
    if(!session?.id)return;if(hydratedKey.current===restoreKey)return;
    const saved=loadPresenterRecovery(window.sessionStorage,assignmentIds);
    const same=shouldRestorePanel(saved,session)&&saved?.assignmentId===assignmentId;
    hydratedKey.current=restoreKey;
  },[session?.id,session?.stageIndex,assignmentId,assignmentIds,session]);
  useEffect(()=>{
    if(!session?.id||hydratedKey.current!==restoreKey)return;
    savePresenterRecovery(window.sessionStorage,{assignmentId,sessionId:session.id,stageIndex:currentIndex,motionOn,panel:isFullscreen?activeTool:null,showVoiceover:false,showVideoLab:false},assignmentIds);
  },[session?.id,session?.stageIndex,assignmentId,motionOn,isFullscreen,activeTool,assignmentIds,currentIndex]);
  useEffect(()=>{setCurriculumMode('video');},[assignmentId,currentIndex]);
  const elapsed=(session?.elapsedSeconds||0)+(session?.status==='active'&&session?.stageStartedAt?Math.max(0,Math.floor((time-Date.parse(session.stageStartedAt))/1000)):0);
  const remaining=Math.max(0,minute*60-elapsed);
  const act=useCallback(async(action)=>{
    if(!assignmentId||busy)return;
    if(readOnly){
      if(action==='next'||action==='previous'){
        setBrowseIndex(i=>Math.max(0,Math.min(LIVE_STAGES.length-1,i+(action==='next'?1:-1))));
        setPreviewReveal(false);setSpotlight(null);
      }else if(action==='reveal')setPreviewReveal(v=>!v);
      return;
    }
    if(action==='end'&&!window.confirm(t(language,'Kết thúc tiết học? Học sinh sẽ không thể tiếp tục thao tác trong phiên này.','End this lesson? Student tasks will be locked.')))return;
    setBusy(true);setError('');
    try{const payload=action==='start'?{assignmentId}:{assignmentId,action,version:session?.version};
      const out=await transport(action==='start'?'start':'control',payload);
      if(out.session)setState(prev=>({...prev,session:out.session}));
      await refresh();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  },[assignmentId,busy,readOnly,session?.version,transport,refresh,language]);
  const freeze=async()=>{if(readOnly)return;setBusy(true);setError('');try{await transport('freeze-survey',{assignmentId,version:session.version,...(paper?{counts:tally.map(v=>v===''?null:Number(v)),note:tallyNote}:{})});await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}};
  const shareNarration=async()=>{
    if(readOnly||busy||!session||session.status==='ended')return;
    setBusy(true);setError('');
    try{
      const send=version=>transport('media-voice',{assignmentId,stageIndex:currentIndex,version,enabled:!session.media?.voiceEnabled});
      let out;
      try{out=await send(session.version);}
      catch(e){if(e.status!==409)throw e;const latest=await transport('state',null,{assignmentId});if(latest.session?.stageIndex!==currentIndex)throw new Error(t(language,'Hoạt động đã đổi. Hãy mở lại công cụ giọng đọc.','The activity changed. Reopen the narration tool.'));out=await send(latest.session.version);}
      if(out.session)setState(prev=>({...prev,session:out.session}));
      await refresh();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const spotlightGroup=async groupId=>{
    setBusy(true);setError('');
    try{const r=await transport('group-gallery',null,{assignmentId,groupId});
      if(!r?.draft?.rooms?.length)throw new Error(t(language,'Nhóm chưa có bản triển lãm.','This group has not created a museum draft yet.'));
      const urls=new Map((r.artworks||[]).map(a=>[a.id,a.image_url]));
      const gallery={...r.draft,rooms:r.draft.rooms.map((room,i)=>({...room,id:'class-room-'+i,exhibits:room.exhibits.map((e,j)=>({...e,id:'class-exhibit-'+i+'-'+j,image_url:urls.get(e.asset_id)||'',status:'published'}))}))};
      setSpotlight({gallery,groupLabel:language==='en'?englishSystemGroupLabel(r.groupLabel):r.groupLabel});
    }catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const compareGroup=async groupId=>transport('checkpoint-compare',null,{assignmentId,groupId});
  const fullscreen=async()=>{
    try{
      if(document.fullscreenElement===stageRef.current)await document.exitFullscreen?.();
      else if(document.fullscreenElement)await document.exitFullscreen?.();
      else if(stageRef.current?.requestFullscreen)await stageRef.current.requestFullscreen();
      else setError(t(language,'Trình duyệt không hỗ trợ chế độ toàn màn hình.','Fullscreen mode is unavailable in this browser.'));
    }catch(e){setError(t(language,'Không thể mở toàn màn hình. Hãy cho phép chế độ toàn màn hình trên trình duyệt.','Fullscreen was blocked. Please enable it in your browser.'));}
  };
  const toggleTool=key=>{setActiveTool(cur=>cur===key?null:key);};
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
      else if(key==='v'){e.preventDefault();toggleTool('voice');}
      else if(key==='r'){e.preventDefault();toggleTool('resources');}
      else if(key==='y'){e.preventDefault();toggleTool('video');}
      else if(key==='f'){e.preventDefault();fullscreen();}
      else if(key===' '&&!readOnly){e.preventDefault();act(session?.status==='paused'?'resume':'pause');}
    };
    window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle);
  },[isFullscreen,activeTool,busy,currentIndex,session?.version,session?.status,act,readOnly]);
  const respondedCount=Array.isArray(state?.responses)?state.responses.length:null;
  const curriculumNode=curriculumVideo?(
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      <strong style={{fontSize:'clamp(9px,1.4cqi,11px)',letterSpacing:'.1em',color:'#9fc2e0'}}>NASA VIDEO · ACTIVITY {currentIndex+1}</strong>
      <div role="group" aria-label={t(language,'Góc nhìn dạy học của hoạt động','Activity teaching view')} style={{display:'flex',flexWrap:'wrap',gap:6}}>
        <button type="button" className="adv-toolbtn" style={{fontSize:'clamp(9px,1.3cqi,11px)',padding:'4px 8px'}} aria-pressed={showingCurriculumVideo} onClick={()=>setCurriculumMode('video')}>▶ {t(language,'Xem clip NASA','Watch NASA clip')}</button>
        {currentIndex===3?<button type="button" className="adv-toolbtn" style={{fontSize:'clamp(9px,1.3cqi,11px)',padding:'4px 8px'}} aria-pressed={showingVideoCheck} onClick={()=>setCurriculumMode('check')}><BookOpen size={12}/> 3 {t(language,'câu hỏi video','video questions')}</button>:null}
        <button type="button" className="adv-toolbtn" style={{fontSize:'clamp(9px,1.3cqi,11px)',padding:'4px 8px'}} aria-pressed={currentIndex===3?inVideoTaskMode:!showingCurriculumVideo} onClick={()=>setCurriculumMode('task')}><BookOpen size={12}/>{currentIndex===1?(legacyActivityTwo?t(language,'3 câu hỏi ngữ pháp','3 language questions'):t(language,'3 câu hỏi video','3 video questions')):t(language,'Nhiệm vụ thiết kế','Design tasks')}</button>
      </div>
      {showingCurriculumVideo?<div style={{flex:'1 1 auto',minHeight:0,display:'flex',alignItems:'center',justifyContent:'center'}}><MuseumCurriculumStageVideo video={curriculumVideo} stageIndex={currentIndex} language={language} onContinue={()=>setCurriculumMode('task')}/></div>:null}
    </div>
  ):null;
  const exitResponses=(stage?.kind==='exit'||session?.status==='ended')&&Array.isArray(state?.responses)
    ?state.responses.filter(r=>r.stage_index===currentIndex||stage?.kind==='exit').slice(0,30):[];
  const toolbar=session?<TeacherToolbar language={language} readOnly={readOnly} busy={busy} session={session} currentIndex={currentIndex}
    motionOn={motionOn} activeTool={activeTool}
    onBack={onBack} onPrevious={()=>act('previous')} onNext={()=>act('next')} onToggleTask={()=>act(session.stageOpen?'close':'open')}
    onReveal={()=>act('reveal')} onToggleTool={toggleTool} onFullscreen={fullscreen}
    onToggleMotion={()=>setMotionOn(v=>!v)} onTogglePause={()=>act(session.status==='paused'?'resume':'pause')}
    onRefresh={()=>{refresh();onRefresh&&onRefresh();}}/>:null;
  // Fullscreen is rendered inside the fullscreen element; every viewer tool
  // remains usable without opening an API write path for completed lessons.
  const fullscreenPanel=isFullscreen&&activeTool?(
   <div className="adv-fullscreen-viewer-tool">
    <button type="button" className="adv-toolbtn" onClick={()=>setActiveTool(null)} aria-label="Close presenter tool">
     <X size={14}/> Close
    </button>
    {activeTool==='voice'?<MuseumVoiceover stage={stage} language={language} compact
      shareWithStudents={Boolean(session?.media?.voiceEnabled)}
      onShareToggle={readOnly?null:shareNarration}/>:null}
    {activeTool==='video'?<MuseumVideoLab mode="teacher" readOnly={readOnly} stage={stage}
      stageIndex={currentIndex} media={session?.media} assignmentId={assignmentId} version={session?.version}
      language={language} transport={transport}/>:null}
    {activeTool==='notes'?<LessonResources stageIndex={currentIndex} teacher language={language}/>:null}
    {activeTool==='resources'?<MuseumResourceHub stage={stage} language={language}/>:null}
    {activeTool==='qr'?<div><h3>Student Creator QR</h3>
      {qr?<img src={qr} width="160" height="160" alt="Student Creator QR"/>:null}
      <p>{link}</p></div>:null}
   </div>
  ):null;
  return (
    <div className="igv2 igv2-screen" data-testid="igv2-teacher-live-screen">
      <EditorialHeading
        kicker={t(language,'DẠY HỌC TRỰC TIẾP','LIVE CLASSROOM')}
        title={t(language,'Giảng dạy trực tiếp.','Teacher Live.')}
        description={t(language,'Điều khiển toàn bộ 11 hoạt động trong 2 tiết. Học sinh tham gia bằng mã nhóm.','Control all 11 activities across two lessons. Students join using group passes.')}
        aside={readOnly?t(language,'Bài học đã kết thúc · Chỉ xem lại','Completed lesson · View-only playback'):t(language,'Đang trực tiếp · Học sinh bằng mã nhóm','Live · students join by group pass')}/>
      <label className="adv-dossier-field" style={{marginBottom:12}}>{t(language,'Chọn lớp và bài học','Choose lesson / class')}
        <select className="adv-assignment-select" value={assignmentId} onChange={e=>{setAssignmentId(e.target.value);setBrowseIndex(0);setPreviewReveal(false);setState(null);setSpotlight(null);}} aria-label={t(language,'Chọn bài học','Select lesson')}>
          {!assignments.length?<option value="">{t(language,'Chưa có bài học được giao','No lesson assigned')}</option>:null}
          {assignments.map(a=><option value={a.id} key={a.id}>{a.title} · {a.class_scope||''}</option>)}
        </select></label>
      {readOnly?<div className="adv-banner adv-banner--success" role="status">🔒 {frozenReason||t(language,'Bài học đã kết thúc · Chỉ xem.','Completed lesson · View only.')} {t(language,'Xem lại, nội dung bài học, mã QR và minh chứng vẫn có sẵn; điều khiển trực tiếp không thể thay đổi dữ liệu đã lưu.','Playback, lesson content, QR codes and evidence remain available; live controls cannot change saved data.')}</div>:null}
      {error?<div className="adv-banner adv-banner--danger" role="alert">{error}</div>:null}
      {!assignments.length?<div className="panel" style={{padding:24,textAlign:'center'}}><BookOpen size={26}/><p>{t(language,'Hãy tạo bài học và mã nhóm trước khi mở Teacher Live.','Create a lesson and group passes first.')}</p></div>:null}
      {assignmentId&&!session&&assignments.length?(
        <div className="panel" style={{padding:24,textAlign:'center'}}>
          <MonitorPlay size={42}/>
          <h2 style={{margin:'10px 0 6px'}}>{t(language,'Bắt đầu dạy trực tiếp','Start live teaching')}</h2>
          <p style={{fontSize:13,color:'var(--igv2-muted,#6b7782)',maxWidth:640,margin:'0 auto 14px'}}>{t(language,'Bài học có 11 hoạt động trong 90 phút (45 + 45). Nhấn Bắt đầu để học sinh vào hoạt động đầu tiên ngay; mỗi lần chuyển hoạt động, phần tương tác tiếp theo cũng tự mở.','The lesson has 11 stages over 90 minutes (45 + 45). Starting the lesson immediately opens the first student activity; advancing opens the next activity automatically.')}</p>
          <button type="button" className="adv-toolbtn adv-toolbtn--primary" disabled={busy||readOnly} onClick={()=>act('start')}><Play size={16}/>{t(language,'Bắt đầu buổi dạy','Start lesson')}</button>
        </div>
      ):null}
      {session?(
        <>
          <TeacherLiveStage ref={stageRef}
            session={session} stage={stage} currentIndex={currentIndex} language={language}
            readOnly={readOnly} frozenReason={frozenReason}
            spotlight={spotlight} onCloseSpotlight={()=>setSpotlight(null)}
            curriculumNode={curriculumNode}
            revealed={Boolean(session.revealed)}
            elapsed={elapsed} remaining={remaining}
            respondedCount={respondedCount}
            isFullscreen={isFullscreen} onExitFullscreen={fullscreen}
            fullscreenControls={toolbar} fullscreenPanel={fullscreenPanel}/>
          <div className="mt16">
            {!isFullscreen?toolbar:null}
          </div>
          {currentIndex===2&&!state?.survey&&!readOnly?(
            <div className="adv-panel-overlay" role="region" aria-label={t(language,'Chốt khảo sát','Freeze survey')}>
              <button type="button" className="adv-toolbtn" onClick={()=>setPaper(v=>!v)} aria-pressed={paper}>{paper?t(language,'Ẩn kiểm phiếu giấy','Hide paper tally'):t(language,'Nhập kiểm phiếu giấy','Enter paper tally')}</button>
              {paper?(<div style={{marginTop:10,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                {['','','',''].map((_,i)=><input key={i} inputMode="numeric" value={tally[i]} placeholder={t(language,'Số nhóm','Count')} onChange={e=>setTally(v=>v.map((x,j)=>j===i?e.target.value:x))} aria-label={t(language,'Số nhóm lựa chọn ','Groups choosing option ')+(i+1)} style={{padding:'6px 8px',border:'1px solid var(--adv-divider)'}}/>)}
                <input value={tallyNote} placeholder={t(language,'Ghi chú (không bắt buộc)','Note (optional)')} onChange={e=>setTallyNote(e.target.value)} style={{gridColumn:'1 / -1',padding:'6px 8px',border:'1px solid var(--adv-divider)'}}/>
                <button type="button" className="adv-toolbtn adv-toolbtn--primary" style={{gridColumn:'1 / -1'}} disabled={busy} onClick={freeze}>{t(language,'Chốt khảo sát','Freeze survey')}</button>
              </div>):(<button type="button" className="adv-toolbtn adv-toolbtn--primary" style={{marginLeft:8}} disabled={busy} onClick={freeze}>{t(language,'Chốt khảo sát trực tuyến','Freeze online survey')}</button>)}
            </div>
          ):null}
          {!isFullscreen&&activeTool==='qr'?(
            <div className="adv-panel-overlay" role="region" aria-label={t(language,'Mã QR vào lớp','Class join QR')}>
              <button type="button" className="adv-panel-close" onClick={()=>setActiveTool(null)} aria-label={t(language,'Đóng mã QR','Close QR')}><X size={14}/></button>
              <h3 style={{marginTop:0}}>{t(language,'Học sinh quét mã QR để vào','Students scan to join')}</h3>
              {qr?<><img className="adv-qr-img" src={qr} alt={t(language,'Mã QR vào bài học','Lesson join QR code')}/>
                <div style={{marginTop:10,display:'flex',gap:8,flexWrap:'wrap'}}>
                  <button type="button" className="adv-toolbtn" onClick={()=>window.print()}><Printer size={14}/>{t(language,'In mã QR','Print QR')}</button>
                  <button type="button" className="adv-toolbtn" onClick={async()=>{try{await navigator.clipboard.writeText(link);}catch{window.prompt(t(language,'Liên kết vào lớp','Class join link'),link);}}}>{t(language,'Sao chép liên kết','Copy link')}</button>
                </div></>:<p>{t(language,'Đang tạo mã QR…','Generating QR…')}</p>}
            </div>
          ):null}
          {!isFullscreen&&activeTool==='notes'?(
            <div className="adv-panel-overlay" role="region" aria-label={t(language,'Ghi chú dạy','Teaching notes')}>
              <button type="button" className="adv-panel-close" onClick={()=>setActiveTool(null)} aria-label={t(language,'Đóng ghi chú','Close notes')}><X size={14}/></button>
              <LessonResources stageIndex={currentIndex} teacher language={language}/>
            </div>
          ):null}
          {!isFullscreen&&activeTool==='resources'?(
            <div className="adv-panel-overlay" role="region" aria-label={t(language,'Thư viện nghiên cứu','Research library')}>
              <button type="button" className="adv-panel-close" onClick={()=>setActiveTool(null)} aria-label={t(language,'Đóng thư viện','Close library')}><X size={14}/></button>
              <MuseumResourceHub stage={stage} language={language}/>
            </div>
          ):null}
          {!isFullscreen&&activeTool==='voice'?(
            <div className="adv-panel-overlay" role="region" aria-label={t(language,'Giọng đọc','Voiceover')}>
              <button type="button" className="adv-panel-close" onClick={()=>setActiveTool(null)} aria-label={t(language,'Đóng giọng đọc','Close voiceover')}><X size={14}/></button>
              <MuseumVoiceover stage={stage} language={language} compact shareWithStudents={Boolean(session?.media?.voiceEnabled)} onShareToggle={readOnly?null:shareNarration}/>
            </div>
          ):null}
          {!isFullscreen&&activeTool==='video'?(
            <div className="adv-panel-overlay" role="region" aria-label={t(language,'Video Lab','Video Lab')}>
              <button type="button" className="adv-panel-close" onClick={()=>setActiveTool(null)} aria-label={t(language,'Đóng Video Lab','Close Video Lab')}><X size={14}/></button>
              <MuseumVideoLab mode="teacher" readOnly={readOnly} stage={stage} stageIndex={currentIndex} media={session?.media} assignmentId={assignmentId} version={session?.version} language={language} transport={transport}/>
            </div>
          ):null}
          <div className="content-gap" style={{marginTop:20}}/>
          <CommandCenter groups={groups} responses={state?.responses||[]} feedback={state?.feedback||[]}
            microResults={state?.microResults||[]} helpGroups={state?.helpGroups||[]}
            session={session} busy={busy} onRefresh={refresh} onSpotlight={spotlightGroup} onCompare={compareGroup} language={language}/>
          {exitResponses.length?(
            <>
              <div className="content-gap"><div className="section-title"><span>{t(language,'PHẢN HỒI NHÓM ĐÃ LƯU','RECORDED GROUP REFLECTIONS')}</span><span className="right">{t(language,'Minh chứng chỉ đọc','Read-only evidence')}</span></div></div>
              <div className="panel">
                <div className="adv-reflection-list">
                  {exitResponses.map((r,i)=>{
                    const g=groups.find(x=>x.id===r.group_id);
                    return <div className="adv-reflection-row" key={r.id||i}><strong>{englishSystemGroupLabel(g?.label||t(language,'Nhóm','Group'))}</strong><span>{typeof r.value==='string'?r.value:JSON.stringify(r.value)}</span></div>;
                  })}
                </div>
              </div>
            </>
          ):null}
        </>
      ):null}
      {onBack?<button type="button" className="adv-toolbtn" style={{marginTop:16}} onClick={onBack}><ArrowLeft size={14}/>{t(language,'Quay lại','Back')}</button>:null}
    </div>
  );
}
export {TeacherLiveScreen};
